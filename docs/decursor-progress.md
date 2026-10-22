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
| `Task`, `subagent_type`, and Cursor model slugs in a spawn step | Read the role's line in `~/.agents/pstack-models.md`. Same agent as you: your own subagent tool. Another agent: an Orca worker when Orca is available, otherwise your own model plus one line saying so. `inherit-parent` or `auto`: your subagent tool with the model unset. | poteto-mode |
| Starting an agent with a model flag | Orca refuses `--model` and `--effort` for Grok (`Agent grok does not support launch-time model selection`). Start it with `--agent grok` alone and report the model that ran, taken from the Grok session record. | poteto-mode |
| `Open a todolist` | A todo list with your plan tool (`TodoWrite` in Claude Code, `update_plan` in Codex), or the list in your reply when you have none. | poteto-mode |
| Wording that belongs to skills not yet rewritten | Keep it inside `<!-- transition:start -->` and `<!-- transition:end -->`. The lint skips that block. Delete the block when the last skill it covers is rewritten. | poteto-mode |
| A model the session cannot reach | Keep the entry as written and mark it `not reachable here`. Offer one bulk choice, `inherit-parent`, instead of a per-role replacement. Outside Orca the role runs on the session's own model. | setup-pstack |

## Units

| # | Unit | Status | How it was checked |
| --- | --- | --- | --- |
| 1 | `setup-pstack` | Done, checked by the author | See below |
| 2 | `poteto-mode` body | Done, checked by the author | See below |
| 2b | `agents/` | Deferred, low priority | |
| 3 | Cross-model skills: arena, swarm, interrogate, reflect, architect, how, why | Next | |
| 4 | Playbooks, by remaining Cursor rows: orchestrate 33, multi-phase-plan 28, autopilot-full 12, babysit 10, opening-a-pr 8, worktree-cleanup 8, shipping 7, session-pickup 6 | | |
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

### Unit 2 checks

The entry check asks for `/poteto-mode` (`$poteto-mode` in Codex) on a read-only question and expects the playbook to be chosen, its steps copied word for word, and nothing started. The spawn check asks for one read-only subagent for a named role and reads which tool started it.

| Run | Environment | Result |
| --- | --- | --- |
| E1 | Claude Code, Orca chat | Pass. 4 of 4 steps, `orca-harness` not read. |
| E2 | Claude Code, Orca terminal | Pass. |
| E3 | Claude Code, every `ORCA_*` variable unset | Pass. |
| E4 | Codex, Orca terminal | Pass. It also tried to read `~/.agents/pstack-models.md` on its own. |
| S1 | Claude Code, Orca chat, role `how explorer` (Grok) | Pass in substance. Orca refused `--model grok-4.7 --effort medium`. That became a rule (see above). |
| S1b | Same, after the rule | Pass. One `worker-start --agent grok --worktree current`, no refused call, and the answer states the model that ran. |
| S2 | Claude Code, no Orca, role `how explorer` (Grok) | Pass. A read-only `Explore` agent on its own model, and the answer says Orca was missing. |
| S3 | Claude Code, Orca chat, role `how explainer` (Claude) | Pass. A native subagent, no Orca worker. |
| S4 | Codex, Orca terminal, role `how explorer` (Grok) | Pass. An Orca worker with `--agent grok` only, and the answer states the model that ran. |

Facts these runs settled:

- Orca refuses model and effort flags for Grok. A Grok worker runs the model in `~/.grok/config.toml`, and `worker-show` reports `launch.effective` as null. The model that ran appears only in the Grok session record. In these runs it was `grok-4.7` at `medium`, not the `grok-4.7-build-fast xhigh` on the role line.
- The "match the model to the job" rule works as written. The agents lowered effort to `medium` for a trivial read and used the standard model id instead of the fast one.

### Not yet checked (for the maintainer)

- Claude Code started from a plain terminal, outside Orca, using the real `~/.claude` config. The runs above remove the `ORCA_*` variables but still use Orca's Claude profile.
- Codex started from a plain terminal, outside Orca, using the real `~/.codex` config with its plugins and hooks.
- Codex's plain-text question flow. Run C gave the answers in the prompt, so no question was asked.
- Grok started on its own, outside Orca.
- Same-vendor spawn in Codex (a role line naming `codex`), and a Codex session with no Orca at all.
- The playbooks that `poteto-mode` routes to still contain Cursor wording. The unit 2 runs stop before any of them is followed.
