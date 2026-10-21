#!/usr/bin/env bash
# Snapshot the Orca skill guides and command schema that ship inside the local `orca` binary.
# Usage: scripts/snapshot-orca.sh <output-dir>
set -euo pipefail

out=${1:?usage: snapshot-orca.sh <output-dir>}
orca_bin=${ORCA_CLI_COMMAND:-orca}

rm -rf "$out"
mkdir -p "$out/skills"

"$orca_bin" --version > "$out/VERSION"
"$orca_bin" agent-context --json | jq -S . > "$out/agent-context.json"
"$orca_bin" skills list --json | jq -S . > "$out/skills.json"

jq -r '.topics[].name' "$out/skills.json" | while read -r topic; do
  if ! "$orca_bin" skills get "$topic" --full > "$out/skills/$topic.md" 2>/dev/null; then
    "$orca_bin" skills get "$topic" > "$out/skills/$topic.md"
  fi
done
