# No Orca

A session with no `ORCA_CLI_*` variable has no supervised workers, no durable run, no inbox, and no schedules from Orca. It still has more than its own subagent tool.

- `spawn-worker`: start another product's CLI headless from the shell (`cli-workers.md`). That needs the product installed and logged in. `select-model` records which are. When none is, run the seat on your own model and say in one line which product would run it.
- `control-agent` and `find-sessions`: the harness's own session tools (`claude-code.md`, `codex.md`).
- `coordinate-workers`: the `orch` tool in `../poteto-mode/scripts/orch/`, or the plan in the reply.
- `run-remote` has no mechanism. `run-on-schedule` and `wake-on-event` use the harness's own, or the fallback in the index.
- When no other vendor is reachable, "several models together" means several models of your own vendor. Say that diversity is lower than a mixed panel would give.
- A read-only seat uses the harness's read-only subagent type, or the other product's read-only mode where `cli-workers.md` names one, and a brief that says not to edit. Check `git status` after.

The Claude desktop app's Code tab and the ChatGPT desktop app's Codex are plain sessions in this sense, with a shell and no Orca variables. What each app adds (parallel sessions, worktrees, scheduled tasks) is in its harness file.
