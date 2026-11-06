# Harness adapters design

Status: proposed on 2026-11-06, not implemented. The user settled its open questions the same day (see Decisions). It changes the adapter layer of [`resolve-capability-design.md`](./resolve-capability-design.md) and what [`select-model-design.md`](./select-model-design.md) puts in `select-model`. Until it is implemented, the skills are right where they differ from it.

## Problem

The three-layer design (intent, adapter, this computer) keeps product names out of most skills. Taking one product away shows where they remain. Removing Orca today means editing all of these:

- [`resolve-capability/SKILL.md`](../skills/resolve-capability/SKILL.md). Each index line holds the Claude Code, Codex, Grok, and Orca mechanism for one capability, and section 1 runs Orca's detection.
- [`poteto-mode/SKILL.md`](../skills/poteto-mode/SKILL.md) lines 93, 95, 100, 103, and 139: the Orca check, the default products, `TodoWrite`, and `update_plan`.
- [`setup-pstack/SKILL.md`](../skills/setup-pstack/SKILL.md) lines 24 and 26: how Orca starts products, and Grok's config file.
- [`create-model-selection-skill/references/`](../skills/create-model-selection-skill/references/), a second set of per-product files (`claude-code.md`, `codex.md`, `grok.md`, `orca.md`) for the survey.
- The generated `select-model`, which copies start commands into its text. On this computer it holds an Orca worker's flags and `codex exec -s read-only ... < /dev/null`.
- `verify-pstack`, which starts every driven session through Orca, its plain surface included.
- CI's `check-orca-commands` step, the `orca/` snapshot, and the README, MIRROR, and `poteto-help`.

Product knowledge sits in three places: the adapter, the generator's references, and `select-model`. The lint that bans product names covers 9 path prefixes: the seven cross-model skills, the playbooks, and `poteto-mode/references`. `poteto-mode/SKILL.md`, `setup-pstack`, and the generator are exempt on purpose. The other skills are clean by habit, not by a check, and four of them still name a product (`ketchup`, `create-verification-skill`, `create-formal-verification-skill`, `maintain-verification-skill`). `worktree-audit.sh` reads each product's session store by its path.

## Goal

- The pstack core names no agent product, tool, path, or command. A CI check proves it for every file under `skills/` outside the adapters.
- Each product has one adapter folder, and all of pstack's knowledge of that product lives there.
- Removing a product means deleting its adapter, or not installing it. Adding one means adding a folder. Neither touches the core or another adapter. A CI check proves the removal half.

## Non-goals

- New capabilities, or a change in what a playbook does.
- Splitting the repository. The adapters ship from this repo, and the default install still takes everything (see Packaging).
- The forge. `gh` is used in every environment and stays in the contract. A forge adapter could follow the same rules later.
- Skill frontmatter. `disable-model-invocation` stays as written, as the earlier design decided.

## Layers

| Layer | Holds | Names products | Changes when |
| --- | --- | --- | --- |
| 1. Core | `poteto-mode`, the playbooks, the other skills, the bundled scripts | no | the way of working changes |
| 2. Contract | `resolve-capability`: the closed capability vocabulary, how to find adapters, one fallback per capability, the worker rules and exact steps that hold for every product | no | a capability is added or its fallback changes |
| 3. Adapters | `pstack-adapter-<id>`, one per product: how that product does each capability, how another session starts it, how the generator surveys it | its own product, and the products it launches | that product changes |
| 4. This computer | `select-model`: the inventory and the preferences | as data only | `/setup-pstack` runs |

```text
skills/
  poteto-mode/, arena/, ...        core: capability names only
  resolve-capability/              contract: vocabulary, discovery, fallbacks
  pstack-adapter-claude-code/      harness adapter
  pstack-adapter-codex/            harness adapter
  pstack-adapter-grok/             harness adapter
  pstack-adapter-orca/             environment adapter
~/.agents/skills/select-model/     this computer
```

The contract keeps the name `resolve-capability`. 36 files under `skills/` refer to it (`grep -rl resolve-capability skills | grep -v '^skills/resolve-capability/' | wc -l`), and they keep working without an edit. What changes is what the folder holds. Today it is the adapter. After this it is the interface that the adapters implement.

## Two kinds of adapter

A **harness** is the agent a session runs in: Claude Code, Codex, or Grok. A session has exactly one. An **environment** runs on top of harnesses and adds to them, as Orca does. A session has none, one, or several. Section 1 of `resolve-capability` already asks these as separate questions. An adapter's frontmatter says which kind it is.

| Adapter | Kind | Built from today's |
| --- | --- | --- |
| `pstack-adapter-claude-code` | harness | `references/claude-code.md`, the Claude Code part of each index line, the Claude Code rows of `cli-workers.md`, the generator's `claude-code.md` |
| `pstack-adapter-codex` | harness | the same files' Codex parts |
| `pstack-adapter-grok` | harness | the same files' Grok parts |
| `pstack-adapter-orca` | environment | `orca-workers.md`, the Orca part of each index line, the Orca parts of `waiting-and-schedules.md` and `exact-steps.md`, the generator's `orca.md`, `setup-pstack` lines 24 and 26 |

The desktop apps (the Claude app's Code tab and the ChatGPT app's Codex) are surfaces of a harness, not environments. A session cannot test for them with a variable, and each adds a few features to the same harness. Each is a section of its harness's adapter.

## Adapter shape

```text
skills/pstack-adapter-<id>/
  SKILL.md        frontmatter and the sections below
  references/     long procedures, read on first use (Orca's worker loop)
```

```yaml
---
name: pstack-adapter-codex
description: How pstack's capabilities are done in Codex, and how another session starts Codex as a worker. Read through resolve-capability, not on its own.
disable-model-invocation: true
metadata:
  pstack-adapter: harness
  pstack-contract: 1
---
```

`pstack-adapter` is `harness` or `environment`. The sections, in this order:

1. **Detect.** How a session knows the adapter applies. In a harness adapter, what in your own tool list says you are this product. In an environment adapter, a command that answers yes or no (Orca: `env | grep '^ORCA_CLI_'`).
2. **Capabilities.** One heading per capability the product does, named with the capability in backticks, with the mechanism and its verified state. A capability the product does not do gets no heading, and the contract's fallback covers it.
3. **Start me from outside.** Harnesses only. The headless command another session runs to start this product as a worker, its model and effort flags, its read-only mode, where the answer lands, and where its session record is. This is the product's row of today's `cli-workers.md`.
4. **Launching harnesses.** Environments only. How it starts each harness and what it refuses per harness (Orca refuses a Grok model and effort). A fact about a pair of products lives in the environment's adapter, because the environment does the launching.
5. **Surfaces.** Harnesses only. Each desktop app or other surface, and what it adds.
6. **Survey.** What the generator reads to list this product's models and efforts, its skill folder, and where a model is pinned. This is today's generator reference file.
7. **Exact steps.** Irreversible commands only this product has (Orca: `orca worktree rm`, `worker-release`, `orca orchestration reset`).

## Resolution

This procedure replaces section 1 of the contract, "which environment is this".

1. List the adapters: every `pstack-adapter-*` folder next to `resolve-capability`. When `select-model` records an absolute path for them, look there too.
2. Read the harness adapter whose Detect matches you. When none matches, you run in a harness pstack has no adapter for. Use the contract's fallbacks and say so once.
3. Run the Detect of every environment adapter, and read each one that answers yes.
4. For each capability, use an environment's mechanism where it does what the harness cannot, and the harness's own otherwise. This is today's rule. When neither has one, use the contract's fallback.
5. For `spawn-worker` on another product, read that product's Start me from outside. When an environment you are in launches that product, read the environment's Launching harnesses instead. When the product has no adapter, run the seat on your own model and say which product would have run it.

A session reads the contract, its own harness adapter, and the environment adapters that apply. It reads another product's adapter only for the section a worker start needs. Today it reads one index in which every line carries every product.

## What moves where

| Today | After |
| --- | --- |
| `resolve-capability/SKILL.md` section 1, the environment questions | the contract's resolution procedure, and each adapter's Detect |
| Each index line's per-product mechanism | that product's adapter, under the capability's heading |
| Each index line's `None: ...` | the contract, as that capability's fallback |
| `references/claude-code.md`, `codex.md`, `grok.md` | the harness adapters |
| `references/orca-workers.md` | `pstack-adapter-orca/references/` |
| The rows of `references/cli-workers.md` | each harness's Start me from outside |
| The rules of `references/cli-workers.md` (silence is not a hang, the report is the output file, a process dies with its session) | the contract. `references/cli-workers.md` stays and keeps only the rules |
| `references/waiting-and-schedules.md` | the Orca and Claude Code parts go to their adapters, and the bounded-loop fallback goes to the contract |
| `references/exact-steps.md` | the `gh` and `git` steps stay in the contract, and Orca's steps go to its adapter |
| `references/plain.md` | the contract. It describes a session where no environment adapter answers yes |
| `create-model-selection-skill/references/<product>.md` | each adapter's Survey. The generator keeps `unknown-product.md` and reads the Survey of each installed adapter |
| `create-model-selection-skill/SKILL.md`: the products named in its survey steps, `AskUserQuestion`, the Orca worker question, and its default models | `locate`, `ask-user`, the environment adapters' Detect, and the suggestions in the adapters' Survey (decision 1) |
| The start commands and refusals in `select-model` | dropped. `select-model` keeps the inventory (which products and models, verified when), the preferences, and where the adapters are. Start commands come from the adapters at run time |
| `poteto-mode/SKILL.md` lines 93 and 100, "run `env \| grep '^ORCA_CLI_'`" | "resolve the environment as section 1 of `resolve-capability` says" |
| `poteto-mode/SKILL.md` line 103, "your harness or Orca rejects the model" | "a harness or an environment rejects the model" |
| `poteto-mode/SKILL.md` line 139, `TodoWrite` and `update_plan` | `track-todos` |
| `poteto-mode/SKILL.md` line 95, the default products when `select-model` is missing | "stay on your own harness and suggest `/setup-pstack`". The split becomes suggestions in the adapters' Survey (decision 1) |
| `setup-pstack/SKILL.md` lines 24 and 26 | the Orca adapter's Launching harnesses. `setup-pstack` tells the user how each product found here starts, from its adapter |
| `ketchup` and `create-verification-skill`, "`$name` in Codex" | `run-skill`, whose adapter section gives the form a user types |
| `create-formal-verification-skill` and `maintain-verification-skill`, `.claude/skills/` | `locate` |
| `worktree-audit.sh`, each product's session store by path | a repeatable `--store <dir>` argument, which the playbook step fills from what `find-sessions` resolved (decision 2) |
| `poteto-help`, install commands and links to each product's docs | stays, inside a marked block that the lint skips, because a user who is installing needs the product names |

## Checks

`scripts/lint-rewritten.mjs` changes, and one script is added.

- **The core names no product.** The `NO_PRODUCT` rules apply to every file under `skills/` except `skills/pstack-adapter-*/` and marked blocks. The contract counts as core for this rule.
- **The vocabulary is closed.** Every capability heading in an adapter names a capability the contract lists, and every capability in the contract has a fallback or says that none is needed.
- **The core names no adapter.** No file under `skills/` outside the contract and the adapters contains `pstack-adapter-`.
- **Any adapter can go.** `scripts/check-adapters.mjs` copies the repo once per adapter, deletes that adapter, and runs the checks above and `check-orca-commands` on the copy. Each copy must pass with no other edit. This is the goal written as a test.
- `check-orca-commands.mjs` stays as it is. After the move, only the Orca adapter, `verify-pstack`, and the docs name Orca commands, so the check guards the Orca adapter. The `orca/` snapshot and the `upstream-orca` branch become that adapter's upkeep, and MIRROR's Orca section says so.

## Packaging

- The repository and the default install stay the same. `npx skills add ynginkim/pstack-orca -g ... -s '*'` installs the core, the contract, and every adapter. Shipping them together keeps the reason the earlier design gave for one bundle, which is that nothing in the user's home goes stale against the rest.
- To leave a product out, run `npx skills remove -g pstack-adapter-<id>`, or install without it. Nobody has checked yet whether the `skills` CLI's `-s` takes a list of names for this.
- An adapter declares `pstack-contract: <n>`. When the contract finds an adapter with another number, it says so and uses its own fallbacks for that adapter. With one repository, this matters only for an adapter installed from somewhere else.
- The repository keeps its name.

## Migration

Each phase lands on its own and leaves pstack working. The Runs column counts agent sessions, because each one spends the user's usage.

| Phase | Change | Proof | Runs |
| --- | --- | --- | --- |
| 1. Split | Write the contract without product names. Create the four adapters by moving text, with no rewording beyond what the move needs. Update the lint and add `check-adapters`. | The four repo checks and `check-adapters`. One entry check each in Claude Code, Codex, and Grok, which proves each one finds its adapter. One spawn check from Claude Code to Codex without Orca. | 4 |
| 2. Core | The `poteto-mode`, `setup-pstack`, `ketchup`, and verification-skill lines above, the defaults (decision 1), `worktree-audit.sh` (decision 2), and the marked block in `poteto-help`. Widen the lint to all of `skills/` except the generator. | The repo checks, and `worktree-audit.sh` run on this repository with and without `--store`. One runtime check with `select-model` missing, because decision 1 changes what that case does. One entry check in Claude Code, only if `poteto-mode` changed beyond that and the names. | 1 to 2 |
| 3. Generator | Survey sections and suggested defaults in the adapters, the generator without product names of its own, and a `select-model` template without commands. Drop the generator's lint exemption. | One generator run in a fake home. Regenerating the user's own `select-model` is the user's call, because it asks questions. | 1 |
| 4. Verify without Orca | A `verify-pstack` driver that starts sessions without Orca: headless runs, with `tmux` only for a check that needs an answer mid-run (decision 3). Orca stays as one driver. | One run per harness through the new driver. Codex and Grok without Orca have never run for this fork, so these runs are new proof, not repeats. | 3 |
| 5. Docs | The README (where it runs, install, adapters), MIRROR, `poteto-help`, and the status lines of the two earlier design docs. | The repo checks. | 0 |

Only phase 4 is tied to removing Orca. Phases 1 to 3 are worth doing without it.

## Removing Orca after this

1. Remove the adapter from the user's install: `npx skills remove -g pstack-adapter-orca`.
2. Optionally, in the repository: delete `skills/pstack-adapter-orca/`, `orca/`, `scripts/sync-orca.sh`, `scripts/snapshot-orca.sh`, `scripts/check-orca-commands.mjs`, its CI step, and MIRROR's Orca section.
3. Nothing in the core or in another adapter changes. `check-adapters` already proves it.

Orca's own global skills (`orca-cli`, `orca-linear`, `orchestration`) and its hooks in `~/.claude/settings.json` and `~/.codex/hooks.json` come from Orca, not from pstack. The hooks exit at once when Orca's variables are not set. Removing them belongs to uninstalling Orca, not to this design.

## Risks

- **A fact about two products with no clear owner.** Orca with Grok goes in the environment's adapter. A fact about two harnesses with no environment between them, such as Claude Code starting Codex, goes in the started product's Start me from outside, because the command is that product's. A fact that fits neither is a sign that the vocabulary lacks a capability.
- **More files when a session starts workers on other products.** A session that starts workers on two other products reads two more sections. Each section is short, and the session no longer reads lines about products that are not here.
- **Discovery depends on the folder layout.** Adapters are found next to `resolve-capability`. The `skills` CLI puts every skill in one folder and links each one, so this holds for a global and for a project install. `select-model` records the absolute path as a second place to look, as it does for `resolve-capability` today.
- **Moving text can lose its verified state.** Each `(unverified)` mark and each "seen in run X" moves with its line. Phase 1 moves text and does not rewrite it, so the diff can be reviewed line by line for this.

## Decisions

The user settled the five open questions on 2026-11-06, each as recommended.

1. **The defaults when `select-model` is missing.** `poteto-mode` line 95 sends code and reading to Grok, and prose and judgment to Claude Opus. That is a preference, and the core cannot hold it without naming products. With no `select-model`, the core stays on the session's own harness and suggests `/setup-pstack` once. The split becomes suggestions in the adapters' Survey sections. The Grok adapter suggests itself for code and reading, and the Claude Code adapter suggests itself for prose, judgment, and the hardest changes. The generator offers what the installed adapters suggest. The contract gets no defaults section, because the contract would then name products. The first draft of this decision put the suggestion in the generator's own text. The lint forbids that once the generator counts as core, so the suggestions live in the adapters. The change affects only a user with no `select-model`, and the README's "Out of the box" paragraph changes with it.
2. **The session stores in `worktree-audit.sh`.** A shell script cannot read an adapter. The script takes a repeatable `--store <dir>` argument, and the playbook step passes the stores that `find-sessions` resolved. The adapters do not ship a file of store paths, because that would make them more than prose and tie the script to their layout.
3. **`verify-pstack` without Orca.** Today even its plain surface opens a terminal through `orca terminal create`. The new driver starts with headless runs (`claude -p`, `codex exec`, `grok -p`) and judges them from the session records. A headless run cannot answer a question mid-run, and most checks bound the prompt so that none comes. A terminal multiplexer such as `tmux` comes in only for a check that needs an answer mid-run. Orca stays as a driver while it is installed.
4. **Adapter names.** Each adapter is `pstack-adapter-<id>`. The prefix keeps the adapters from clashing with other skills in the shared folder, where `orca-cli` is Orca's own.
5. **The desktop apps.** Each is a section of its harness adapter. An app becomes an environment adapter only if it gains something a session can detect that changes many capabilities.
