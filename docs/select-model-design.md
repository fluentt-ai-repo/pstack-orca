# select-model design

Status: draft for review. Nothing here is implemented yet.

## Problem

`~/.agents/pstack-models.md` holds one model per role (17 roles, some of them lists). `/setup-pstack` writes it once. It goes stale: models appear and disappear, a user installs or drops an agent, Orca changes what it accepts, and the right choice depends on the task and the moment, which a table cannot know. The same table is also wrong for anyone whose machine differs from the author's.

## Idea

Do not keep a table. Generate a skill that carries this user's preferences and this machine's facts, and let the model that runs `poteto-mode` decide, task by task, which model to use and how to use it.

## Names

Verb first, like `create-verification-skill` and the `verify-<app>` skill it writes.

| Name | Owner | What it is |
| --- | --- | --- |
| `setup-pstack` | pstack | The command the user knows. Creates `select-model` when it is missing, otherwise checks and updates it. |
| `create-model-selection-skill` | pstack | The generator. Surveys the machine, asks for preferences, writes `select-model`, proves it. |
| `select-model` | the user, under `~/.agents/skills/select-model/` | The generated skill. Read at the start of a task. |

`pickup` is a noun, and "pick up" means to collect, so it is not used.

## Generation

1. **Survey the machine.** Only what can be observed here.
   - Agent products on `PATH`, plus the agents in Orca's probed model catalog.
   - Models and efforts per product: Orca's `agent-model-catalog.json`, `~/.codex/models_cache.json`, `~/.grok/models_cache.json`, and the schema of your own subagent tool.
   - How each product can be started and what it refuses. Orca takes `--model` and `--effort` for Claude, Codex, Cursor, Antigravity, and Muse, only `--model` for OMP, needs an existing worktree for OpenCode, and runs Grok and zcode on their own config. Grok's model is `[models] default` in `~/.grok/config.toml`.
2. **Ask for preferences.** Five questions: cost versus speed (budget), the preferred model per kind of work (code, prose and judgment, review), agents or models to avoid, how readily to use several models at once, and whether a role may run as an Orca worker on another vendor's agent. Each answer is written as a sentence with its reason, so the reading model can extend it to cases the list does not name.
3. **Write the skill.**
4. **Prove it.** Start one read-only subagent per surveyed agent. Drop what does not start. A model that is listed but cannot run is the failure this step exists to catch.

## Generated layout

```
select-model/
  SKILL.md        preferences as sentences with reasons; the ways to use models on this machine; what to recheck before spawning
  inventory.md    this machine: product, model, efforts, how to start it, when it was confirmed
  references/     one file per environment found: orca, claude, codex, grok, plain-terminal, unknown-product
  log.md          one line per change: date, what, why, who approved
```

`references/` is copied from the generator with a pstack version stamp and overwritten on update. The user's own changes go in `SKILL.md` and `log.md`, which an update never overwrites.

## Runtime

`poteto-mode` and the cross-model skills read `select-model` before they spawn anything. They do not call it and get nothing back. The model running the task reads the preferences and the machine's facts and decides.

The ways to use models, stated only when this machine has them:

- Stay in the current session. The default. Go further only for a reason.
- A subagent of the same harness: wide reads, parallel independent work, keeping the context small.
- An Orca worker on another agent: when that agent's model suits the work better.
- Several models together (swarm, arena, interrogate, reflect): for judgment that could split, changes that are costly to undo, and large independent batches.

Before it spawns, the model rechecks only what it is about to use: the CLI still exists, `ORCA_CLI_BIN_DIR` or `ORCA_CLI_COMMAND` is set. Remaining usage is not readable on this machine (Orca has no command for it, and only Codex leaves a stale `rate_limits` record in its session logs). So usage is handled when it fails: a limit error moves the seat to another agent for this run only, and the reply says so. A transient state is never written into the skill.

## When a run does not match the skill

| What was wrong | What happens |
| --- | --- |
| A stable fact (a flag a product refuses, a model that is gone) | Ask the user, then fix `references/` or `inventory.md`. `log.md` gets the date and the product version. |
| A preference that no longer fits | Ask the user, then edit the sentence or add a branch. |
| A transient state (a limit, no network) | Substitute for this run, say so in the reply, change nothing. |

The skill is edited only inside its own directory, and only after the user agrees.

## Fallback and migration

- No `select-model` yet: `poteto-mode` keeps today's defaults (`grok grok-4.7-build-fast xhigh` for code, `claude opus xhigh` for prose and judgment), says so in one line, and points at `/setup-pstack`.
- `/setup-pstack` reads an existing `~/.agents/pstack-models.md` once and turns its lines into preference sentences. The file is then unused. It is not deleted.

## What changes in the repo

16 files mention `pstack-models` today. The ones that carry behavior:

- `skills/setup-pstack/SKILL.md`: becomes the entry point.
- `skills/create-model-selection-skill/` (new): the generator and its `references/`.
- `skills/poteto-mode/SKILL.md`: the Subagents section shrinks to "read `select-model`, then decide".
- `skills/arena`, `swarm`, `interrogate`, `reflect`, `architect`, `how`, `why`: their role lines and default entries become guidance the model reads, apart from rules that belong to the skill itself (for example, an Arena judge from a different vendor than the parent).
- `skills/poteto-help`, `skills/orca-harness`, `README.md`, `docs/guide/01-setup.md`, `docs/harness/claude-code.md`: wording.
- Playbooks, in the unit that rewrites them: `skills/poteto-mode/playbooks/multi-phase-plan.md` and `skills/poteto-mode/scripts/check-plan.mjs` require the text "Ten lanes on `<swarm workers model>`" in the plan. The plan will name the model chosen for verification instead, and the script check changes with it.

## Decisions from the cross-session review

The review read the seven cross-model skills and the current `poteto-mode` Subagents section. It does not dispute retiring role lines. It found that a role line also carried rules that a preference sentence cannot hold.

1. **Each cross-model skill keeps a seat table, and drops model names.** Columns: seat, kind (code, prose, judgment, read), needs (MCP, writes), count and diversity rule. Examples: arena runners are one per entry with at least two structurally different candidates, interrogate labels reviewers A and B per item, reflect has three fixed lenses, an arena judge starts after every candidate finishes and prefers an agent unlike the parent. The table states what the skill needs. It is not a call: the model reading `select-model` still chooses the models.
2. **The fallback lives in `poteto-mode` only.** Defaults by kind: code and read `grok grok-4.7-build-fast xhigh`, prose and judgment `claude opus xhigh`. The one-line notice is printed once per run. The seven skills name a kind and carry no default. The rule for a panel that cannot be diverse (only one vendor) also lives there: say diversity shrank and use another model of the same vendor.
3. **`poteto-mode` Subagents section gains the rules the skills lean on:** a rejected entry, a seat that needs MCP stays on the caller's harness, Orca workers are read-only by brief only (check `git status` after), workers share this computer so a writer gets its own worktree and ports, Orca and native seats start in the same message to run at once, and "verification stays on the `swarm workers` entry" is replaced by wording that does not name a role line.
4. **`inventory.md` records per agent:** whether it loads this user's MCP servers, whether a model can be chosen at start, and for Grok the model that ran, read from the session record. The generator reads the subagent types and their tools from the schema of the harness it runs in, because the skills only say that some read-only agent types drop MCP tools and do not say which. A rejected model is replaced only by an id in `inventory.md`. A new id is never guessed.
5. **One absolute path everywhere:** `~/.agents/skills/select-model/SKILL.md`. `poteto-mode` and the seven skills all read it by this path and do not depend on any agent discovering it as a skill. What was observed: on this computer `~/.claude/skills/` holds symlinks into `~/.agents/skills/`, so Claude Code reaches those skills through the links. Whether it also scans `~/.agents/skills/` directly was not tested, and a generated `select-model` has no such link unless the generator makes one.
6. **`plain-terminal.md` holds the rule for a session with no Orca:** it can start only its own models, so another vendor's seat folds into the session's own model and the reply says so in one line.
7. Verified so far: Claude with Orca, Claude without Orca, Codex with Orca. Not run: Codex alone, and Codex spawning its own vendor.

## Work split

One writer per file. A commit touches only its author's paths (`git commit -- <paths>`). Neither session pushes, rewrites history, or runs `git add -A`. A file owned by the other gets a message first.

| Owner | Files |
| --- | --- |
| Design session (`claude_ec1b6ec3`) | `docs/select-model-design.md`, `skills/create-model-selection-skill/` (new), `skills/setup-pstack/SKILL.md`, `skills/poteto-mode/SKILL.md`, `README.md` |
| Unit 3 session (`claude_33c2813d`) | `skills/arena`, `swarm`, `interrogate`, `reflect`, `architect`, `how`, `why` and their `references/`; `skills/poteto-help`, `skills/orca-harness`, `docs/guide/01-setup.md`, `docs/harness/claude-code.md`; `scripts/lint-rewritten.mjs`, `scripts/rewritten.json`; `CURSOR-DEPENDENCIES.md`; `docs/decursor-progress.md` |

Order, with each step waiting for the one before:

1. Design review (done) and this document.
2. The generator, `setup-pstack`, and the `poteto-mode` Subagents section. The design session announces when the `select-model` contract and that section are final.
3. `select-model` generated on this computer by the generator.
4. The seven skills, the four docs, and the lint (it forbids `pstack-models` outside `setup-pstack` and the generator, which reads the old file once to migrate). The Unit 3 session starts here and builds on its unpushed commits `63300d9` and `d5be86d`.
5. Real runs of the changed skills, as in Unit 3, on the environments listed above.

## Open points

1. Whether `unknown-product.md` should let the generator register a product it does not know, or stop and ask.
2. Where a project-specific override lives, if one is needed at all.

## Checks

- Generator: Claude Code and Codex, with and without Orca, each time compared against what is installed.
- Runtime: tasks of different size and risk, and whether the model's choice and the one-line reason in the reply fit the preferences.
- Failure: a forced limit error moves the seat and changes no file.
- Fallback: `poteto-mode` with no `select-model` prints the one-line notice and runs on the defaults.

## Results of the first checks (2026-10-23)

The generator and the `poteto-mode` Subagents section were run on real agents in the testbed, with the skills copied from the working tree. The generated skill was written to `/tmp/select-model-test/` for G1. For R1, R2, and R4 it was copied to `~/.agents/skills/select-model/`, then removed.

| Run | Environment | Result |
| --- | --- | --- |
| G1 | Claude Code in an Orca chat, answers given in the prompt, `/setup-pstack` | Pass. No question asked. It surveyed Claude, Codex, and Grok, found the pins in `~/.claude/settings.json`, `~/.codex/config.toml`, and `~/.grok/config.toml`, wrote `SKILL.md` (51 lines), `inventory.md`, `log.md`, and the references, and started one read-only job per product. Grok ran `grok-4.7` at `medium`, not the `grok-4.7-build-fast` the user chose, and the skill says so and how to change it. |
| R1 | Claude Code, `select-model` present, a one-file bug check | Pass. Read the skill first. Stayed in this session, one-line reason, started nothing. |
| R2 | Same, a read of 59 skills plus a hard-to-undo redesign | Pass. Read the skill first. Chose a Grok worker for the wide read, an Opus subagent for the judgment, and a Codex worker for a second opinion, and said Orca would run Grok on `grok-4.7`. |
| R3 | Claude Code, no `select-model` | Pass. The first line says the skill is missing and points at `/setup-pstack`. Defaults used. |
| R4 | Codex in an Orca terminal, the R1 task | Pass. Its first command read `~/.agents/skills/select-model/SKILL.md`. Stayed in this session with a one-line reason. |

Two defects were found and fixed: `references/grok.md` said Grok runs at `default_reasoning_effort` when the record showed `medium` with the file at `high`, and the generator added a Codex preference the user never gave. Not run: Codex generating the skill, Claude Code with no Orca, and a run that starts the workers `select-model` chose.

