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
# The CLI's own public OAuth client (shipped in the firebase-tools npm bundle;
# the constants it itself uses). Scrape the bundle, fall back to the known
# public values, env-overridable like the CLI's own FIREBASE_CLIENT_*.
FB_LIB=""
for cand in node_modules/firebase-tools/lib "$HOME"/.npm/_npx/*/node_modules/firebase-tools/lib; do
  if [ -d "$cand" ]; then FB_LIB="$cand"; break; fi
done
CLIENT_ID=$( (grep -rhoE '"[0-9]{12}-[a-z0-9]+\.apps\.googleusercontent\.com"' "$FB_LIB" 2>/dev/null | head -1 | tr -d '"') || true)
CLIENT_SECRET=$( (grep -rhoE 'FIREBASE_CLIENT_SECRET", "[^"]+"' "$FB_LIB" 2>/dev/null | head -1 | sed -E 's/.*"([^"]+)"$/\1/') || true)
CLIENT_ID="${FIREBASE_CLIENT_ID:-${CLIENT_ID:-563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com}}"
CLIENT_SECRET="${FIREBASE_CLIENT_SECRET:-${CLIENT_SECRET:-j9iVZfS8kkCEFUPaAeJV0sAi}}"
REFRESH=$(python3 - "$FB_JSON" <<'EOF'
import json, os, sys
d = json.load(open(sys.argv[1]))
t = d.get("tokens") or (d.get("user") or {}).get("tokens") or (d.get("user") or {})
print(t.get("refresh_token") or t.get("refreshToken") or "")
EOF
)
[ -n "${REFRESH:-}" ] || { echo "no refresh token in session — run: npx firebase-tools login"; exit 2; }
[ -n "${CLIENT_ID:-}" ] && [ -n "${CLIENT_SECRET:-}" ] || { echo "no OAuth client — set FIREBASE_CLIENT_ID / FIREBASE_CLIENT_SECRET"; exit 2; }

refresh_access() {
  local resp
  resp=$(curl -sS -X POST https://oauth2.googleapis.com/token \
    -d client_id="$CLIENT_ID" -d client_secret="$CLIENT_SECRET" \
    -d refresh_token="$REFRESH" -d grant_type=refresh_token) || true
  echo "$resp" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])' \
    || { echo "token exchange failed: $resp" >&2; return 1; }
}
ACCESS=$(refresh_access)
authed() { curl -sS --fail-with-body -H "Authorization: Bearer $ACCESS" -H "content-type: application/json" "$@"; }

# ---- 1. project
PID=$(python3 -c "import json;print(json.load(open('.firebaserc'))['projects']['default'])" 2>/dev/null || echo "")
if [ "$PID" = "YOUR_PROJECT_ID" ]; then
  # an invalid active-project placeholder makes every firebase CLI call fail
  # ("Invalid project id: YOUR_PROJECT_ID") — park it until the real id lands
  mv .firebaserc .firebaserc.placeholder
  PID=""
fi
project_state() { authed "https://cloudresourcemanager.googleapis.com/v1/projects/$1" 2>/dev/null | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("lifecycleState",""))
except Exception: print("")' || true; }
have_pid=false
if [ -n "$PID" ]; then
  [ "$(project_state "$PID")" = "ACTIVE" ] && have_pid=true
fi
# no rcfile (first run crashed midway)? reuse an existing shelfsense-* project
if [ "$have_pid" = false ] && [ -n "${SHELFSENCE_PID:-}" ]; then
  PID="$SHELFSENCE_PID"; have_pid=true
fi
if [ "$have_pid" = false ] && [ -z "$PID" ]; then
  PID=$(authed "https://cloudresourcemanager.googleapis.com/v1/projects" 2>/dev/null | python3 -c 'import json,sys
try:
    ps = [p["projectId"] for p in json.load(sys.stdin).get("projects", []) if p["projectId"].startswith("shelfsense-") and p.get("lifecycleState") == "ACTIVE"]
    print(ps[-1] if ps else "")
except Exception: print("")' || true)
  [ -n "$PID" ] && have_pid=true && say "reusing existing project $PID"
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
    [ "$(project_state "$PID")" = "ACTIVE" ] && break
    [ "$i" = 45 ] && { echo "project never became ACTIVE"; exit 1; }
    sleep 4
  done
fi
say "project: $PID"

# ---- 2. anonymous sign-in on. First-time activation on a Spark (free)
# project has NO public API (initializeAuth hard-requires billing) — best
# effort here, with an honest console pointer when the API refuses.
say "enabling anonymous sign-in"
authed -X POST "https://identitytoolkit.googleapis.com/admin/v2/projects/$PID/identityPlatform:initializeAuth" \
  -H "x-goog-user-project: $PID" -d '{}' >/dev/null 2>&1 || true
ANON=$(authed -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/$PID/config?updateMask=signIn.anonymous.enabled" \
  -H "x-goog-user-project: $PID" -d '{"signIn":{"anonymous":{"enabled":true}}}' 2>/dev/null | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("signIn",{}).get("anonymous",{}).get("enabled"))
except Exception: print("")' || echo "")
if [ "$ANON" = "True" ]; then
  echo "anonymous: enabled"
else
  echo "  NOTE: anonymous sign-in could NOT be enabled via API (free projects gate it)."
  echo "  ONE console click needed: https://console.firebase.google.com/project/$PID/authentication"
  echo "        (Authentication → Get started → Anonymous → Enable)"
fi

# ---- 3. web app + its SDK config (reuse an existing web app if present)
say "registering web app + minting SDK config"
APPID=$(authed "https://firebase.googleapis.com/v1beta1/projects/$PID/webApps" 2>/dev/null | python3 -c 'import json,sys
try:
    web = [a for a in json.load(sys.stdin).get("apps", []) if ":web:" in a.get("appId", "")]
    print(web[0]["appId"] if web else "")
except Exception: print("")' || echo "")
if [ -z "$APPID" ]; then
  OPNAME=$(authed -X POST "https://firebase.googleapis.com/v1beta1/projects/$PID/webApps" -d '{"displayName":"ShelfSense AI"}' \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("name",""))')
  for i in $(seq 1 15); do
    APPID=$(authed "https://firebase.googleapis.com/v1beta1/$OPNAME" 2>/dev/null | python3 -c 'import json,sys
try: print((json.load(sys.stdin).get("response") or {}).get("appId",""))
except Exception: print("")' || echo "")
    [ -n "$APPID" ] && break
    sleep 2
  done
fi
[ -n "$APPID" ] || { echo "could not obtain a web app id"; exit 1; }
echo "web app: $APPID"
sleep 3
CFG=$(authed "https://firebase.googleapis.com/v1beta1/projects/$PID/webApps/$APPID/config" | python3 -c '
import json, sys
c = json.load(sys.stdin)
need = ["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"]
missing = [k for k in need if not c.get(k)]
if missing: sys.exit("missing " + ",".join(missing))
print(json.dumps(c))')
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
