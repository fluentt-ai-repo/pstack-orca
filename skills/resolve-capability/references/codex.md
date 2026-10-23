# Codex

## Tools

- **Subagents.** `spawn_agent` (unverified). Read its schema for the models and efforts it accepts.
- **Questions.** Numbered options in the reply.
- **Plan.** `update_plan` (unverified).
- **Waiting.** Under Orca, `orca orchestration check --wait --timeout-ms 45000`, repeated in the same exec session until the event arrives. This was seen in a real run.
- **Skills.** `$name` runs a skill. `$skill-creator` writes one. Codex reads `~/.agents/skills/` and the project's `.agents/skills/` directly, so a skill there needs no link.

## Files

- Instructions: `AGENTS.md`.
- Transcripts: `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl`, filtered on `payload.cwd`. Tool calls are `function_call` and `custom_tool_call` items. Under Orca, `CODEX_HOME` is Orca's account home: `~/Library/Application Support/orca/codex-accounts/<id>/home/`, not `~/.codex`. `history.jsonl` in that folder is not a rollout.
- Models: `models_cache.json` in the same home.

## Limits

- `spawn_agent` takes only Codex models. Another vendor's model needs `spawn-worker`.
- Codex may ignore `disable-model-invocation`, so a slash-only skill can trigger on its own (unverified).
- Codex running its own subagents, and Codex with no Orca at all, have not been run for this fork.
