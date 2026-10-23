# Grok

## Tools

- **Subagents.** `spawn_subagent` (unverified, Grok has not run as a parent here). Read its schema.
- **Questions.** Numbered options in the reply.
- **Skills.** `~/.grok/skills/`, where the `skills` CLI links each skill as `<name> -> ../../.agents/skills/<name>`.

## Files

- Instructions: `AGENTS.md`.
- Transcripts: `~/.grok/sessions/<URL-encoded cwd>/<session>/chat_history.jsonl`. `summary.json` in the same folder has `current_model_id` and `reasoning_effort`.

## The model: Orca decides it, the CLI does not

Started by Orca, Grok runs `[models] default` in `~/.grok/config.toml`, because Orca refuses `--model` and `--effort` for it (see `orca-workers.md`). Started directly, `grok -p "<brief>" -m <model> --reasoning-effort <level>` takes both, and the output's `modelUsage` names the model that ran (seen with `grok-4.7-build-fast`). So the model a preference names can be honored by starting Grok through its CLI (see `cli-workers.md`) and not through Orca.

Under Orca the effort is not settled: on one computer `default_reasoning_effort` was `high` and the session record said `medium`. Read the model and the effort from `summary.json` and say them in your reply.

## Limits

- Grok running on its own, outside Orca, has not been run for this fork.
