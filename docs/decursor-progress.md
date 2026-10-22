# De-Cursor progress

This fork is moving from an adapter (`orca-harness` plus a pointer line) to skills that carry no Cursor wording. The target is Claude Code, Codex, and Grok on their own, and Orca on top of them. Orca is where roles that name another agent can run as workers.

Skills listed in [`scripts/rewritten.json`](../scripts/rewritten.json) are done. The mirror audit skips them, they get no Orca pointer, and `node scripts/lint-rewritten.mjs` fails if Cursor wording comes back.

## Rewrite rules

Each rule came from a unit that passed its check. Apply them to every later skill.

| Cursor wording | Write this instead | Learned from |
| --- | --- | --- |
| `AskQuestion` | "Use your question tool if you have one, such as `AskUserQuestion` in Claude Code. Otherwise list numbered options in plain text." | setup-pstack |
| A table or summary the user must see before answering | Put it in the text of the question itself. Some models write their visible-looking explanation into reasoning, and the user then sees only a one-line summary. | setup-pstack |
| Cursor model slugs (`grok-4.7-xhigh-fast`, `claude-opus-5-5-xhigh`) | `<agent> <model> <effort>`, such as `grok grok-4.7-build-fast xhigh` and `claude opus xhigh` | setup-pstack |
| The `pstack-models.mdc` always-applied rule | `~/.agents/pstack-models.md`, which the skill reads at the start of a task. Do not rely on a rules directory: Orca's Claude profile does not link `rules/`, and Codex has no auto-load. | setup-pstack |
| Run another pstack skill with `/name` | "Run the **name** skill by reading its `SKILL.md` next to this one." | setup-pstack |
| A model the session cannot reach | Keep the entry as written and mark it `not reachable here`. Offer one bulk choice, `inherit-parent`, instead of a per-role replacement. Outside Orca the role runs on the session's own model. | setup-pstack |

## Units

| # | Unit | Status | How it was checked |
| --- | --- | --- | --- |
| 1 | `setup-pstack` | Done, checked by the author | See below |
| 2 | `poteto-mode` body and `agents/` | Next | |
| 3 | Cross-model skills: arena, swarm, interrogate, reflect, architect, how, why | | |
| 4 | Orchestrate and multi-phase-plan playbooks | | |
| 5 | Remaining skills, then `docs/guide` and the README | | |

### Unit 1 checks

The output file was validated by a script against the Orca model catalog: no frontmatter, a `# budget` line, all 17 roles, every agent, model, and effort present in the catalog, and the efforts recomputed from the budget.

| Run | Environment | Result |
| --- | --- | --- |
| A | Claude Code in an Orca chat, answers given in the prompt, budget `large` | Pass. Matches the defaults. |
| B | Claude Code in an Orca terminal, answers given through the question UI, budget `medium` | Pass. All 21 entries went to `high`. |
| B2 | Claude Code with every `ORCA_*` variable unset and Orca off `PATH` | Pass after two fixes. Grok defaults are kept and marked `not reachable here`. |
| D | Same as B2, re-run on an existing file, `unlimited`, bulk `inherit-parent` | Pass. Claude entries went to `max`, Grok stayed at `xhigh` before becoming `inherit-parent`, and panel lists kept their length. |
| C | Codex in an Orca terminal, `$setup-pstack`, budget `large` | Pass. The file is identical to run A. |
| A2 | Claude Code in an Orca chat, after the fixes, budget `small` | Pass. |

Two defects were found and fixed along the way: the confirmation question referred to a table the user never saw, and defaults that the session could not reach were treated as "needs a choice", which pushed the user to replace them.

### Not yet checked (for the maintainer)

- Claude Code started from a plain terminal, outside Orca, using the real `~/.claude` config. The runs above remove the `ORCA_*` variables but still use Orca's Claude profile.
- Codex started from a plain terminal, outside Orca, using the real `~/.codex` config with its plugins and hooks.
- Codex's plain-text question flow. Run C gave the answers in the prompt, so no question was asked.
- Grok.
