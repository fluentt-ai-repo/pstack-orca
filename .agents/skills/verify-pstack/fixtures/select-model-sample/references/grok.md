<!-- from pstack unknown (no plugin.json found), overwritten on update -->
# Grok

## The model comes from config

Started by Orca, Grok runs the model named by `[models] default` in `~/.grok/config.toml`. To change the model an Orca Grok worker runs, edit that key. A model or effort named in a brief does not change it. Started directly, `grok -p "<brief>" -m <model> --reasoning-effort <level>` takes both, and its JSON output's `modelUsage` names the model that ran. The effort is not settled: on one computer `default_reasoning_effort` was `high` and the worker's session record said `medium`. Read the effort from the session record, and do not promise the file's value.

Orca refuses `--model` and `--effort` for Grok (see `orca.md`). Start an Orca Grok worker with `--agent grok` alone, or run Grok's own CLI to choose the model.

## Models

`~/.grok/models_cache.json` has a `models` object keyed by model id. Each entry's `info.reasoning_efforts` lists its efforts. When Orca is here, its catalog lists the same ids under `live`.

## Which model ran

Orca cannot tell you (`launch.effective` is null). Read `current_model_id` in `~/.grok/sessions/<URL-encoded workspace path>/<session>/summary.json` and say it in your reply.

## Your own subagents

When you are running in Grok, the subagent tool is `spawn_subagent`. Read its schema for the models it accepts. This was not run for this fork. Say `not verified here`.

## Transcripts

`~/.grok/sessions/<URL-encoded workspace path>/<session>/chat_history.jsonl`.

## Skill folder

`~/.grok/skills/`. The `skills` CLI links a skill there as `<name> -> ../../.agents/skills/<name>`.
