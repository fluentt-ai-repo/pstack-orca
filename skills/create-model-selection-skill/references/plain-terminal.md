# No Orca

A Claude Code or Codex session started on its own starts its own models with its own subagent tool. It can also start another product by running that product's CLI headless from the shell, when that product is installed and logged in: `codex exec`, `claude -p`, and `grok -p` all ran this way. End `codex exec` with `< /dev/null`: it waits for EOF on a stdin that is not a terminal, and a background shell can leave one open. What it lacks is Orca's supervision: no inbox, no durable run, no report-file protocol, no managed worktrees.

- A seat that wants another vendor's model runs through that product's CLI when it is installed and logged in. When it is not, the seat runs on your own model. Say so in one line in the reply.
- Record each installed product in `inventory.md` with how it starts from here. For a product the session can only run through its CLI, say so, and note that Grok started this way takes a model and effort flag, which an Orca-started Grok does not.
- When no other vendor is reachable, several models together means several models of your own vendor. Say that diversity is lower than a mixed panel would give.
- Read-only seats use the harness's read-only subagent type, or the other product's own read-only mode, and a brief that says not to edit. Check `git status` after.

For supervised workers, a durable run, schedules, and remote environments, the user starts the task from Orca.
