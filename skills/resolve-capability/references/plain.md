# No Orca

A Claude Code or Codex session started on its own can start only its own models, with its own subagent tool. It cannot start another vendor's agent.

- `spawn-worker`: not available. A seat that wants another vendor's model runs on your own model instead. Say so in one line, and say that Orca would run it on the intended agent.
- `coordinate-workers`: the `orch` tool in `../poteto-mode/scripts/orch/`, or the plan in the reply.
- `run-remote`, `run-on-schedule`, and `wake-on-event` have no Orca mechanism. Use the harness's own, or the fallback in the index.
- When no other vendor is reachable, "several models together" means several models of your own vendor. Say that diversity is lower than a mixed panel would give.
- A read-only seat uses the harness's read-only subagent type and a brief that says not to edit. Check `git status` after.
- Another product's CLI may be installed on `PATH`. That does not make it startable from here. `select-model` records it as installed and not startable from here.

To use another vendor's agent, the user starts the task from Orca.
