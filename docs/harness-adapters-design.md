# Harness adapters design

Status: proposed on 2026-11-06, not implemented. A two-model review (Claude Opus and Codex `gpt-6.1-sol`, both at xhigh) read the first draft the same day, and this revision answers it. The user approved the revision's choices (see Decisions and Changes from the review). It changes the adapter layer of [`resolve-capability-design.md`](./resolve-capability-design.md) and what [`select-model-design.md`](./select-model-design.md) puts in `select-model`. Until it is implemented, the skills are right where they differ from it.

## Problem

The three-layer design (intent, adapter, this computer) keeps product names out of most skills. Taking one product away shows where they remain. Removing Orca today means editing all of these:

- [`resolve-capability/SKILL.md`](../skills/resolve-capability/SKILL.md). Each index line holds the Claude Code, Codex, Grok, and Orca mechanism for one capability, and section 1 runs Orca's detection.
- The harness reference files in [`resolve-capability/references/`](../skills/resolve-capability/references/). Each one also states what changes under Orca.
- [`poteto-mode/SKILL.md`](../skills/poteto-mode/SKILL.md), [`setup-pstack/SKILL.md`](../skills/setup-pstack/SKILL.md), [`poteto-help/SKILL.md`](../skills/poteto-help/SKILL.md), and the help text of `orch.ts`.
- [`create-model-selection-skill/`](../skills/create-model-selection-skill/), whose own per-product files repeat the adapter for the survey.
- The generated `select-model`. On this computer it holds an Orca worker's flags, `codex exec -s read-only ... < /dev/null`, and a link into `resolve-capability/references/`.
- `verify-pstack`, which starts every driven session through Orca, its plain surface included.
- CI's `check-orca-commands` step, the `orca/` snapshot, the README, MIRROR, `docs/guide/`, and `CURSOR-DEPENDENCIES.md`.

A scan of every tracked file under `skills/`, `.ts` included, finds product names in these places on 2026-11-06. It applies the lint's `NO_PRODUCT` patterns without the `gh` rule, plus `ORCA_`.

| Where | Files | Lines | Of those, lines that name Orca |
| --- | --- | --- | --- |
| `resolve-capability/SKILL.md` | 1 | 25 | 19 |
| `resolve-capability/references/` | 8 | 89 | 54 |
| `create-model-selection-skill/` | 7 | 64 | 43 |
| The rest of `skills/` | 10 | 32 | 11 |

The lint that bans product names covers 9 path prefixes: the seven cross-model skills, the playbooks, and `poteto-mode/references`. It walks no `.ts` file (`lint-rewritten.mjs:52`), so the Orca line in `orch.ts:261` passes unseen.

## Goal

- The core names no agent product, tool, path, or command. A CI check proves it for every tracked file under `skills/` outside the adapters, `.ts` files included.
- Each product has one adapter folder, and all of pstack's knowledge of that product lives there. The one exception is an environment adapter's section on launching harnesses (see Two kinds of adapter).
- Removing a product means deleting its adapter folder. The ownership check proves on every commit that no other file under `skills/` names it, so the deletion leaves nothing stale.
- Adding a harness means adding a folder. It also means editing an environment adapter, but only when that environment launches the new harness under a different id or with a quirk.

## Non-goals

- New capabilities, or a change in what a playbook does.
- Splitting the repository or the install.
- The forge. `gh` is used in every environment and stays in the contract, and the lint's `gh` rule goes (see Checks).
- Skill frontmatter. `disable-model-invocation` stays as written, as the earlier design decided.
- `agents/`. Its files are agent definitions that the `skills` CLI does not install, so they stay outside the check.
- Skill names in prose. Core text writes a skill as `/name`, and that is pstack's own notation. The form a user types in each product comes from the harness adapter's For users section.

## Layers

| Layer | Holds | Names products | Changes when |
| --- | --- | --- | --- |
| 1. Core | `poteto-mode`, the playbooks, the other skills, the bundled scripts | no | the way of working changes |
| 2. Contract | `resolve-capability`: the closed capability vocabulary with each capability's scope, the resolution rules, one fallback per capability, the exact steps and worker rules that hold for every product, and `detect.sh` | no | a capability is added or its fallback changes |
| 3. Adapters | `resolve-capability/adapters/<id>/`, one per product | its own product. An environment adapter also names the harnesses it launches, in one section | that product changes |
| 4. This computer | `select-model`: the inventory, the preferences, and the quirks seen here | as data only | `/setup-pstack` runs |

```text
skills/
	poteto-mode/, arena/, ...          core: capability names only
	resolve-capability/
		SKILL.md                         contract: vocabulary, resolution, fallbacks
		references/                      contract: exact steps, worker rules, the case with no environment
		scripts/detect.sh                prints the environment adapters that apply
		adapters/
			claude-code/adapter.md         harness
			codex/adapter.md               harness
			grok/adapter.md                harness
			orca/adapter.md                environment, with detect.sh and references/
~/.agents/skills/select-model/       this computer
```

The adapters live inside the contract's folder, and they are not skills. Each one is `adapter.md`, not `SKILL.md`, so no product lists it as a skill. The ids match the `skills` CLI's agent ids (`claude-code`, `codex`, `grok`), plus `orca`.

Core files that link to `../resolve-capability/SKILL.md` keep working. 14 links go into `references/` (`grep -rn -o 'resolve-capability/references/[a-z-]*' skills | grep -v '^skills/resolve-capability/'`). 10 point at `exact-steps.md` and 3 at `cli-workers.md`, and both files stay in the contract. The last one, `orchestrate.md:102`, sends the reader to the folder for Orca's reattach steps. That link changes in the phase that moves those steps.

## Two kinds of adapter

A **harness** is the agent a session runs in: Claude Code, Codex, or Grok. A session has exactly one. An **environment** runs on top of harnesses and adds to them, as Orca does. A session has none, one, or several. Each adapter's header says which kind it is.

Text moves line by line, not file by file. A line that states what changes under Orca goes to the Orca adapter, wherever it sits today. The ownership check lists every such line (see Checks). For example, `codex.md`'s waiting line (`orca orchestration check --wait --timeout-ms 45000`) and `grok.md`'s section on how Orca picks Grok's model both go to the Orca adapter.

| Adapter | Kind | Built from |
| --- | --- | --- |
| `claude-code` | harness | `references/claude-code.md`, the Claude Code part of each index line, and the Claude Code rows of `cli-workers.md`, minus every line that names Orca. In phase 3, the generator's `claude-code.md` |
| `codex` | harness | the same sources' Codex parts |
| `grok` | harness | the same sources' Grok parts |
| `orca` | environment | `orca-workers.md`, the Orca parts of `waiting-and-schedules.md` and `exact-steps.md`, and every line in the other references and the index that names Orca. In phase 3, the generator's `orca.md` and its Orca question |

**Launching harnesses.** An environment launches harnesses, so the Orca adapter has to name them. The section stays generic. Orca's catalog (`$ORCA_USER_DATA_PATH/agent-model-catalog.json`) says which agents and flags Orca accepts, and the section reads it at run time. The section itself holds only two things. One is an id map for the harness whose Orca id differs from its adapter id (`claude-code` is Orca's `claude`). The other is the quirks seen in runs, keyed by Orca's id: `grok` refuses `--model` and `--effort`, and `claude` refuses `haiku` with `low`. Adding a harness touches this section only for a new id or a new quirk. Removing a harness leaves its quirk lines behind as data that no longer matches any adapter, and they do no harm until someone deletes them.

The desktop apps (the Claude app's Code tab and the ChatGPT app's Codex) are surfaces of a harness, not environments. Each is a section of its harness's adapter. An app becomes an environment adapter only if it gains something a session can detect that changes many capabilities.

## Adapter shape

```text
resolve-capability/adapters/<id>/
	adapter.md      header and the sections below
	references/     long procedures, read on first use (Orca's worker loop)
	detect.sh       environments only: exits 0 when the environment is here
```

```yaml
---
kind: environment
owns: [orca, ORCA_]
---
```

`kind` is `harness` or `environment`. `owns` lists the tokens that only this adapter may contain (see Checks). Two adapters can own one token, as `codex` and `grok` both own `AGENTS.md`.

The sections, in this order:

1. **Detect.** A harness adapter says what in your own tool list shows that you are this product. An environment adapter has `detect.sh` and writes the same command out in prose (Orca: `env | grep '^ORCA_CLI_'`).
2. **Capabilities.** One heading per capability the product does, named with the capability in backticks, with the mechanism and its verified state. A heading in an environment adapter starts with `Overrides.` or `Adds to.` (see Resolution) and says when the harness's own mechanism still applies.
3. **Start me from outside.** Harnesses only. The headless command another session runs to start this product as a worker, its model and effort flags, its read-only mode, any input it needs, where the answer lands, and where its session record is. `codex exec` needs `< /dev/null`, or it waits on the open stdin.
4. **Launching harnesses.** Environments only, as above.
5. **Surfaces.** Harnesses only. Each desktop app or other surface, and what it adds.
6. **For users.** The install flag (`-a codex`), the product's skills documentation, how a user types a skill (`$name` in Codex), and the product's plan mode. `poteto-help` reads this section from every adapter.
7. **Survey.** What the generator reads to list this product's models and efforts, its skill folder, where a model is pinned, and what the product is suited to (decision 1). An environment adapter adds the questions the generator asks when the environment is here (Orca: whether another vendor's agent may run as a worker).
8. **Exact steps.** Irreversible commands. Each heading matches a heading in the contract's `exact-steps.md`, or starts with `New.` (see Exact steps).
9. **Limits.** What the product cannot do or report: remaining usage, a permission prompt on the first read outside the project, Codex possibly ignoring `disable-model-invocation`.

## Resolution

This procedure replaces section 1 of the contract, "which environment is this".

1. Run `../resolve-capability/scripts/detect.sh` before you plan anything. It runs each environment adapter's `detect.sh` with `sh` and prints the ids that answer yes. Read those adapters. When it prints nothing, no environment is here, so read `references/plain.md`.
2. Read the harness adapter whose Detect matches you. When none matches, you run in a harness pstack has no adapter for. Use the fallbacks and say so once.
3. For each capability, its scope in the contract's vocabulary decides who answers.

| Scope | Capabilities | Who answers |
| --- | --- | --- |
| own harness | `spawn-subagent`, `isolate-checkout`, `run-remote`, `coordinate-workers`, `control-agent`, `wake-on-event`, `run-on-schedule`, `ask-user`, `track-todos`, `author-skill`, `locate`, `list-mcp-servers`, `drive-app` | An environment heading marked `Overrides.` wins, within the conditions it states. A heading marked `Adds to.` runs after your harness's mechanism. Otherwise your harness's heading answers. Otherwise the contract's fallback does. |
| every harness | `find-sessions` | The heading in every harness adapter, for each store that exists on this computer, and then the environment headings by the same markers. |
| target product | `spawn-worker`, and `list-mcp-servers` when the question is which servers a worker gets | The target product's Start me from outside, or an environment's Launching harnesses. Pick the one that accepts the model and effort you were asked for. When both do, prefer the environment, because it supervises the run. When the target has no adapter, run the seat on your own model and say which product would have run it. |
| contract | `choose-model`, `use-forge`, `read-review-bot`, `run-skill`, `durable-store`, `inspect-runtime` | The contract's own mechanism. An environment heading marked `Adds to.` runs after it. |

Today each index line carries its own exceptions. The scopes and the two markers keep them after the split:

- Orca's `ask-user` heading is marked `Overrides.` for a session that runs as an Orca worker. It says to ask with `orca orchestration ask`, because the worker's coordinator cannot answer a question screen.
- Orca's `use-forge` heading is marked `Adds to.`. It runs `orca reference add` after `gh pr create`.
- Orca's `find-sessions` heading is marked `Overrides.` for the Codex store, because under Orca, Codex keeps its sessions in Orca's account home.
- When a preference names a Grok model or effort, the `spawn-worker` rule picks Grok's own CLI even under Orca, because Orca refuses both flags for Grok.

A session reads the contract, its harness adapter, the environment adapters that apply, and, for a capability scoped to every harness or to a target product, the matching heading in other adapters.

## Exact steps

The contract keeps `references/exact-steps.md` with the headings it has today, without product names. A section whose step differs under an environment starts with this sentence: "If an environment adapter that `detect.sh` printed has an exact step with this heading, run that one instead, and never run the form below on anything that environment manages."

The Orca adapter's Exact steps uses the same headings ("Removing a worktree", "Opening a pull request and building a stack"), or starts a heading with `New.` ("New. Orca workers"). A lint checks that every heading matches or is marked. `worktree-cleanup.md` step 5 tells the agent to reread only the "Removing a worktree" section and run it as written. The pointer sits inside that section, so the playbook still reaches `orca worktree rm` under Orca and never runs `git worktree remove` on a worktree Orca manages.

## Facts learned on this computer

Some facts are learned on one computer and recorded only in its `select-model`. One was that `codex exec` waits on the open stdin without `< /dev/null` (`select-model/SKILL.md:15`). PRs #4 and #5 carried that fact into `cli-workers.md` and the generator by hand. Dropping start commands from `select-model` would lose the facts nobody has carried yet, so the migration carries them first.

- Before phase 1 writes the adapters, compare the user's `SKILL.md` and `inventory.md` with the text that moves. A fact that holds beyond this computer goes into its adapter, with the date it was seen. A fact tied to this computer stays.
- `inventory.md` gets a Quirks seen here section. The template's mismatch loop writes there. When a quirk would hold on every computer, the reading model tells the user it belongs in an adapter.
- Preferences hold preferences only. On an update, the generator shows each start command or path it finds in `## Preferences`, proposes moving it to Quirks seen here or dropping it, and changes nothing without the user's yes.
- The user's file links to `../resolve-capability/references/orca-workers.md` (`select-model/SKILL.md:36`), and so does every file the current template generates. Phase 1 leaves a stub at that path that points to the Orca adapter. Phase 3 deletes the stub after the user regenerates `select-model`.

## What moves where

The Phase column says which phase owns each source. The ownership check's report lists the lines for each phase. Run it before a phase to get the work and after it to prove the phase.

| Source | Destination | Phase |
| --- | --- | --- |
| `resolve-capability/SKILL.md` section 1 | the contract's resolution procedure, `scripts/detect.sh`, and each adapter's Detect | 1 |
| Each index line's per-product mechanism | that product's adapter, under the capability's heading. A line that names Orca goes to the Orca adapter | 1 |
| Each index line's `None: ...` | the contract, as that capability's fallback | 1 |
| `references/claude-code.md`, `codex.md`, `grok.md` | the harness adapters, minus the lines that name Orca, which go to the Orca adapter | 1 |
| `references/orca-workers.md` | `adapters/orca/references/workers.md`, with a stub at the old path until phase 3 | 1 |
| `references/cli-workers.md` | each row to its harness's Start me from outside. The rules stay. Its Orca lines go to the Orca adapter | 1 |
| `references/waiting-and-schedules.md` | the Orca and Claude Code parts to their adapters. The bounded-loop fallback stays | 1 |
| `references/exact-steps.md` | stays, with the pointer sentence. Orca's steps go to the Orca adapter under the same headings | 1 |
| `references/plain.md` | stays in the contract | 1 |
| `poteto-mode/playbooks/orchestrate.md:102` | points at the reattach step through the resolution procedure, in the same phase as the step's move | 1 |
| `.agents/skills/verify-pstack/features/spawn.md:7` | the new path of the Orca worker reference | 1 |
| `poteto-mode/SKILL.md` lines 93 and 100, "run `env \| grep '^ORCA_CLI_'`" | "run `../resolve-capability/scripts/detect.sh` before any plan", kept as a literal command | 2 |
| `poteto-mode/SKILL.md` lines 26, 95, 103, 113, and 139 | `author-skill`, decision 1, "a harness or an environment rejects the model", a model id taken from `select-model`, and `track-todos` | 2 |
| `setup-pstack/SKILL.md` lines 8, 24, and 26 | the Orca adapter's Launching harnesses. `setup-pstack` names no product | 2 |
| `ketchup`, `create-verification-skill`, `create-formal-verification-skill`, `maintain-verification-skill` | `run-skill` and `locate`, with `/name` as pstack's notation | 2 |
| `poteto-help/SKILL.md` and `poteto-help/references/prompting.md` | the adapters' For users sections, which `poteto-help` reads. No exempt block | 2 |
| `poteto-mode/scripts/worktree-audit.sh` | decision 2 | 2 |
| `poteto-mode/scripts/orch/orch.ts:261` | help text that names `coordinate-workers` | 2 |
| The generator's `references/claude-code.md`, `codex.md`, `grok.md`, `orca.md` | the adapters' Survey sections. Then the files are deleted | 3 |
| The generator's `references/plain-terminal.md` | merged into the contract's `plain.md` | 3 |
| The generator's `references/unknown-product.md` | records "no adapter" in `inventory.md` and offers to write an adapter from the contract's adapter template. It no longer writes `select-model/references/` | 3 |
| The generator's `SKILL.md` and `select-model-template.md` | the Survey and its questions from each adapter. Step 5's `codex exec` stdin rule goes to the Codex adapter's Start me from outside. The template lists the ways to start workers from the adapters, keeps Preferences to preferences, and adds Quirks seen here | 3 |
| The user's `~/.agents/skills/select-model` | regenerated with the user, then the stub goes | 3 |
| The README, MIRROR, `docs/guide/` (page 9 describes the single adapter), `CURSOR-DEPENDENCIES.md:3`, and the status lines of the two earlier design docs | the new layout | 5 |

## Checks

`scripts/lint-rewritten.mjs` changes, and `scripts/check-ownership.mjs` is added. Both walk `git ls-files`, not the folder, so `.ts` files count and an installed `node_modules` does not.

- **Ownership.** Each adapter's `owns` tokens may appear under `skills/` only inside that adapter, or inside another adapter that also owns them. The one exception is an environment adapter's Launching harnesses section, which may name harness ids. Outside `skills/`, the docs, `verify-pstack`, and the Orca snapshot scripts may name products. Today this check would fail on the lines the Problem table counts, so it can fail, and its report is the work list for phases 1 to 3. Once it passes, deleting an adapter cannot leave a stale mention under `skills/`, and the removal half of the goal holds on every commit. `check-ownership.mjs --report` prints the table in Problem.
- **No links between adapters.** No adapter file links into another adapter's folder.
- **The core names no product.** The `NO_PRODUCT` patterns, without the `gh` rule, apply to every tracked file under `skills/` outside `adapters/`. The contract counts as core.
- **The vocabulary is closed.** Every capability heading in an adapter names a capability the contract lists. Every heading in an environment adapter starts with `Overrides.` or `Adds to.`. Every capability in the contract has a scope and a fallback, or says that none is needed.
- **Exact-step headings match.** Each heading in an adapter's Exact steps matches a contract heading or starts with `New.`.
- **The `BANNED` exemptions move with the text.** `subagent_type` and `run_in_background` are allowed in `adapters/claude-code/`. `cursor` is allowed in `adapters/orca/`, because Orca's agent table lists a `cursor` agent, and in the generator's references until phase 3 deletes them. Model slugs are allowed in each adapter's Survey. The exemptions on `skills/resolve-capability/` as a whole go away.
- `check-orca-commands.mjs` stays as it is. After phase 1, only the Orca adapter, `verify-pstack`, and the docs name Orca commands, so the check guards the Orca adapter.

The checks widen with the phases. Phase 1 applies them to `resolve-capability/` and to today's `NO_PRODUCT` paths. Phase 2 applies them to all of `skills/` except the generator. Phase 3 applies them everywhere.

## Packaging

- One skill, `resolve-capability`, carries the contract and every adapter, and the install command does not change.
- Removing a product from pstack means deleting its folder in the repository. A user whose pstack still has the Orca adapter but who never runs Orca pays nothing, because `detect.sh` answers no and no session reads the adapter. A harness adapter for a product that is not installed costs only a store that `find-sessions` finds missing and skips.
- There is no name prefix, no contract version, and no second discovery path. The contract lists `adapters/` next to itself.
- Phase 1 checks that the `skills` CLI copies nested folders. It copies `references/` today. `detect.sh` runs each adapter's script with `sh`, so the file mode does not matter.

## Migration

Each phase lands on its own and leaves pstack working. The Runs column counts agent sessions, because each one spends the user's usage.

| Phase | Change | Proof | Runs |
| --- | --- | --- | --- |
| 1. Split | Carry the facts from `select-model` (see Facts learned on this computer). Write the contract: the vocabulary with scopes, the resolution procedure, the fallbacks, the exact-step pointers, and `detect.sh`. Create the four adapters line by line, with the stub. Move `orchestrate.md:102` and `spawn.md:7`. Add `check-ownership.mjs` and the lint changes, scoped as Checks says. | The repo checks and `check-ownership`. One entry check each in Claude Code, Codex, and Grok. One spawn check from Claude Code to Codex without Orca. One spawn check of a Codex worker through the Orca adapter. | 5 |
| 2. Core | The phase 2 rows, including the literal `detect.sh` command in `poteto-mode`, decision 1, decision 2, `orch.ts`, and `poteto-help`. Widen the checks to all of `skills/` except the generator. | The repo checks. `worktree-audit.sh` run on this repository with stores and without, where the run without stores buckets no worktree `safe`. The five `sonnet low` runs with `select-model` missing that `features/runtime.md` used when the Orca check was skipped. They prove that `detect.sh` runs before any plan and that decision 1 holds. | 5 |
| 3. Generator | The phase 3 rows. Regenerate the user's `select-model` with the user, then delete the stub. Widen the checks to everything. | One generator run in a fake home. | 1 |
| 4. Verify without Orca | A `verify-pstack` driver for headless runs (decision 3). It clears every `ORCA_*` variable and the `PATH` entry that holds `orca`, as the plain script in `vp.mjs` does, and asserts `ORCA vars left 0`. Orca stays as one driver. | One headless run per harness. Each verdict names its surface and what headless runs do not cover: an interactive `ask-user`, and a background wake after the process exits. | 3 |
| 5. Docs | The phase 5 row. | The repo checks. | 0 |

The plan costs 14 agent sessions. Only phase 4 is tied to removing Orca. Phases 1 to 3 are worth doing without it.

## Removing Orca after this

1. Delete `skills/resolve-capability/adapters/orca/`.
2. Delete `orca/`, `scripts/sync-orca.sh`, `scripts/snapshot-orca.sh`, `scripts/check-orca-commands.mjs` and its CI step, MIRROR's Orca section, the Orca driver in `verify-pstack`, and the Orca mentions in the README and `docs/guide/`.
3. Run `/setup-pstack` again, so that `select-model` drops Orca from its inventory and preferences.
4. Nothing else under `skills/` changes. The ownership check proved on every commit that no other file there names Orca.

Orca's own global skills (`orca-cli`, `orca-linear`, `orchestration`) and its hooks in `~/.claude/settings.json` and `~/.codex/hooks.json` come from Orca, not from pstack. The hooks exit at once when Orca's variables are not set. Removing them belongs to uninstalling Orca, not to this design.

## Risks

- **An agent can skip `detect.sh`.** The same skip happened with the Orca check: `sonnet low` skipped it in 4 of 5 runs while it lived only in the adapter (`features/runtime.md:35-38`). `poteto-mode` therefore keeps the command as a literal first step, and phase 2 reruns the five runs that caught the skip.
- **A fact about two products.** The Orca adapter names the harnesses it launches. Launching harnesses keeps that to an id map and quirks, and the ownership check allows it in that section only.
- **More reading for some capabilities.** `find-sessions` reads a heading from every harness adapter, and `spawn-worker` reads the target's. Each heading is short, and a session no longer reads lines about environments that are not here.
- **Moving text can lose its verified state.** Each `(unverified)` mark and each "seen in run X" moves with its line. The ownership report lists every moved line, so the diff can be reviewed line by line for this.
- **Phase 1 moves text that live files point at.** The user's `select-model` and `verify-pstack`'s spawn criteria point at `orca-workers.md`. The stub and the `spawn.md` edit cover both until phase 3.

## Decisions

The user settled these on 2026-11-06. The review changed decisions 1, 2, and 4, and the user approved the changes.

1. **The defaults when `select-model` is missing.** Each adapter's Survey says what its product is suited to, without ranking other products. Grok's says code and reading. Claude Code's says prose, judgment, and the hardest changes. The generator lists the line from every installed adapter side by side. With no `select-model`, or when two adapters claim the same kind of work, the session stays on its own harness and suggests `/setup-pstack` once. The contract gets no defaults section, because the contract would then name products. The change affects only a user with no `select-model`, and the README's "Out of the box" paragraph changes with it.
2. **The session stores in `worktree-audit.sh`.** `--store` takes a directory or a pattern with `{slug}`. For each worktree, the script replaces `{slug}` with the worktree's absolute path, with `/` and `.` turned into `-`. Each harness adapter's `find-sessions` heading gives its store in this form, and the playbook step passes the store of every harness adapter. Without any `--store`, the script prints `unknown` for `LAST_CHAT` and buckets no worktree `safe`.
3. **`verify-pstack` without Orca.** The new driver starts with headless runs (`claude -p`, `codex exec`, `grok -p`) and judges them from the session records. It clears Orca's variables first. A headless run cannot answer a question mid-run, and most checks bound the prompt so that none comes. A terminal multiplexer such as `tmux` comes in only for a check that needs an answer mid-run. Orca stays as a driver while it is installed.
4. **The layout.** The adapters live in `resolve-capability/adapters/<id>/` as `adapter.md`, with the ids `claude-code`, `codex`, `grok`, and `orca`. The first draft made each one a top-level skill named `pstack-adapter-<id>`. Updating with `-s '*'` reinstalls every skill, so a removed top-level adapter would come back, and an environment adapter whose `detect.sh` answers no already costs nothing.
5. **The desktop apps.** Each is a section of its harness adapter.

## Changes from the review

The review ran Reviewer A (Claude Opus xhigh, 23 findings) and Reviewer B (Codex `gpt-6.1-sol` xhigh, 8 findings). The lead reviewer checked every finding against the repository and dismissed none. The revision made these changes:

- The copy-and-delete test (`check-adapters`) is gone. It could not fail, because deleting files only removes matches. The ownership check replaces it.
- A single precedence rule became per-capability scopes and the `Overrides.` and `Adds to.` markers. The old rule would have had a Claude Code Orca worker open a question screen its coordinator cannot answer.
- `find-sessions` reads every harness adapter. The first draft read other adapters only to start a worker, and Codex and Grok chats would have dropped out of `recall`, session pickup, eval, and the worktree audit.
- Text moves line by line. File-level moves would have put Orca lines into the three harness adapters.
- The contract's exact steps keep their headings and point to an environment's step. Otherwise `worktree-cleanup` would have run `git worktree remove` on a worktree Orca manages.
- `poteto-mode` keeps a literal detection command, because a pointer alone failed in measured runs.
- Facts learned on this computer move into the adapters before `select-model` drops its start commands, and a stub keeps the user's link alive.
- The lint walks `git ls-files` with `.ts`, drops the `gh` rule, and moves its exemptions with the text.
- The move table gained the generator's other files, `orchestrate.md:102`, `orch.ts`, `poteto-help`'s other lines, `docs/guide/`, and `CURSOR-DEPENDENCIES.md`, and a phase for each source.
- `poteto-help` reads the adapters' For users sections instead of keeping an exempt block.
- The headless driver clears Orca's variables, and the adapter shape gained For users and Limits.
