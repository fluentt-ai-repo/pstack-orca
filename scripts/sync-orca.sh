#!/usr/bin/env bash
# Snapshot the installed Orca's skill guides and command schema onto the `upstream-orca` branch.
# Prints the new commit, or nothing when the snapshot is unchanged.
set -euo pipefail

repo=$(git rev-parse --show-toplevel)
tmp=$(mktemp -d)
trap 'git -C "$repo" worktree remove --force "$tmp/wt" 2>/dev/null || true; rm -rf "$tmp"' EXIT

git -C "$repo" worktree add -q "$tmp/wt" upstream-orca
"$repo/scripts/snapshot-orca.sh" "$tmp/wt/orca"
git -C "$tmp/wt" add -A
if git -C "$tmp/wt" diff --cached --quiet; then
  exit 0
fi
git -C "$tmp/wt" commit -q -m "upstream-orca: orca $(cat "$tmp/wt/orca/VERSION")"
git -C "$tmp/wt" log --oneline -1
