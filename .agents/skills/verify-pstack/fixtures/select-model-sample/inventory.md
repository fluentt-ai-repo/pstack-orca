# Inventory

Confirmed 2026-10-23 from Claude Code 2.1.309. Orca: yes, 1.4.237. This is a snapshot. Recheck what you use.

## Environment

- Harness: Claude Code (Sonnet 5.5 session), started inside Orca.
- `gh`: logged in. `bun`: 1.3.11.
- Orca environments: grok (ws://<tailnet address>:6768), littleboy (ws://<tailnet address>:6768).
- Pins: `~/.claude/settings.json` `model` = opus. `~/.codex/config.toml` `model` = gpt-6.1-sol, effort xhigh. `~/.grok/config.toml` `[models] default` = grok-4.7, `default_reasoning_effort` = high.
- Headless CLIs found on `PATH`: codex 0.160.1, claude 2.1.309, grok 1.0.67. Not run: `not verified here`.

## claude

- Models: opus, fable, sonnet, haiku (low,medium,high,xhigh,max); claude-opus-5, claude-sonnet-5, claude-fable-5, claude-opus-4-8, claude-opus-4-7 (low..max incl. xhigh); claude-opus-4-6, claude-sonnet-4-6 (low,medium,high,max); claude-haiku-4-5-20251001 (no efforts).
- Start from here: `Agent` tool (`model`: sonnet, opus, haiku, fable), or `orca orchestration worker-start --agent claude --model <m> --effort <e>`.
- Choose the model at start: yes.
- Loads this user's MCP servers: types with all tools (`claude`, `general-purpose`, `Explore`, `Plan`) keep them; `claude-code-guide` (Bash, Read, WebFetch, WebSearch) and `statusline-setup` (Read, Edit) do not. An Orca worker: unknown.
- Read-only types: `Explore` and `Plan` (no Edit, Write, NotebookEdit); `claude-code-guide` (no edit tools).
- Confirmed: not verified here: job start skipped by the user for this test.

## codex

- Models: gpt-6.1-sol, gpt-6-sol, gpt-6-astra, gpt-5.6-sol, gpt-5.6-terra (low,medium,high,xhigh,max,ultra); gpt-6-luna, gpt-5.6-luna (low,medium,high,xhigh,max).
- Start from here: `orca orchestration worker-start --agent codex --model <m> --effort <e>`, or `codex exec ... < /dev/null`.
- Choose the model at start: yes.
- Loads this user's MCP servers: no (a worker loads only its own agent's MCP configuration).
- Read-only types: none enforced. Say so in the brief, use `--worktree current`, check `git status`.
- Confirmed: not verified here: job start skipped by the user for this test.

## grok

- Models: grok-4.7, grok-4.7-build-fast, grok-4.6 (low,medium,high,xhigh); grok-4.5 (low,medium,high).
- Start from here: `orca orchestration worker-start --agent grok` (no model or effort flags), or `grok -p "<brief>" -m <model> --reasoning-effort <level>`.
- Choose the model at start: no under Orca. The model is `[models] default` in `~/.grok/config.toml`, currently grok-4.7. Direct `grok -p` takes `-m`.
- Loads this user's MCP servers: no.
- Read-only types: none enforced. Say so in the brief, use `--worktree current`, check `git status`.
- Confirmed: not verified here: job start skipped by the user for this test. The model that runs under Orca is read from the session record's `current_model_id`.
