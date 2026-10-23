# Cursor dependencies in pstack

Every place where upstream pstack ([`cursor/plugins/pstack`](https://github.com/cursor/plugins/tree/main/pstack)) depends on Cursor, and how this fork handles it in Orca. The rules these rows apply live in [`skills/resolve-capability/SKILL.md`](./skills/resolve-capability/SKILL.md). This file is the checklist that proves nothing was missed.

26 rows. Locations refer to the `upstream` branch.

## How this list stays complete

`node scripts/audit-cursor-deps.mjs` greps the `upstream` branch for Cursor markers (`Task`, `.mdc`, `grok-*`, `environment: "cloud"`, `/loop`, Bugbot, Automations, `cursor-team-kit`, and the word Cursor itself) and fails on any matching line with no row here. A row covers a line when it names the same file and its excerpt appears in that line, so line drift after an upstream sync does not fail the check, but a new dependency does. CI runs it on every push and on every upstream sync PR. `--list` prints every flagged line.

The grep only finds what it can name. Rows for implicit dependencies, such as "subagents inherit the parent's MCP servers" or "the system prompt names an agent store", came from reading every upstream file in full. When an upstream sync changes a file, reread its rows here.

Files this fork deleted have no rows and the audit skips them (`REMOVED` in `scripts/audit-cursor-deps.mjs`). Today that is `automations/` and `skills/make-bot-ui/`. What each did and how to rebuild it is in [`docs/removed-cursor-features.md`](./docs/removed-cursor-features.md).

Skills this fork rewrote by hand (`scripts/rewritten.json`) have no rows either, because they no longer carry Cursor wording. `scripts/lint-rewritten.mjs` keeps it out.

## Reading a row

- **Category** is one of `tool-name`, `subagent-field`, `model-slug`, `settings-path`, `transcript`, `skill-path`, `automation`, `bugbot`, `cloud-agent`, `pr-tool`, `team-kit`, `cursor-ui`, `frontmatter`, `url`, `script`, `implicit`.
- **Handling** says what replaces the dependency.
  - `orca`: an Orca command does the job. The row names it.
  - `agent-native`: each agent (Claude Code, Codex, Grok) has its own equivalent. The row names each one.
  - `fallback-only`: nothing equivalent exists. The row describes the degraded behavior.
  - `skip`: the step is dropped with a one-line note in the reply.
  - `keep`: the line was flagged but works as-is in any harness. The row says why.
- **Status** is `todo` until this fork's skills apply the handling, then `done`. `keep` rows are `n/a`.

| Handling | Rows |
| --- | --- |
| `agent-native` | 23 |
| `keep` | 3 |

| Category | Rows |
| --- | --- |
| `frontmatter` | 23 |
| `implicit` | 3 |

## What Orca cannot replace

These are the `fallback-only` themes. Each one costs something real, and a skill that hits one says so in its reply.

1. **MCP servers do not cross agents.** A Cursor subagent inherits the parent's MCP servers. An Orca worker loads only its own agent's MCP config. A seat that needs an MCP server (`why` investigators, `reflect` reviewers) stays a native subagent, which can cost the panel its model diversity.
2. **No read-only worker.** Orca has no flag for Cursor's `readonly: true`. The spec forbids edits, the worker runs in `--worktree current`, and the coordinator checks `git status` after.
3. **Orca refuses `--model` and `--effort` for Grok.** Checked 2026-10-23 on Orca 1.4.237: `worker-start --agent grok --model grok-4.7 --effort medium` exits 1 with `Agent grok does not support launch-time model selection`. A Grok worker started with `--agent grok` alone runs the model in `~/.grok/config.toml`, and `worker-show` reports `launch.effective` as null. Read the model that ran from the Grok session record.
4. **No event triggers.** Orca automations run on a schedule. A Slack-triggered flow becomes a scheduled run with a `--precheck` poll, plus a state file to hand the event to the run. The two Cursor-only features that needed this, the benny automation pack and `make-bot-ui`, were removed; see [`docs/removed-cursor-features.md`](./docs/removed-cursor-features.md).
5. **No screen recording, no secret store.** Cloud-agent video becomes `orca screenshot` sequences or a local recorder. Cursor secret requests become host environment variables.
6. **Skills-CLI installs skip `docs/` and `agents/`.** `poteto-agent` and `comment-sicko` need a separate install per agent, and links into `docs/` resolve to GitHub.
7. **Codex ignores `disable-model-invocation`.** Slash-only skills can auto-trigger in Codex. This was reported by the inventory and is not yet verified.
8. **Cursor UI has no counterpart.** Custom Modes, the `/` menu attaching a skill to one message, the cloud-agent dashboard, and the Automations editor are skipped.

## poteto-mode skill and playbooks

0 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## poteto-mode scripts

0 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Cross-model skills (arena, swarm, interrogate, reflect, architect, how, why)

0 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Setup and help (poteto-help; setup-pstack was rewritten by hand)

0 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Other skills

26 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CD-499 | `skills/bro/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-586 | `skills/principle-attack-the-premise/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Relies on Cursor treating the field as "slash-only, but the agent can still read the file"; harnesses handle it differently. | agent-native | Claude Code and Grok honor the field: the model cannot auto-invoke and the Skill tool refuses, so cross-skill reads must `Read <pstack>/skills/<name>/SKILL.md`. Codex ignores the field; add `agents/openai.yaml` with `policy: allow_implicit_invocation: false`. | todo |
| CD-587 | `skills/principle-boundary-discipline/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same Cursor-specific invocation semantics. | agent-native | Same as above: Claude Code/Grok honor it; Codex needs `agents/openai.yaml` `allow_implicit_invocation: false`. | todo |
| CD-590 | `skills/principle-encode-lessons-in-structure/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-591 | `skills/principle-exhaust-the-design-space/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-592 | `skills/principle-experience-first/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-593 | `skills/principle-explain-the-number/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-594 | `skills/principle-fix-root-causes/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-595 | `skills/principle-foundational-thinking/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-596 | `skills/principle-guard-the-context-window/SKILL.md:3` | `Route bulk to subagents` | implicit | Generic subagent advice. | keep | Every harness has subagents (`Agent`, `spawn_subagent`, Codex) or Orca workers. | n/a |
| CD-597 | `skills/principle-guard-the-context-window/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-598 | `skills/principle-laziness-protocol/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-599 | `skills/principle-make-operations-idempotent/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-600 | `skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-601 | `skills/principle-minimize-reader-load/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-602 | `skills/principle-model-the-domain/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-603 | `skills/principle-never-block-on-the-human/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-604 | `skills/principle-outcome-oriented-execution/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-607 | `skills/principle-redesign-from-first-principles/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-608 | `skills/principle-separate-before-serializing-shared-state/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-612 | `skills/principle-subtract-before-you-add/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-613 | `skills/principle-test-behavior-not-implementation/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-644 | `skills/tdd/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-645 | `skills/tdd/SKILL.md:24` | `manual reproduction command, browser automation, snapshot comparison, log assertion,` | implicit | Not a dependency: "browser automation" is a generic verification technique. | keep | No action. In Orca, `orca goto`/`orca snapshot` can serve as the browser automation. | n/a |
| CD-666 | `skills/unslop/SKILL.md:4` | `disable-model-invocation: true` | frontmatter | Same. | agent-native | Same as above. | todo |
| CD-667 | `skills/unslop/SKILL.md:32` | `If you're coming from traditional automation: instead of registering event handlers` | implicit | Not a dependency: "automation" appears in a quoted example of bad prose. | keep | No action. | n/a |

## Subagent definitions (agents/)

0 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Docs (docs/)

0 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## README and plugin manifests

0 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
