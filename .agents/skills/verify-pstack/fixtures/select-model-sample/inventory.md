# Inventory

Confirmed 2026-10-23 from Claude Code 2.1.309. Orca: yes, 1.4.237. This is a snapshot. Recheck what you use.

## Environment

- Harness: Claude Code, run inside Orca.
- Orca is here (`ORCA_CLI_BIN_DIR` set). Catalog agents: claude, codex, grok.
- `claude`, `codex`, `grok` are on `PATH`. Pins: `~/.claude/settings.json` model `opus`, effort `xhigh`; `~/.grok/config.toml` default `grok-4.7`.

## claude

- Models: opus (low, medium, high, xhigh, max), fable (same), sonnet (same), haiku (same), claude-opus-5, claude-sonnet-5, claude-fable-5, claude-opus-4-8, claude-opus-4-7, claude-haiku-4-5-20251001 (no efforts)
- Start from here: `Agent` tool (`model`, `effort`), or an Orca worker with `--agent claude --model --effort`
- Choose the model at start: yes
- Loads this user's MCP servers: subagent types with `Tools: *` (claude, general-purpose) keep them; `claude-code-guide` (Bash, Read, WebFetch, WebSearch) does not. An Orca worker loads only Claude's own MCP config.
- Read-only types: Explore and Plan (no Edit, Write, NotebookEdit; MCP tools kept per their "all tools except" lists), claude-code-guide
- Confirmed: not verified here: proof jobs skipped by the user's instruction

## grok

- Models: grok-4.7, grok-4.7-build-fast, grok-4.6 (low, medium, high, xhigh), grok-4.5 (low, medium, high)
- Start from here: `orca orchestration worker-start --agent grok` alone, or `grok -p "<brief>" -m <model> --reasoning-effort <effort>`
- Choose the model at start: no through Orca (it runs `[models] default` = `grok-4.7` from `~/.grok/config.toml`); yes through `grok -p`
- Loads this user's MCP servers: unknown
- Read-only types: none; write "Read-only" in the brief and check `git status`
- Confirmed: not verified here: proof jobs skipped by the user's instruction

## codex

- Models: gpt-6.1-sol, gpt-6-astra, gpt-6-sol (low to ultra), gpt-6-luna (low to max), gpt-5.6-sol, gpt-5.6-terra (low to ultra), gpt-5.6-luna (low to max)
- Start from here: Orca worker with `--agent codex --model --effort`, or `codex exec`
- Choose the model at start: yes
- Loads this user's MCP servers: unknown
- Read-only types: none; write "Read-only" in the brief and check `git status`
- Confirmed: not verified here: proof jobs skipped by the user's instruction
