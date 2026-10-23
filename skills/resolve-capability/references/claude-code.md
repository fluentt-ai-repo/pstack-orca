# Claude Code

## Tools

- **Subagents.** The `Agent` tool. Its schema has `model`, `effort`, `subagent_type`, `isolation` (`"worktree"` gives the subagent its own checkout, unverified), and `run_in_background`. Read the accepted model and effort values from the schema you have now, because they change with the version. Read the subagent types and their tools from the same place. A read-only job takes a type whose tool list has no edit or write tool (`Explore` and `Plan` at the time of writing, so check the list you have). The general-purpose types have every tool, so a brief that says not to edit does not make them read-only. Some read-only types drop tools that others keep, MCP tools among them.
- **Questions.** `AskUserQuestion`.
- **Plan.** Use the plan or todo tool if your tool list has one. Otherwise keep the list in the reply.
- **Waking.** A command started with `run_in_background` wakes the session when it ends. `/loop`, `CronCreate`, `ScheduleWakeup`, `Monitor`, `SendMessage`, and `TaskStop` exist in some versions. They are unverified here, so look at your tool list.
- **Other sessions.** `ListAgents` lists the Claude Code sessions on this machine, with their names and whether each is idle or busy, and `SendMessage` delivers a message to one by name. A terminal session that Orca started received a message and answered it. `notify_when_idle` asks for one notice when the target next goes idle. A session in another permission mode holds a cross-session message for its user's approval, so silence is not agreement.
- **Background sessions.** `claude --bg "<brief>"` starts one and prints an id. `claude agents --json --all` lists sessions (interactive and background), and `claude logs <id>`, `claude attach <id>`, `claude stop <id>`, `claude rm <id>` manage a background one. They need a workspace that has accepted the trust prompt. All of this ran.
- **Skills.** `/name` runs a skill. `skill-creator` writes one.

## Files

- Instructions: `CLAUDE.md`. Project skills: `.claude/skills/`. User skills: `~/.claude/skills/`.
- Transcripts: `<config dir>/projects/<workspace folder>/<session>.jsonl`. Tool calls are `tool_use` blocks in `assistant` messages. Under Orca the config dir is Orca's Claude profile, whose `skills` folder links to `~/.claude/skills`.

## Limits

- A subagent started with `Agent` takes only Claude models. Another vendor's model needs `spawn-worker`, which a shell can do without Orca (see `cli-workers.md`).
- The desktop app's Code tab runs sessions of its own (Worktree mode there is off until you turn it on). Its documentation says Claude sees only the sessions the desktop app runs. This was not run here.
- No command or file read here reports remaining usage. `/usage` exists only in an interactive session. A limit shows up as an error when a start fails.
- In the default permission mode, a first read outside the project can ask the user for permission.
