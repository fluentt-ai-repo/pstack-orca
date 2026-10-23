# Claude Code

## Your own subagents

The `Agent` tool starts a subagent. Its schema has `model` and `effort`. Read the accepted `model` values and the effort values from the schema you have now. Do not write them from memory: they change with the Claude Code version.

Read the subagent types and the tools each one has from the same place. The available types are listed with their tools. Some read-only types drop tools that others keep, MCP tools among them. Record which types keep your MCP servers by reading their tool lists, not by assuming.

A subagent started from a repository that has `agents/poteto-agent.md` installed can use the `poteto-agent` type.

## Models from Orca

When Orca is here, its catalog also lists Claude models by full id (for example `claude-opus-4-8`) beside the aliases (`opus`, `fable`, `sonnet`, `haiku`). An Orca worker takes `--model` and `--effort` for Claude. A subagent takes only what the `Agent` tool schema lists.

## Usage

No command or file read on this computer reports remaining Claude usage. `/usage` exists only in an interactive session. A limit shows up as an error when a start fails, so handle it then.

## Transcripts

`<config dir>/projects/<workspace folder>/*.jsonl`.

## Skill folder

`~/.claude/skills/`. The `skills` CLI links a skill there as `<name> -> ../../.agents/skills/<name>`. Orca's Claude profile links its `skills` folder to `~/.claude/skills`, so one link covers a Claude Code started by Orca too.
