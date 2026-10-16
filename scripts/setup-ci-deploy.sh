#!/usr/bin/env bash
# Wires CI autodeploy: creates the shelfsense-deploy service account on the
# project, grants it Hosting + Firestore Rules admin, mints a fresh key and
# stores it as the FIREBASE_SERVICE_ACCOUNT_SHELFSENSE_DF2265 GitHub secret
# (via the gh CLI). Re-running rotates the key.
# Prerequisites: `npx firebase-tools login` completed once, `gh` authenticated.
# Optional arg: <owner/repo> — defaults to the origin remote.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." >/dev/null 2>&1 && pwd)"
cd "$REPO"
REPO_SLUG="${1:-$(git remote get-url origin | sed -E 's#.*github\.com[:/]##; s/\.git$//')}"
SECRET="FIREBASE_SERVICE_ACCOUNT_SHELFSENSE_DF2265"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

say() { printf '\n=== %s\n' "$*"; }

# ---- the CLI session's refresh token → fresh access token (same path as
# deploy-firebase.sh; gcloud is not assumed)
FB_JSON="$HOME/.config/configstore/firebase-tools.json"
[ -f "$FB_JSON" ] || { echo "no firebase-tools session at $FB_JSON — run: npx firebase-tools login"; exit 2; }
FB_LIB=""
for cand in node_modules/firebase-tools/lib "$HOME"/.npm/_npx/*/node_modules/firebase-tools/lib; do
  if [ -d "$cand" ]; then FB_LIB="$cand"; break; fi
done
CLIENT_ID=$( (grep -rhoE '"[0-9]{12}-[a-z0-9]+\.apps\.googleusercontent\.com"' "$FB_LIB" 2>/dev/null | head -1 | tr -d '"') || true)
CLIENT_SECRET=$( (grep -rhoE 'FIREBASE_CLIENT_SECRET", "[^"]+"' "$FB_LIB" 2>/dev/null | head -1 | sed -E 's/.*"([^"]+)"$/\1/') || true)
CLIENT_ID="${FIREBASE_CLIENT_ID:-${CLIENT_ID:-563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com}}"
CLIENT_SECRET="${FIREBASE_CLIENT_SECRET:-${CLIENT_SECRET:-j9iVZfS8kkCEFUPaAeJV0sAi}}"
REFRESH=$(python3 - "$FB_JSON" <<'EOF'
import json, sys
d = json.load(open(sys.argv[1]))
t = d.get("tokens") or (d.get("user") or {}).get("tokens") or (d.get("user") or {})
print(t.get("refresh_token") or t.get("refreshToken") or "")
EOF
)
[ -n "${REFRESH:-}" ] || { echo "no refresh token in session — run: npx firebase-tools login"; exit 2; }
[ -n "${CLIENT_ID:-}" ] && [ -n "${CLIENT_SECRET:-}" ] || { echo "no OAuth client — set FIREBASE_CLIENT_ID / FIREBASE_CLIENT_SECRET"; exit 2; }
ACCESS=$(curl -sS -X POST https://oauth2.googleapis.com/token \
  -d client_id="$CLIENT_ID" -d client_secret="$CLIENT_SECRET" \
  -d refresh_token="$REFRESH" -d grant_type=refresh_token \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')
# curl's 4xx/5xx happen transiently on Google APIs — to-file + retry, never
# pipe straight into the next stage
authed() { curl -sS -H "Authorization: Bearer $ACCESS" -H "content-type: application/json" "$@"; }
authed_ok() { # authed_ok <outfile> <curl args...>
  local out="$1"; shift
  local attempt
  for attempt in 1 2 3 4 5; do
    if authed "$@" > "$out"; then return 0; fi
    sleep $((attempt * 2))
  done
  echo "API call kept failing: $*" >&2
  return 1
}

PID=$(python3 -c "import json;print(json.load(open('.firebaserc'))['projects']['default'])")
SA_ID="shelfsense-deploy"
SA_EMAIL="$SA_ID@$PID.iam.gserviceaccount.com"
IAM="https://iam.googleapis.com/v1/projects/$PID/serviceAccounts"
say "repo $REPO_SLUG · project $PID · service account $SA_EMAIL"

# ---- 1. service account (reuse if present)
authed_ok "$TMP/sas.json" "$IAM" || exit 1
if ! grep -q "\"email\":\"$SA_EMAIL\"" "$TMP/sas.json"; then
  authed_ok "$TMP/sa.json" -X POST "$IAM" \
    -d '{"accountId":"'"$SA_ID"'","serviceAccount":{"displayName":"ShelfSense CI deploy (GitHub Actions)"}}' || exit 1
  echo "service account created"
else
  echo "service account exists"
fi

# ---- 2. roles: Hosting admin (site), Rules admin (firestore.rules),
# service-usage consumer (the CLI checks enabled APIs before deploying)
say "granting roles"
authed_ok "$TMP/policy.json" -X POST \
  "https://cloudresourcemanager.googleapis.com/v1/projects/$PID:getIamPolicy" -d '{}' || exit 1
python3 - "$TMP/policy.json" "$SA_EMAIL" > "$TMP/policy.new.json" <<'EOF'
import json, sys
policy = json.load(open(sys.argv[1]))
member = "serviceAccount:" + sys.argv[2]
bindings = policy.setdefault("bindings", [])
for role in ["roles/firebasehosting.admin", "roles/firebaserules.admin", "roles/serviceusage.serviceUsageConsumer"]:
    for b in bindings:
        if b["role"] == role:
            if member not in b["members"]:
                b["members"].append(member)
            break
    else:
        bindings.append({"role": role, "members": [member]})
json.dump({"policy": policy}, sys.stdout)
EOF
for attempt in 1 2 3; do
  if authed -X POST "https://cloudresourcemanager.googleapis.com/v1/projects/$PID:setIamPolicy" \
      -d @"$TMP/policy.new.json" > "$TMP/policy.result.json"; then
    break
  fi
  [ "$attempt" = 3 ] && { echo "setIamPolicy kept failing" >&2; exit 1; }
  sleep 3
done
echo "roles granted"

# ---- 3. fresh key: retire the previous ones (the SA is CI-dedicated, its
# keys live nowhere but this secret), mint, decode, store as the secret
say "minting key → GitHub secret $SECRET"
authed_ok "$TMP/keys.json" "$IAM/$SA_EMAIL/keys" || exit 1
for KEY in $(python3 -c 'import json,sys
for k in json.load(open(sys.argv[1])).get("keys", []):
    if k.get("keyType") == "USER_MANAGED": print(k["name"])' "$TMP/keys.json"); do
  authed -X DELETE "https://iam.googleapis.com/v1/$KEY" > /dev/null
done
authed_ok "$TMP/key.json" -X POST "$IAM/$SA_EMAIL/keys" -d '{}' || exit 1
python3 -c 'import base64,json,sys; d=json.load(open(sys.argv[1])); sys.stdout.buffer.write(base64.b64decode(d["privateKeyData"]))' \
  "$TMP/key.json" > "$TMP/sa.json"
python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); assert d.get("client_email")' "$TMP/sa.json"
gh secret set "$SECRET" --repo "$REPO_SLUG" < "$TMP/sa.json"

say "done — secret $SECRET set on $REPO_SLUG"
echo "pushing to main now auto-deploys hosting + Firestore rules."
