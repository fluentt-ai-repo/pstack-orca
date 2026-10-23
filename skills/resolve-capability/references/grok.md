# Grok

## Tools

- **Subagents.** `spawn_subagent` (unverified, Grok has not run as a parent here). Read its schema.
- **Questions.** Numbered options in the reply.
- **Skills.** `~/.grok/skills/`, where the `skills` CLI links each skill as `<name> -> ../../.agents/skills/<name>`.

## Files

- Instructions: `AGENTS.md`.
- Transcripts: `~/.grok/sessions/<URL-encoded cwd>/<session>/chat_history.jsonl`. `summary.json` in the same folder has `current_model_id` and `reasoning_effort`.

## The model comes from config

Grok runs `[models] default` in `~/.grok/config.toml`. Orca refuses `--model` and `--effort` for it (see `orca-workers.md`). The effort is not settled: on one computer `default_reasoning_effort` was `high` and the session record said `medium`. Read the model and the effort from `summary.json` and say them in your reply.

## Limits

- Grok running on its own, outside Orca, has not been run for this fork.
