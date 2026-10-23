# Claude Code

## Tools

- **Subagents.** The `Agent` tool. Its schema has `model`, `effort`, `subagent_type`, `isolation` (`"worktree"` gives the subagent its own checkout, unverified), and `run_in_background`. Read the accepted model and effort values from the schema you have now, because they change with the version. Read the subagent types and their tools from the same place. Some read-only types drop tools that others keep, MCP tools among them.
- **Questions.** `AskUserQuestion`.
- **Plan.** Use the plan or todo tool if your tool list has one. Otherwise keep the list in the reply.
- **Waking.** A command started with `run_in_background` wakes the session when it ends. `/loop`, `CronCreate`, `ScheduleWakeup`, `Monitor`, `SendMessage`, and `TaskStop` exist in some versions. They are unverified here, so look at your tool list.
- **Skills.** `/name` runs a skill. `skill-creator` writes one.

## Files

- Instructions: `CLAUDE.md`. Project skills: `.claude/skills/`. User skills: `~/.claude/skills/`.
- Transcripts: `<config dir>/projects/<workspace folder>/<session>.jsonl`. Tool calls are `tool_use` blocks in `assistant` messages. Under Orca the config dir is Orca's Claude profile, whose `skills` folder links to `~/.claude/skills`.

## Limits

- A subagent started with `Agent` takes only Claude models. Another vendor's model needs `spawn-worker`.
- No command or file read here reports remaining usage. `/usage` exists only in an interactive session. A limit shows up as an error when a start fails.
- In the default permission mode, a first read outside the project can ask the user for permission.
