# Inventory

Confirmed 2026-10-23 from Claude Code 2.1.309. Orca: yes, 1.4.237. This is a snapshot. Recheck what you use.

## Environment

- Harness the survey ran in: Claude Code 2.1.309, started by Orca (`ORCA_AGENT_SESSION_ID` is set), model `claude-sonnet-5-5`.
- Orca is here: `ORCA_CLI_COMMAND=/Applications/Orca.app/Contents/Resources/bin/orca`, data in `$ORCA_USER_DATA_PATH/agent-model-catalog.json`.
- Not a plain terminal.
- Pins found before this setup: `~/.claude/settings.json` `model = "opus"`; `~/.codex/config.toml` `model = "gpt-6.1-sol"` at `xhigh`; `~/.grok/config.toml` `[models] default = "grok-4.7"` at `high`. No `~/.agents/pstack-models.md`. The project `.claude/settings.json` pins no model.

## claude

- Models: `opus`, `sonnet`, `fable`, `haiku` (low, medium, high, xhigh, max each). Orca also lists full ids: `claude-opus-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-fable-5`, `claude-sonnet-5` (low, medium, high, xhigh, max); `claude-opus-4-6`, `claude-sonnet-4-6` (low, medium, high, max); `claude-haiku-4-5-20251001` (no effort list).
- Start from here: the `Agent` tool (`model`: `sonnet`, `opus`, `haiku`, `fable`; `effort`: `low`, `medium`, `high`, `xhigh`, `max`), or `orca orchestration worker-start --agent claude --model <model> --effort <effort>`.
- Choose the model at start: yes, both ways. An Orca `--effort` needs `--model`.
- Loads this user's MCP servers: yes for a subagent of this session. An Orca Claude worker loads Claude's own MCP configuration; unknown whether it matches this session's.
- Read-only types, from the `Agent` schema: `Explore` and `Plan` ("All tools except Agent, Artifact, ExitPlanMode, Edit, Write, NotebookEdit"). Their lists exclude no MCP tools, so they keep them; not tested. `general-purpose` and `claude` have `*`. `statusline-setup` has only `Read`, `Edit`.
- Confirmed: 2026-10-23. An `Explore` subagent started with `model: opus`, `effort: low` answered "Opus 5.5 (`claude-opus-5-5`)" and said its effort was "5", a value the `Agent` schema does not list; treat the effort as requested, not confirmed. No file was edited. Only `opus` through the `Agent` tool was started; the other models and the Orca Claude worker were not.

## grok

- Models: `grok-4.7-build-fast`, `grok-4.7`, `grok-4.6` (low, medium, high, xhigh each); `grok-4.5` (low, medium, high).
- Start from here: `orca orchestration worker-start --agent grok`, with no `--model` and no `--effort`.
- Choose the model at start: no. The model is `[models] default` in `~/.grok/config.toml` (`grok-4.7` today). The file also sets `default_reasoning_effort = "high"`, but the worker's session record showed `medium` (see Confirmed), so do not count on the file to set the effort. To run `grok-4.7-build-fast`, edit `[models] default`.
- Loads this user's MCP servers: no. A worker loads only Grok's own MCP configuration.
- Read-only types: none. Orca does not enforce read-only; say so in the brief and use `--worktree current`.
- Confirmed: 2026-10-23. `worker-start --agent grok` started (`launch.effective` null, as expected). The session record `~/.grok/sessions/%2FUsers%2Ffluentt%2FDocuments%2Fpstack-testbed/01a16718-3fa7-7dd1-b45d-2ab65c107b36/summary.json` says `current_model_id: grok-4.7`, `reasoning_effort: medium`. So this computer gets `grok-4.7`, not `grok-4.7-build-fast`. The worker itself said only "Grok 4.7" and named no effort. No file was edited.

## codex

- Models: `gpt-6.1-sol`, `gpt-6-sol`, `gpt-6-astra`, `gpt-5.6-sol`, `gpt-5.6-terra` (low, medium, high, xhigh, max, ultra); `gpt-6-luna`, `gpt-5.6-luna` (low, medium, high, xhigh, max). `~/.codex/models_cache.json` also lists `gpt-reserve` and `codex-auto-review`, both hidden from the picker and absent from Orca's catalog.
- Start from here: `orca orchestration worker-start --agent codex --model <model> --effort <effort>`.
- Choose the model at start: yes. `--effort` needs `--model`.
- Loads this user's MCP servers: no. A worker loads only Codex's own MCP configuration.
- Read-only types: none. Orca does not enforce read-only; say so in the brief and use `--worktree current`.
- Confirmed: 2026-10-23. `worker-start --agent codex --model gpt-6-luna --effort low` started; `launch.effective` was `gpt-6-luna` at `low`, and the worker's report quotes the same from `worker-show`. No file was edited. Only `gpt-6-luna` was started; the other Codex models are listed by Orca's catalog and were not started.
