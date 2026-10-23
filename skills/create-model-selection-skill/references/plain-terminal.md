# No Orca

A Claude Code or Codex session started on its own can start only its own models, with its own subagent tool. It has no way to start another vendor's agent.

- A seat that wants another vendor's model runs on your own model instead. Say so in one line in the reply, and say that Orca would run it on the intended agent.
- A product that is installed but that this session cannot start (for example `grok` on `PATH` while you run in Claude Code) goes in `inventory.md` as `installed, not startable from here`.
- When no other vendor is reachable, several models together means several models of your own vendor. Say that diversity is lower than a mixed panel would give.
- Read-only seats use the harness's read-only subagent type and a brief that says not to edit. Check `git status` after.

To use another vendor's agent, the user starts the task from Orca.
