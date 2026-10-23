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
| The `pstack-models.mdc` always-applied rule | The `select-model` skill that `/setup-pstack` generates at `~/.agents/skills/select-model/`. Skills read it by that path at the start of a task and decide the model themselves. Do not rely on a rules directory: Orca's Claude profile does not link `rules/`, and Codex has no auto-load. | setup-pstack, select-model |
| Run another pstack skill with `/name` | "Run the **name** skill by reading its `SKILL.md` next to this one." | setup-pstack |
| `Task`, `subagent_type`, and Cursor model slugs in a spawn step | Read `select-model`, then decide the model and the way to use it. Same agent as you: your own subagent tool. Another agent: an Orca worker when Orca is available, otherwise your own model plus one line saying so. A preference to follow the session: your subagent tool with the model unset. | poteto-mode |
| Starting an agent with a model flag | Orca refuses `--model` and `--effort` for Grok (`Agent grok does not support launch-time model selection`). Start it with `--agent grok` alone and report the model that ran, taken from the Grok session record. | poteto-mode |
| `Open a todolist` | A todo list with your plan tool (`TodoWrite` in Claude Code, `update_plan` in Codex), or the list in your reply when you have none. | poteto-mode |
| Wording that belongs to skills not yet rewritten | Keep it inside `<!-- transition:start -->` and `<!-- transition:end -->`. The lint skips that block. Delete the block when the last skill it covers is rewritten. | poteto-mode |
| A spawn step repeated in every cross-model skill (`Task` fields, model slugs, fallbacks for a rejected slug) | One sentence: "Read `select-model` and choose each seat's model from it. Start every seat as the Subagents section of `../poteto-mode/SKILL.md` says." The skill keeps a seat table (kind, needs, count and diversity) and names no model. A missing `select-model` and a rejected id are handled once, in the Subagents section. | arena, how, swarm, interrogate, reflect, why |
| `environment: "cloud"` workers, `cloud_base_branch` | Workers start on this machine, in the background when the subagent tool can. A worker that writes gets its own worktree, ports, and temp paths. A worker that verifies a commit uses its own checkout of the SHA. A worker that must start from another branch gets the branch name in its brief. | swarm |
| "Use `readonly: false`, because readonly strips MCPs" | Pick an agent type that keeps your MCP tools, because some read-only agent types drop them, and tell the seat not to edit files. A seat that needs your MCP servers stays on your own harness (see the Subagents section). | reflect, why |
| The `agent-transcripts/` directory the system prompt names | One table of where each agent keeps this workspace's transcripts. Claude Code: `<config dir>/projects/<workspace folder>/*.jsonl`. Codex: `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl`, filtered on `payload.cwd`. Grok: `~/.grok/sessions/<URL-encoded workspace path>/<session>/chat_history.jsonl`. Match the opening user prompt. | reflect |
| `create-skill`, and the routing token `new skill via create-skill:` | The harness's skill-authoring skill (`skill-creator` in Claude Code, `$skill-creator` in Codex), or the Authoring a skill playbook when there is none. The token is `new skill: <name>`. | reflect |
| Listing MCPs from the `mcps/` directory | The tool list, or `claude mcp list`, `codex mcp list`, `grok mcp list`. | why |
| Tool names in a prompt (`Read, Grep, Glob`) | "your file-reading and search tools" | how, interrogate |
| A reviewer label with a model slug | `<agent> <model> <effort>` | interrogate |
| A skill that runs other bundled skills | One line near the top: bundled skills live at `../<name>/SKILL.md` and are run by reading that file. | architect |
| A model the session cannot reach | Keep the entry as written and mark it `not reachable here`. Offer one bulk choice, `inherit-parent`, instead of a per-role replacement. Outside Orca the role runs on the session's own model. | setup-pstack |

## Units

| # | Unit | Status | How it was checked |
| --- | --- | --- | --- |
| 1 | `setup-pstack` | Done, checked by the author | See below |
| 2 | `poteto-mode` body | Done, checked by the author | See below |
| 2b | `agents/` | Deferred, low priority | |
| 3 | Cross-model skills: arena, swarm, interrogate, reflect, architect, how, why | Done, checked by the author | See below |
| 3b | The same skills, `poteto-help`, `orca-harness`, the setup guide, and the Claude Code adapter, moved from role lines to `select-model` | Done, checked by the author | See Unit 3b checks |
| 4 | Playbooks, by remaining Cursor rows: orchestrate 33, multi-phase-plan 28, autopilot-full 12, babysit 10, opening-a-pr 8, worktree-cleanup 8, shipping 7, session-pickup 6 | Next | |
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
| E4 | Codex, Orca terminal | Pass. It also tried to read a role-table file on its own, which no skill names any more. |
| S1 | Claude Code, Orca chat, role `how explorer` (Grok) | Pass in substance. Orca refused `--model grok-4.7 --effort medium`. That became a rule (see above). |
| S1b | Same, after the rule | Pass. One `worker-start --agent grok --worktree current`, no refused call, and the answer states the model that ran. |
| S2 | Claude Code, no Orca, role `how explorer` (Grok) | Pass. A read-only `Explore` agent on its own model, and the answer says Orca was missing. |
| S3 | Claude Code, Orca chat, role `how explainer` (Claude) | Pass. A native subagent, no Orca worker. |
| S4 | Codex, Orca terminal, role `how explorer` (Grok) | Pass. An Orca worker with `--agent grok` only, and the answer states the model that ran. |

Facts these runs settled:

- Orca refuses model and effort flags for Grok. A Grok worker runs the model in `~/.grok/config.toml`, and `worker-show` reports `launch.effective` as null. The model that ran appears only in the Grok session record. In these runs it was `grok-4.7` at `medium`, not the `grok-4.7-build-fast xhigh` on the role line.
- The "match the model to the job" rule works as written. The agents lowered effort to `medium` for a trivial read and used the standard model id instead of the fast one.

### Unit 3 checks

Each run used a model file with the default roles, a two-file toy project, and a prompt that asks for the skill on a small read-only task. Where a run would be costly or unsafe (`why`, `architect`), the prompt asked for the plan table only. The checker lists every tool call, then judges the mechanical facts: which files were read, which native subagents and Orca workers started and with which flags, and whether any repo file changed.

| Run | Skill | Environment | Result |
| --- | --- | --- | --- |
| U3-1 | `how`, complex path | Claude Code, Orca chat | Pass. Read the Subagents section. Two Grok explorers as Orca workers without model flags. The explainer ran as a native read-only `Explore` agent on `opus`. The answer names the model that ran (`grok-4.7`). |
| U3-2 | `how`, complex path | Claude Code, every `ORCA_*` variable unset, no `orca` on `PATH`, the real `~/.claude` config | Pass. The explorers ran on its own model as read-only subagents, and the answer says why. |
| U3-3 | `how`, complex path | Codex, Orca terminal | Pass. Grok explorers as Orca workers (`--agent grok`). The Claude explainer as an Orca worker (`--agent claude --model opus --effort medium`). |
| U3-4 | `swarm`, two slices | Claude Code, Orca chat | Pass. Two Grok Orca workers, read-only, one report with `PASS` and `ISSUES`. |
| U3-5 | `interrogate` | Claude Code, Orca chat | Pass. Reviewer A as a native read-only `Explore` agent on `opus xhigh`. Reviewer B as a Grok Orca worker. The Reviewers section prints `claude opus xhigh` and names the Grok model that ran. |
| U3-6 | `arena`, two default runners | Claude Code, Orca chat | Pass. Runner A native, runner B and the read-only judge as Grok Orca workers (the judge's agent differs from its own, as the skill asks). The repo hashes were unchanged. |
| U3-7 | `reflect`, steps 1 to 3 | Claude Code, Orca chat | Pass. Picked its own transcript among parallel sessions by the opening prompt. Two native reviewers and the synthesizer, and a Grok Orca worker for the tooling lens. |
| U3-8 | `why`, plan only | Claude Code, Orca chat | Pass. The source control seat goes to a Grok Orca worker. The four MCP seats stay on its own harness and the reply says that costs diversity. Categories with no MCP are named as gaps. |
| U3-9 | `architect`, plan only | Claude Code, Orca chat | Pass. Names the bundled skills it reads, splits the runners into a native Claude seat and a Grok Orca worker, and puts the cross-judge on a read-only Grok worker. |
| U3-10 | `reflect`, step 1 only | Codex, Orca terminal | Pass. Found its own rollout file through `$CODEX_HOME` and the workspace path. |

Facts these runs settled:

- The seven skills carry no Orca pointer now. Every run that needed an Orca worker reached the Workers section through the Subagents section of `poteto-mode`. None failed for lack of the pointer.
- A skill that runs on its own, without `poteto-mode` loaded, still reads the Subagents section first. All ten runs did.
- The native runner and the Orca runner of `arena` started in the same message, so the fan-out is concurrent.
- Models lower the effort for small jobs by the "match the model to the job" rule, such as `opus xhigh` to `high` or `medium`, and say so.

### Unit 3b checks

`select-model` replaced the role table (see [`select-model-design.md`](./select-model-design.md)). Each skill now reads it by path and states a seat table. The runs used the sample `select-model` the generator's author left for tests (Claude, Codex, and Grok, Orca present), installed at `~/.agents/skills/select-model/` for the runs and removed afterwards. The prompts asked for the skill on a small read-only task. For `why` and `architect` the prompt asked for the seat plan only.

| Run | Skill | Environment | Result |
| --- | --- | --- | --- |
| V1 | `how`, complex path | Claude Code, Orca chat | Pass. Read `select-model` before `poteto-mode`. Two Grok explorers as Orca workers without model flags. The explainer was a native read-only `Explore` on `opus xhigh`. The answer names the model that ran. |
| V2 | `swarm`, two slices | Claude Code, Orca chat | Pass. Two Grok Orca workers, read-only, one report with `PASS` and `ISSUES`. The tree stayed clean. |
| V3 | `interrogate` | Claude Code, Orca chat | Pass. Reviewer A a native `Explore` on the session model, Reviewer B a Codex Orca worker. The reply says the second reviewer was added so the panel spans two vendors. |
| V4 | `arena` | Claude Code, Orca chat | Pass. One runner a Grok Orca worker, the other a native `opus`, started in the same message. The cross-judge was a Codex worker, outside the parent's vendor, started after both finished. Repo hashes unchanged. |
| V5 | `reflect`, steps 1 to 3 | Claude Code, Orca chat | Pass on the seats. Four native subagents, none on a worker, because every seat needs MCP. The run stopped after starting the synthesizer, so its output was not collected. |
| V6 | `why`, plan only | Claude Code, Orca chat | Pass. Source control went to a Grok Orca worker. Each MCP seat and the synthesizer stayed on its own harness. A category with no matching MCP is marked as a gap. |
| V7 | `architect`, plan only | Claude Code, Orca chat | Pass. Runner 1 native, runner 2 a Codex Orca worker, the cross-judge a read-only Codex worker that starts after both runners finish. |
| V8 | `how`, complex path | Codex, Orca terminal | Pass. Grok explorers as Orca workers (`--agent grok` only), the explainer as an Orca worker (`--agent claude --model opus --effort high`). It also tried to `cat` a retired role-table file that nothing names. |
| V9 | `arena`, plan only, no `select-model` | Claude Code, Orca chat | Pass. It said once that no `select-model` exists and gave the `/setup-pstack` line. It started from the `poteto-mode` defaults, split the runners across two vendors, and put the cross-judge outside its own vendor. |

Facts these runs settled:

- Every skill read `select-model` first, and no run read a role table. In V9 the read failed, the model searched `~/.agents`, `~/.claude`, and `~/.codex` for it, and then took the `poteto-mode` fallback.
- The seat tables carried the rules the role lines used to hide: runner and reviewer diversity, the judge outside the parent's vendor, MCP seats staying home, and the judge starting after the candidates finish.
- A seat table with no model names left the choice to `select-model`. With the sample's preferences, reading and exploring went to Grok, judgment to Claude, and a second vendor to Codex.

### Not yet checked (for the maintainer)


- Claude Code started from a terminal that Orca did not create. Run U3-2 used the real `~/.claude` config with no `ORCA_*` variable and no `orca` on `PATH`, but Orca opened the terminal.
- A machine that has the `orca` binary on `PATH` but runs Claude Code or Codex outside Orca. The skills treat Orca as available only when `ORCA_CLI_BIN_DIR` or `ORCA_CLI_COMMAND` is set, so such a session runs every role on its own model. Whether `orca status` should also count is the maintainer's call.
- Codex started from a plain terminal, outside Orca, using the real `~/.codex` config with its plugins and hooks.
- Codex's plain-text question flow. Run C gave the answers in the prompt, so no question was asked.
- Grok started on its own, outside Orca.
- Same-vendor spawn in Codex (`select-model` preferring a Codex model), and a Codex session with no Orca at all.
- The playbooks that `poteto-mode` routes to still contain Cursor wording. The unit 2 and unit 3 runs stop before any of them is followed.
- `why` and `architect` were checked as plans only. A full `why` run needs authenticated MCP servers, and a full `architect` run chains `how`, `arena`, and `interrogate`.
- Codex running `arena`, `swarm`, `interrogate`, or `why`. Codex ran `how` and the first step of `reflect`. The spawn routing they share is the same text.
- The synthesizer of `reflect` with the new seat table. V5 stopped after starting it.
- A `select-model` generated from the user's real answers. The runs used the sample the generator's author wrote.
