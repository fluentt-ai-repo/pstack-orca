#!/usr/bin/env bash
# Copy the latest cursor/plugins/pstack onto the `upstream` branch.
# Prints the new commit, or nothing when upstream is already current.
set -euo pipefail

repo=$(git rev-parse --show-toplevel)
tmp=$(mktemp -d)
trap 'git -C "$repo" worktree remove --force "$tmp/wt" 2>/dev/null || true; rm -rf "$tmp"' EXIT

git clone -q --depth 1 --filter=blob:none --sparse https://github.com/cursor/plugins.git "$tmp/cursor"
git -C "$tmp/cursor" sparse-checkout set pstack
sha=$(git -C "$tmp/cursor" rev-parse --short HEAD)

git -C "$repo" worktree add -q "$tmp/wt" upstream
rsync -a --delete --exclude .git "$tmp/cursor/pstack/" "$tmp/wt/"
git -C "$tmp/wt" add -A
if git -C "$tmp/wt" diff --cached --quiet; then
  exit 0
fi
git -C "$tmp/wt" commit -q -m "upstream: cursor/plugins/pstack @ $sha"
git -C "$tmp/wt" log --oneline -1
