#!/usr/bin/env bash
set -euo pipefail
REPO=GDBryant/route_points
TITLE=route-points-deploy-key
KEY="$HOME/.ssh/route_points_deploy"
HOST_ALIAS=github.com-route_points

[[ -f "$KEY" ]] || ssh-keygen -t ed25519 -C "$TITLE" -f "$KEY" -N ""

if command -v gh >/dev/null; then
  gh repo deploy-key add "$KEY.pub" --repo "$REPO" --title "$TITLE" --allow-write
else
  echo "Add this public key at https://github.com/$REPO/settings/keys/new (title: $TITLE, allow write):"
  cat "$KEY.pub"
fi

if ! grep -q "Host $HOST_ALIAS" "$HOME/.ssh/config" 2>/dev/null; then
  cat >> "$HOME/.ssh/config" <<EOF

Host $HOST_ALIAS
  HostName github.com
  User git
  IdentityFile $KEY
  IdentitiesOnly yes
EOF
fi

git remote get-url origin >/dev/null 2>&1 \
  && git remote set-url origin "git@$HOST_ALIAS:$REPO.git" \
  || git remote add origin "git@$HOST_ALIAS:$REPO.git"
ssh -T "git@$HOST_ALIAS" 2>&1 | grep -q "successfully authenticated" && echo "Deploy key works: origin -> git@$HOST_ALIAS:$REPO.git"
