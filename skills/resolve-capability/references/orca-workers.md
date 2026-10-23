# Orca workers

Facts checked on Orca 1.4.237. Orca's own contract is the version-matched guide: run `orca skills get orchestration` before your first worker and follow its coordinator loop. This file says how pstack uses it and does not replace it.

## The loop

Start one Run per task, then one worker per seat. Start the whole independent wave before you wait on any of it. Start Orca workers and your own harness's subagents in the same message when they should run at the same time.

```text
orca orchestration run-create --objective "<skill>: <task>" --json
orca orchestration worker-start --spec "<brief>" --agent <agent> --model <model> --effort <effort> --worktree <placement> --json
orca orchestration check --wait --types worker_done,escalation,question --timeout-ms 900000 --json
orca orchestration reply --id <message_id> --body "<answer>" --json
orca orchestration worker-release --dispatch <dispatch_id> --json
orca orchestration check --ack <delivery_id> --wait --types worker_done,escalation,question --timeout-ms 900000 --json
```

- If `worker-start` exits non-zero, do not relaunch. Read the receipt's `failedStage` and `residualResources`, then run `orca skills get orchestration --reference references/recovery-and-cleanup.md`.
- A `check` timeout or an empty result is a checkpoint, not a failure. After three empty waits, list with `orca orchestration worker-list --include-remote --json` and act on each row's `projection.nextAction`. Absence never authorizes stop, abandon, retry, or release.
- A valid `worker_done` settles the task. Do not follow it with `task-update --status completed`. Release a worker only after its settlement was accepted. Release is cleanup, not cancellation.
- Reattach to a Run after a restart with `orca orchestration run-use`.

## The brief

A spec is self-contained. It names the target, the change, the constraints, who may edit what, and the observable acceptance. End every spec with: "Write your full result to `<report path>`. Then send `worker_done` with `--report-path` as your preamble instructs." Read the report file, or `orca orchestration worker-read --dispatch <id> --source transcript`.

| A seat needs | Do |
| --- | --- |
| The `poteto-agent` rules | Start the spec with "Read `<pstack>/poteto-mode/SKILL.md` in full, including its Principles section, before any work." |
| To read only | Put "Read-only. Do not edit, commit, or push." in the spec and use `--worktree current`. Orca has no read-only flag, so check `git status` after the worker settles. |
| To write | `--worktree new-child`, so its edits land in its own checkout. A writer also gets its own ports and temp paths. |
| To start from another branch | `--base-branch <b>`, valid only with `new-child` or `new-top-level`. |
| To survive this computer sleeping | `--on <saved environment>`. List the environments with `orca environment list`. Without one the worker is local. |
| Files | List the paths in the spec. |
| A fresh start for follow-up work | A new worker with the consolidated scope. Only when the work needs the old worker's state, send to it with `orca orchestration send --to dispatch:<id>`. |

## Which agents take model and effort flags

| Agent | `--model` | `--effort` |
| --- | --- | --- |
| claude, codex, cursor, antigravity, muse | yes | yes, and it needs `--model` |
| omp | yes | no |
| opencode | yes, and only in an existing worktree | no |
| grok | refused | refused |
| zcode and any other | no | no |

Grok: `worker-start --agent grok --model grok-4.7 --effort medium` exits 1 with `Agent grok does not support launch-time model selection. Omit --model to run the model from its own config.` Start it with `--agent grok` alone. It runs the model in `~/.grok/config.toml`. `worker-show` reports `launch.effective` as null, so read the model that ran from the Grok session record (`grok.md`) and say it in your reply.

An id is valid when `$ORCA_USER_DATA_PATH/agent-model-catalog.json` lists it:

```bash
jq -r '.entries[] | .agent as $a | (.live // .discovered).models[]? | "\($a) \(.id) \([.efforts[]?.value] | join(","))"' \
  "$ORCA_USER_DATA_PATH/agent-model-catalog.json" | sort -u
```

`worker-start` rejects an id it does not accept with `failedStage`. Use another id that `select-model` lists for the same agent and say so. Never guess an id. `auto` and `inherit-parent` mean: omit `--model` and `--effort`.

## Control

- Probe: `orca orchestration worker-show --dispatch <id>`. A live terminal can still hold a dead or stuck agent, so liveness is layered: `worker-list` gives the agent's verdict, `worker-show` gives the terminal's.
- Message a worker: `orca orchestration send --to dispatch:<id>`.
- Stop or abandon only on positive proof the agent stopped, with the exact recovery receipt: `orca orchestration worker-stop` or `worker-abandon`. Never substitute `terminal close` for a release.
- `orca orchestration reset` is destructive. Do not call it on your own.

## What a worker cannot do

- MCP servers do not cross agents. A worker loads only its own agent's MCP configuration.
- Remaining usage cannot be read. Orca has no command for it, and `orca status` does not report it. A limit shows up as an error when a start fails.
- A worker that asks the user something uses `orca orchestration ask`. It never opens a question screen the coordinator cannot answer.
