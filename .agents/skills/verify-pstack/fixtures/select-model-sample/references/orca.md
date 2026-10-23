<!-- from pstack unknown (no plugin.json found), overwritten on update -->
# Orca

Facts checked on Orca 1.4.237.

## Detect it

Orca is here when `ORCA_CLI_BIN_DIR` or `ORCA_CLI_COMMAND` is set. `ORCA_USER_DATA_PATH` points at Orca's data folder.

## What can run

Every agent in `$ORCA_USER_DATA_PATH/agent-model-catalog.json` can run as an Orca worker. The file lists what Orca probed, with the efforts of each model.

```bash
jq -r '.entries[] | .agent as $a | (.live // .discovered).models[]? | "\($a) \(.id) \([.efforts[]?.value] | join(","))"' \
  "$ORCA_USER_DATA_PATH/agent-model-catalog.json" | sort -u
```

An agent can have several entries, one per account, so `sort -u` drops the repeats. Treat an id as available when any entry lists it. An agent whose CLI is not installed cannot start.

## Start a worker

Start one Run per task, then one worker per seat. Start the whole wave before you wait on any of it. Before your first worker, run `orca skills get orchestration` and follow its coordinator loop. It is the version-matched contract for `check`, `--ack`, `worker-release`, and recovery.

```text
orca orchestration run-create --objective "<task>" --json
orca orchestration worker-start --spec "<brief>" --agent <agent> --model <model> --effort <effort> --worktree <placement> --json
orca orchestration check --wait --types worker_done,escalation,question --timeout-ms 900000 --json
```

End every brief with: "Write your full result to `<report path>`. Then send `worker_done` with `--report-path` as your preamble instructs." Read the report file, or `orca orchestration worker-read --dispatch <id> --source transcript`.

Placement: `--worktree current` for a worker that only reads, `--worktree new-child` for one that writes, so its edits land in its own checkout. `--base-branch <b>` only works with `new-child` or `new-top-level`.

## Which agents take model and effort flags

| Agent | `--model` | `--effort` |
| --- | --- | --- |
| claude, codex, cursor, antigravity, muse | yes | yes, and it needs `--model` |
| omp | yes | no |
| opencode | yes, and only in an existing worktree | no |
| grok | refused | refused |
| zcode and any other | no | no |

Grok: `worker-start --agent grok --model grok-4.7 --effort medium` exits 1 with `Agent grok does not support launch-time model selection. Omit --model to run the model from its own config.` Start it with `--agent grok` alone. It runs the model in `~/.grok/config.toml`. `worker-show` reports `launch.effective` as null, so read the model that ran from the Grok session record (see `grok.md`).

## What a worker cannot do

- **Read-only is not enforced.** No flag exists. Write "Read-only. Do not edit, commit, or push." in the brief, use `--worktree current`, and check `git status` after the worker settles.
- **MCP servers do not cross agents.** A worker loads only its own agent's MCP configuration. A seat that needs one of your MCP servers stays on your own harness.
- **Workers share this computer.** A worker that writes needs its own worktree, ports, and temp paths.
- **Remaining usage cannot be read.** Orca has no command for it, and `orca status` does not report it.

## Start together

Start Orca workers and your own harness's subagents in the same message when they should run at the same time.
