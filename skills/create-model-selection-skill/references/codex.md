# Codex

## Your own subagents

The subagent tool is `spawn_agent`. Read its schema for the models and efforts it accepts. If you cannot tell, ask the user to paste the model names.

## Models

`~/.codex/models_cache.json` lists them: `models[].slug`, `display_name`, `supported_reasoning_levels`, and `default_reasoning_level`. `visibility` marks a model that is hidden from the picker. When Orca is here, its catalog lists Codex models too, under `discovered`. Codex has no `live` list.

## Usage

Each Codex session log under `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` carries a `rate_limits` record: `primary.used_percent`, `primary.window_minutes`, `primary.resets_at`, and `credits`. It is the value at the end of a turn in an earlier session, so it can be hours or days old. Use it as a hint, never as the reason to pick a model. A limit shows up as an error when a start fails, so handle it then.

## Not yet checked

A Codex session with no Orca, and Codex starting its own models with `spawn_agent`, were not run. Say `not verified here` for them.

## Transcripts

`$CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl`, filtered on `payload.cwd`.
