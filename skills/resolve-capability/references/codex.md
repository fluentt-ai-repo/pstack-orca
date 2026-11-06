# Codex

## Tools

- **Subagents.** `spawn_agent` (unverified). Read its schema for the models and efforts it accepts.
- **Questions.** Numbered options in the reply.
- **Plan.** `update_plan` was not in the instructions of the Codex build seen here (0.160.1), and the Codex app showed no plan list. Keep the list in the reply.
- **Waiting.** Under Orca, `orca orchestration check --wait --timeout-ms 45000`, repeated in the same exec session until the event arrives. This was seen in a real run.
- **Headless run.** `codex exec` runs one brief and exits. `-o <file>` writes the last message, `-s` sets the sandbox, `-m` the model, and `-c model_reasoning_effort=<level>` the effort. This ran. End the command with `< /dev/null`: with stdin open and not a terminal (a background shell, a pipe), it prints `Reading additional input from stdin...` and waits for EOF forever (see `cli-workers.md`).
- **Sessions.** `codex agents` browses the sessions on the shared local app-server daemon, `codex queue --thread <id> --message <text>` queues a message for an existing session, and `codex resume`, `fork`, `archive` work on saved ones. Their help text was read, and they were not run. `codex app` continues in the ChatGPT desktop app. The desktop app also has scheduled tasks and worktrees (documented, not run).
- **Skills.** `$name` runs a skill. `$skill-creator` writes one. Codex reads `~/.agents/skills/` and the project's `.agents/skills/` directly, so a skill there needs no link.

## Files

- Instructions: `AGENTS.md`.
- Transcripts: `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl`, filtered on `payload.cwd`. Tool calls are `function_call` and `custom_tool_call` items. Under Orca, `CODEX_HOME` is Orca's account home: `~/Library/Application Support/orca/codex-accounts/<id>/home/`, not `~/.codex`. `history.jsonl` in that folder is not a rollout.
- Models: `models_cache.json` in the same home.

## Limits

- `spawn_agent` takes only Codex models. Another vendor's model needs `spawn-worker`, which a shell can do without Orca (see `cli-workers.md`).
- Codex may ignore `disable-model-invocation`, so a slash-only skill can trigger on its own (unverified).
- Codex running its own subagents, and Codex with no Orca at all, have not been run for this fork.
