<!-- from pstack 0.15.29, overwritten on update -->
# Grok

## The model comes from config

Grok runs the model named by `[models] default` in `~/.grok/config.toml`, at `default_reasoning_effort`. To change what a Grok worker runs, edit those two keys. A model or effort on a role or in a brief does not change it.

Orca refuses `--model` and `--effort` for Grok (see `orca.md`). Start a Grok worker with `--agent grok` alone.

## Models

`~/.grok/models_cache.json` has a `models` object keyed by model id. Each entry's `info.reasoning_efforts` lists its efforts. When Orca is here, its catalog lists the same ids under `live`.

## Which model ran

Orca cannot tell you (`launch.effective` is null). Read `current_model_id` in `~/.grok/sessions/<URL-encoded workspace path>/<session>/summary.json` and say it in your reply.

## Your own subagents

When you are running in Grok, the subagent tool is `spawn_subagent`. Read its schema for the models it accepts. This was not run for this fork. Say `not verified here`.

## Transcripts

`~/.grok/sessions/<URL-encoded workspace path>/<session>/chat_history.jsonl`.
