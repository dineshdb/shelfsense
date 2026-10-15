#!/usr/bin/env bash
# One-shot ShelfSense deploy to Firebase: project → anonymous auth → web-app
# config → build → hosting + firestore rules → verify.
# Prerequisite: `npx firebase-tools login` completed once (configstore session).
# Idempotent: re-runs skip finished steps. Override the project with
# SHELFSENCE_PID=<id> ./scripts/deploy-firebase.sh
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
FB=(npx -y firebase-tools)
CURL="curl -sS --fail-with-body"

say() { printf '\n=== %s\n' "$*"; }

# ---- the CLI session's refresh token → fresh access token (for the REST
# provisioning calls the CLI has no non-interactive surface for)
FB_JSON="$HOME/.config/configstore/firebase-tools.json"
[ -f "$FB_JSON" ] || { echo "no firebase-tools session at $FB_JSON — run: npx firebase-tools login"; exit 2; }
CLIENT_ID=$(grep -rhoE '"[0-9]{12}-[a-z0-9]+\.apps\.googleusercontent\.com"' node_modules/firebase-tools/lib 2>/dev/null | head -1 | tr -d '"')
CLIENT_SECRET=$(grep -rhoE 'clientSecret ?= ?"[^"]+"' node_modules/firebase-tools/lib 2>/dev/null | head -1 | sed -E 's/.*"([^"]+)"$/\1/')
REFRESH=$(python3 - "$FB_JSON" <<'EOF'
import json, os, sys
d = json.load(open(sys.argv[1]))
u = d.get("user") or {}
t = u.get("tokens") or u
print(t.get("refresh_token") or t.get("refreshToken") or "")
EOF
)
[ -n "${REFRESH:-}" ] || { echo "no refresh token in session — run: npx firebase-tools login"; exit 2; }
[ -n "${CLIENT_ID:-}" ] && [ -n "${CLIENT_SECRET:-}" ] || { echo "could not scrape firebase-tools OAuth client from node_modules"; exit 2; }

refresh_access() {
  $CURL -X POST https://oauth2.googleapis.com/token \
    -d client_id="$CLIENT_ID" -d client_secret="$CLIENT_SECRET" \
    -d refresh_token="$REFRESH" -d grant_type=refresh_token \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])'
}
ACCESS=$(refresh_access)
authed() { "$CURL" -H "Authorization: Bearer $ACCESS" -H "content-type: application/json" "$@"; }

# ---- 1. project
PID=$(python3 -c "import json;print(json.load(open('.firebaserc'))['projects']['default'])" 2>/dev/null || echo YOUR_PROJECT_ID)
have_pid=false
if [ "$PID" != "YOUR_PROJECT_ID" ]; then
  state=$(authed "https://firebase.googleapis.com/v1beta1/projects/$PID" 2>/dev/null | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("lifecycleState",""))
except Exception: print("")' || true)
  [ "$state" = "ACTIVE" ] && have_pid=true
fi
if [ "$have_pid" = false ]; then
  PID="${SHELFSENCE_PID:-shelfsense-$(openssl rand -hex 3)}"
  say "creating project $PID"
  for _attempt in 1 2 3 4 5; do
    out=$("${FB[@]}" projects:create "$PID" --display-name "ShelfSense AI" 2>&1) && break
    if echo "$out" | grep -qi "already exist\|cannot be used\|taken"; then
      PID="shelfsense-$(openssl rand -hex 4)"
      echo "  id taken, retrying as $PID"
    else
      echo "$out"; exit 1
    fi
  done
  say "waiting for project $PID to be ACTIVE"
  for i in $(seq 1 45); do
    state=$(authed "https://firebase.googleapis.com/v1beta1/projects/$PID" 2>/dev/null | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("lifecycleState",""))
except Exception: print("")' || true)
    [ "$state" = "ACTIVE" ] && break
    [ "$i" = 45 ] && { echo "project never became ACTIVE (last: $state)"; exit 1; }
    sleep 4
  done
fi
say "project: $PID"

# ---- 2. anonymous auth on (Identity Toolkit admin)
say "enabling anonymous sign-in"
authed -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/$PID/config?updateMask=signIn.anonymous.enabled" \
  -d '{"signIn":{"anonymous":{"enabled":true}}}' | python3 -c 'import json,sys; d=json.load(sys.stdin); print("anonymous:", d.get("signIn",{}).get("anonymous",{}).get("enabled"))'

# ---- 3. web app + its SDK config
say "registering web app + minting SDK config"
APPJSON=$(authed -X POST "https://firebase.googleapis.com/v1beta1/projects/$PID/webApps" -d '{"displayName":"ShelfSense AI"}')
CFG=$(echo "$APPJSON" | python3 -c '
import json, sys
d = json.load(sys.stdin)
c = d.get("config") or {}
need = ["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"]
missing = [k for k in need if not c.get(k)]
if missing:
    print("MISSING:" + ",".join(missing)); sys.exit(1)
print(json.dumps(c))')
if echo "$CFG" | grep -q '^MISSING:'; then
  say "config not in create response — reading it back"
  APPID=$(echo "$APPJSON" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("appId",""))')
  CFG=$(authed "https://firebase.googleapis.com/v1beta1/projects/$PID/webApps/$APPID/config" | python3 -c '
import json, sys
c = json.load(sys.stdin)
need = ["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"]
missing = [k for k in need if not c.get(k)]
if missing: sys.exit("missing " + ",".join(missing))
print(json.dumps(c))')
fi
echo "config: $CFG"
python3 - "$CFG" <<'EOF'
import json, re, sys
cfg = sys.argv[1]
p = "src/pages/index.astro"
s = open(p).read()
new = "window.FIREBASE_CONFIG = " + cfg + ";"
s2, n = re.subn(r"window\.FIREBASE_CONFIG = \{[^}]*\};", new, s, count=1)
if n == 0 and new not in s:
    sys.exit("could not find window.FIREBASE_CONFIG slot in " + p)
open(p, "w").write(s2)
print("index.astro config written")
EOF
python3 -c "import json; json.dump({'projects':{'default':'$PID'}}, open('.firebaserc','w'), indent=2); open('.firebaserc','a').write('\n')"

# ---- 4. provision Firestore + build + deploy
say "provisioning Firestore (native, us-central1)"
authed -X POST "https://firestore.googleapis.com/v1/projects/$PID/databases" \
  -d '{"locationId":"us-central1","type":"FIRESTORE_NATIVE"}' >/dev/null 2>&1 && echo "database created" || echo "database exists (or provisioning in flight)"

say "building"
npm run build >/dev/null
say "deploying hosting + firestore rules"
"${FB[@]}" deploy --project "$PID" --only hosting,firestore:rules --non-interactive

# ---- 5. verify
say "verifying live"
sleep 3
URL="https://$PID.web.app/"
body=$($CURL "$URL")
if echo "$body" | grep -q "FIREBASE_CONFIG"; then
  echo "OK  $URL serves the app"
else
  echo "WARN: marker not found in the served HTML"
  echo "$body" | head -5
fi
echo "$body" | grep -oE "FIREBASE_CONFIG = \{[^}]*\}" | head -1
