# Cursor dependencies in pstack

Every place where upstream pstack ([`cursor/plugins/pstack`](https://github.com/cursor/plugins/tree/main/pstack)) depends on Cursor, and how this fork handles it in Orca. The rules these rows apply live in [`skills/resolve-capability/SKILL.md`](./skills/resolve-capability/SKILL.md). This file is the checklist that proves nothing was missed.

192 rows. Locations refer to the `upstream` branch.

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
| `agent-native` | 75 |
| `orca` | 60 |
| `keep` | 30 |
| `fallback-only` | 19 |
| `skip` | 8 |

| Category | Rows |
| --- | --- |
| `frontmatter` | 25 |
| `implicit` | 21 |
| `cursor-ui` | 20 |
| `subagent-field` | 18 |
| `automation` | 16 |
| `bugbot` | 13 |
| `settings-path` | 13 |
| `transcript` | 13 |
| `model-slug` | 10 |
| `skill-path` | 10 |
| `cloud-agent` | 9 |
| `url` | 8 |
| `tool-name` | 7 |
| `team-kit` | 6 |
| `pr-tool` | 2 |
| `script` | 1 |

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

13 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CD-180 | `skills/poteto-mode/references/bugbot-triage.md:1` | `# Bugbot triage` | bugbot | The reference is built around Cursor Bugbot comments. | keep | Bugbot comments are GitHub review threads, triaged the same from any harness. Repos without Bugbot apply the rubric to other bots. | n/a |
| CD-181 | `skills/poteto-mode/references/bugbot-triage.md:3` | `handles Bugbot or review-automation comments` | bugbot | Assumes Bugbot or Cursor review automations run on the repo. | keep | Harness-agnostic rubric over forge threads. Orca adds nothing here and needs nothing. | n/a |
| CD-182 | `skills/poteto-mode/references/bugbot-triage.md:7` | `Classify each Bugbot thread before acting:` | bugbot | Not a dependency: the rubric classifies Bugbot comments, which are ordinary GitHub review threads. | keep | Triage the threads with `gh` as usual. The rubric is unused when the PR has no Bugbot comments. | n/a |
| CD-183 | `skills/poteto-mode/references/bugbot-triage.md:9` | `then reply with the commit SHA and resolve the thread` | pr-tool | Thread reply and resolve was historically done via Cursor's PR tool. | keep | Use `gh api` replies plus a GraphQL `resolveReviewThread`, or `origin pr thread reply`, both available outside Cursor. | n/a |
| CD-184 | `skills/poteto-mode/references/bugbot-triage.md:36` | `the Bugbot comment is only restating that a shared visual default changed.` | bugbot | Not a dependency: this is a rubric entry about Bugbot's GitHub comments. | keep | Applies to GitHub threads read via `gh`. It is unused when no Bugbot comments exist. | n/a |
| CD-185 | `skills/poteto-mode/references/bugbot-triage.md:40` | `### Upstack or stack-local usage Bugbot cannot see` | bugbot | Not a dependency: this is a rubric heading about Bugbot comments. | keep | Same as above. It is triaged with `gh`. | n/a |
| CD-186 | `skills/poteto-mode/references/bugbot-triage.md:43` | `Skip when: Bugbot flags an export, component, helper, or file as unused,` | bugbot | Not a dependency: this is a rubric entry about Bugbot comments. | keep | Verify upstack use with `gh pr diff` across the stack. | n/a |
| CD-187 | `skills/poteto-mode/references/bugbot-triage.md:71` | `or a later Bugbot reply explicitly says the finding is withdrawn` | bugbot | Bugbot-specific behavior pattern. | keep | Only a pattern description, with no runtime dependency. | n/a |
| CD-188 | `skills/poteto-mode/references/bugbot-triage.md:93` | `Bugbot's logic-bug findings against that code have been consistently legitimate.` | bugbot | Not a dependency: this is a rubric entry about Bugbot comments. | keep | It is triaged via `gh`. | n/a |
| CD-189 | `skills/poteto-mode/references/bugbot-triage.md:96` | `- Source: one sticky-occlusion PR: six Bugbot passes, roughly eighteen findings,` | bugbot | Not a dependency: it is a historical source note. | keep | No action. | n/a |
| CD-190 | `skills/poteto-mode/references/bugbot-triage.md:103` | `snapshot of doc wording), and Bugbot claims "the test no longer` | bugbot | Not a dependency: this is a rubric entry about Bugbot comments. | keep | Run the contract test locally. This is harness-neutral. | n/a |
| CD-191 | `skills/poteto-mode/references/bugbot-triage.md:113` | `one prose-pinning PR with eight Bugbot passes; the claim was real on` | bugbot | Not a dependency: it is a historical source note. | keep | No action. | n/a |
| CD-192 | `skills/poteto-mode/references/bugbot-triage.md:119` | `An agentic security review (or similar) claims a missing authz` | bugbot | Refers to Cursor's agentic security-review automation. | keep | Pattern text only, and it applies to any security reviewer's threads. | n/a |

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

10 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CD-668 | `agents/comment-sicko.md:3` | `description: A deranged comment-hater` | subagent-field | Cursor plugin custom-agent file. Its fields (name, description only) are portable, but registration differs per harness. | agent-native | Claude Code `pstack:comment-sicko` via plugin `agents/` or `~/.claude/agents/`; Grok `~/.grok/agents/comment-sicko.md`; Codex custom agent TOML, or an Orca worker with the body as `--spec`. | todo |
| CD-669 | `agents/comment-sicko.md:26` | `` I run `/how`, `/why`, or both from the **how** and **why** skills `` | tool-name | A subagent slash-invoking skills, which needs Cursor's shared catalog. | agent-native | Read `<pstack>/skills/how/SKILL.md` and `why/SKILL.md`. In Grok the child cannot spawn the why investigators (depth 1), so it runs them inline; an Orca worker is a top-level session and can fan out. | todo |
| CD-670 | `agents/poteto-agent.md:3` | `` Spawn a fresh `poteto-agent` for each new task, and resume `` | subagent-field | Cursor Task `resume`. | agent-native | Claude Code: `SendMessage` to the agent id, or a new spawn with the prior result pasted in. Grok: `resume_from`. Orca: `orca orchestration send --to dispatch:<id>`. | todo |
| CD-671 | `agents/poteto-agent.md:3` | `` Substituting `generalPurpose` skips that read and drifts. `` | subagent-field | Cursor subagent_type slug `generalPurpose`. | agent-native | Claude Code and Grok call it `general-purpose`. | todo |
| CD-672 | `agents/poteto-agent.md:3` | `` spawned during a `/poteto-mode` run `` | cursor-ui | Cursor slash name. | agent-native | `/pstack:poteto-mode` (Claude Code), `$poteto-mode` (Codex), `/poteto-mode` (Grok). | todo |
| CD-673 | `agents/poteto-agent.md:4` | `is_background: true` | subagent-field | This is a Cursor plugin custom-agent file, and `is_background` is a Cursor-only field. | agent-native | Claude Code: plugin `agents/` gives `pstack:poteto-agent`, or copy to `~/.claude/agents/`; drop `is_background` (Agent runs in background by default). Grok: copy to `~/.grok/agents/poteto-agent.md`, drop the field (`spawn_subagent` `run_in_background` defaults true). Codex: convert to a custom agent TOML (`~/.codex/agents/`) with the body as instructions, or use `orca orchestration worker-start --spec "<body>" --agent codex`. | todo |
| CD-674 | `agents/poteto-agent.md:9` | `Your skill catalog hides this skill` | frontmatter | Depends on Cursor hiding disable-model-invocation skills from subagent catalogs. | agent-native | The same holds in Claude Code and Grok (hidden from the model). Codex shows it, which is harmless. Read the file by path either way. | todo |
| CD-675 | `agents/poteto-agent.md:9` | `owns the playbook, the todo list, and every Task spawn` | tool-name | Cursor `Task` tool. | agent-native | `Agent` (Claude Code), `spawn_subagent` (Grok), or Orca `worker-start`. Note that Grok children cannot spawn further (depth 1). | todo |
| CD-676 | `agents/poteto-agent.md:9` | `` search `~/.cursor/plugins/` for a file whose path ends in `` | settings-path | Locates pstack only under the Cursor plugin cache. | agent-native | Search `~/.claude/plugins/` (Claude Code), `~/.grok/plugins` or the configured `[skills] paths` (Grok), and `~/.agents/skills` or `~/.codex/skills` (Codex). Best: the parent always passes the absolute path in the brief or `--spec`. | todo |
| CD-677 | `agents/poteto-agent.md:9` | `` the copy whose `.cursor-plugin/plugin.json` has the highest `version` `` | settings-path | Cursor plugin manifest. | agent-native | `.claude-plugin/plugin.json` in Claude Code. Other harnesses have no manifest; use the path the parent gave. | todo |

## Docs (docs/)

95 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CD-826 | `docs/guide/01-setup.md:7` | `In a Cursor chat, run:` | cursor-ui | Cursor install. | orca | `npx skills add <repo> -g -a claude-code -a codex -a grok`. Check with `orca skills installed`. | todo |
| CD-827 | `docs/guide/01-setup.md:13` | `Cursor confirms the plugin is installed.` | cursor-ui | It describes Cursor's `/add-plugin` confirmation UI. | agent-native | Claude Code: `/plugin install` or a skills dir. Codex: `~/.agents/skills/`. Grok: `~/.grok/skills/`. Confirm by listing the installed skill folder. | todo |
| CD-828 | `docs/guide/01-setup.md:15` | `` run `/plugin marketplace add cursor/plugins`, then `/plugin install pstack@cursor-plugins`. Claude `` | url | Claude install via the Cursor marketplace, with prefix. | agent-native | npx install, unprefixed `/setup-pstack`. Codex `$setup-pstack`. | todo |
| CD-829 | `docs/guide/01-setup.md:25` | `` It writes `~/.cursor/rules/pstack-models.mdc` `` | settings-path | Cursor rule path. | agent-native | Setup surveys the computer and writes the `select-model` skill. The guide says so. | done |
| CD-830 | `docs/guide/01-setup.md:31` | `inherits your parent chat model` | model-slug | Cursor "Auto" model picker. | agent-native | `inherit-parent` means omit `--model` (Orca worker uses the agent's configured default). | todo |
| CD-831 | `docs/guide/01-setup.md:37` | `` it writes `.cursor/skills/verify-<app>/` `` | skill-path | Cursor project skill dir. | agent-native | `.claude/skills/verify-<app>/` plus `.agents/skills/` symlink. | todo |
| CD-832 | `docs/guide/01-setup.md:43` | `After setup, start a new chat. The model rule applies to new sessions.` | cursor-ui | This assumes Cursor's chat UI rule loading. | orca | The next task reads `select-model` on its own. No new chat is needed. | done |
| CD-833 | `docs/guide/01-setup.md:64` | `makes it a [Custom Mode](https://cursor.com/docs/skills#using-a-skill-as-a-custom-mode), which stays in context on` | cursor-ui | Cursor Custom Mode, Agents Window, and CLI. | fallback-only | No Orca equivalent. Use a CLAUDE.md/AGENTS.md line "use poteto-mode for every task", or re-type per message. | todo |
| CD-834 | `docs/guide/02-poteto-mode.md:93` | `` a Custom Mode keeps `/poteto-mode` in context on every turn `` | cursor-ui | Cursor Custom Mode. | fallback-only | Same as 01-setup:64. | todo |
| CD-835 | `docs/guide/02-poteto-mode.md:107` | `` Type `/in-cloud` before the task `` | cursor-ui | Cursor `/in-cloud` built-in. | orca | Replace with "ask the coordinator to start Orca workers on `<environment>`" (`orca environment list`). | todo |
| CD-836 | `docs/guide/02-poteto-mode.md:107` | `[cloud subagent](https://cursor.com/docs/subagents#cloud-subagents). Each one gets its own VM` | cloud-agent | Cursor cloud subagent VM. | orca | `orca orchestration worker-start --on <saved-environment> --worktree new-top-level` or `orca worktree create --host runtime:<id>`. Without an env: local `--worktree new-child`. | todo |
| CD-837 | `docs/guide/02-poteto-mode.md:112` | `branch off <base> in a fresh worktree` | implicit | Worktree creation via Cursor agent. | orca | `orca worktree create --name <n> --base-branch <base> --agent <a> --prompt "..."`. Fallback: `git worktree add`. | todo |
| CD-838 | `docs/guide/02-poteto-mode.md:123` | `which chats still touch it` | transcript | Worktree cleanup reads Cursor chats per worktree. | orca | `orca worktree ps` / `orca worktree list --json` show live terminals and agents per worktree. Remove via `orca worktree rm`. | todo |
| CD-839 | `docs/guide/03-understand.md:33` | `queries whatever evidence categories your MCPs expose` | implicit | Parallel subagents share parent MCPs (Cursor). | agent-native | Claude subagents inherit MCP. Orca cross-vendor workers do not, so keep MCP fan-out within the coordinator's own agent. | todo |
| CD-840 | `docs/guide/03-understand.md:59` | `mines your own recent chats plus the shared record` | transcript | Cursor transcripts. | orca | `orca search "<topic>" --json`. | todo |
| CD-841 | `docs/guide/03-understand.md:65` | `If you want to resume one specific chat, that's the Session` | implicit | Not a dependency: "resume" refers to the session-pickup playbook, which reads on-disk trails. | keep | No action. To find a past chat in Orca, use `orca search "<query>" --path <workspace> --json`. | n/a |
| CD-842 | `docs/guide/03-understand.md:72` | `take over this branch. read the decision log` | implicit | Session pickup may read the prior Cursor chat. | orca | `orca orchestration worker-read --source transcript` / `orca search`. Fallback: decision log and git only. | todo |
| CD-843 | `docs/guide/03-understand.md:75` | `It reconstructs the branch state and decisions, names the resume point,` | implicit | Not a dependency: "resume point" is prose. | keep | No action. | n/a |
| CD-844 | `docs/guide/04-design.md:31` | `each writing to its own worktree` | model-slug | Arena candidates and judge on other model families via Cursor. | orca | Per-candidate `orca orchestration worker-start --worktree new-child --agent codex\|grok\|claude`. Fallback: same family. | todo |
| CD-845 | `docs/guide/04-design.md:47` | `The panel comes from your` | settings-path | Panel lists use Cursor slugs from the `.mdc` rule. | orca | Panel entries become `<agent> <model> <effort>` triples for worker-start. | todo |
| CD-846 | `docs/guide/04-design.md:59` | `fans N workers across independent slices` | implicit | Swarm uses Cursor Task fan-out. | orca | One `orca orchestration task-create` and `worker-start` per slice, then `orca orchestration check --wait`. | todo |
| CD-847 | `docs/guide/04-design.md:69` | `sends the same diff, intent, and rubric to reviewers on different model families` | model-slug | Cross-family review. | orca | worker-start with `--agent codex`, `--agent grok`, and `--agent claude`. | todo |
| CD-848 | `docs/guide/05-build-and-clean.md:59` | `` `/deslop` ships in the `cursor-team-kit` plugin `` | team-kit | Cursor team kit. | fallback-only | Plain-words cleanup, as the text already says. | todo |
| CD-849 | `docs/guide/05-build-and-clean.md:77` | `spawns [Comment Sicko](../../agents/comment-sicko.md)` | subagent-field | Named Cursor subagent. | agent-native | Claude `~/.claude/agents/comment-sicko.md`. Others: Orca worker with agent file as spec. Note `agents/` is not installed by npx. | todo |
| CD-850 | `docs/guide/05-build-and-clean.md:79` | `` `/deslop` cleans slop out of the code, `/unslop` cleans it out `` | team-kit | `/deslop` is a cursor-team-kit skill, not shipped by pstack. | fallback-only | Reread the diff before commit and cut slop with pstack's `unslop` and `no-comments`. | todo |
| CD-851 | `docs/guide/05-build-and-clean.md:81` | `` If the diff feels padded, say `deslop it` before you commit, `` | team-kit | "deslop it" invokes the cursor-team-kit `deslop` skill. | fallback-only | Reread the diff and apply `unslop` and `no-comments` before committing. | todo |
| CD-852 | `docs/guide/06-verify-and-ship.md:61` | `` It writes `.cursor/skills/verify-<app>/` `` | skill-path | Cursor project skill dir. | agent-native | `.claude/skills/` and `.agents/skills/`. | todo |
| CD-853 | `docs/guide/06-verify-and-ship.md:88` | `ideally from a scheduled automation so nobody has to remember` | automation | Cursor Automations schedule. | orca | `orca automations create --name verify-maint --trigger daily --time 03:00 --prompt "/maintain-verification-skill" --provider claude --repo path:<repo>`. | todo |
| CD-854 | `docs/guide/06-verify-and-ship.md:134` | `with a bundled watcher on GitHub or the Origin CLI` | implicit | The Origin CLI is a Cursor-internal forge, and the watcher may assume Cursor wakeups. | fallback-only | GitHub path via `gh pr checks --watch`. Drop the Origin mention. | todo |
| CD-855 | `docs/guide/06-verify-and-ship.md:150` | `One fresh agent per PR proves the behavior live` | implicit | Cursor subagent per PR. | orca | `orca worktree create --pr <n> --agent <a>` or worker-start per PR. | todo |
| CD-856 | `docs/guide/07-overnight.md:3` | `an isolated worktree or cloud agent` | cloud-agent | Cursor cloud agent. | orca | Orca worktree or `--host runtime:<id>` environment. | todo |
| CD-857 | `docs/guide/07-overnight.md:26` | `/loop until done.` | automation | Cursor `/loop`. | agent-native | Claude `/loop`. Codex/Grok: none. Orca: `orca automations create --workspace active --reuse-session --trigger hourly --prompt "continue until <predicate>"`. | todo |
| CD-858 | `docs/guide/07-overnight.md:35` | `` `/loop` is Cursor's built-in wake mechanism `` | automation | Cursor built-in wake loop. | orca | Same as above, or a coordinator loop with `orca orchestration check --wait`. | todo |
| CD-859 | `docs/guide/07-overnight.md:40` | `you're about to go offline or restart Cursor` | cursor-ui | Cursor app restart. | orca | "restart Orca / the agent". Orca terminals persist via terminal-daemon. | todo |
| CD-860 | `docs/guide/07-overnight.md:68` | `spawns a reviewer on a different model family to read the trail and the transcript` | transcript | Cross-family reviewer reading the Cursor transcript. | orca | worker-start `--agent codex` with the transcript from `orca orchestration worker-read --source transcript` or a session file path. | todo |
| CD-861 | `docs/guide/07-overnight.md:70` | `in the chat that ran the work` | transcript | Current Cursor chat. | agent-native | Run in the same Orca agent tab. Reads the local session file. | todo |
| CD-862 | `docs/guide/07-overnight.md:76` | `A swarm of fresh verifiers checks the owner's code-ready head` | implicit | Cursor subagent fan-out. | orca | worker-start per verifier on `--worktree new-child --base-branch <head>`. | todo |
| CD-863 | `docs/guide/07-overnight.md:88` | `fleets of subagents under one standing coordinator chat` | cloud-agent | Cursor Project coordinator. | orca | `orca orchestration coordinator-start`, `run-create`, `task-create --deps`, `worker-start`, and `inbox`. | todo |
| CD-864 | `docs/guide/07-overnight.md:96` | `A [Cursor Project](https://cursor.com/blog/projects) gives one coordinator agent` | cloud-agent | Cursor Projects plus cloud subagents (laptop can close). | orca | Orca orchestration run. Laptop-closed needs a paired server: `orca serve` / `--on <environment>`. Otherwise fallback-only: the local machine must stay awake. | todo |
| CD-865 | `docs/guide/07-overnight.md:100` | `Give each body of work its own Project` | cursor-ui | Cursor Project UI and chat drag. | fallback-only | One Orca run per body of work (`orca orchestration run-create`). No chat drag, so pass context via `--spec` or `orca search` results. | todo |
| CD-866 | `docs/guide/07-overnight.md:108` | `use /recall for context from past chats` | transcript | Cursor chats. | orca | `orca search`. | todo |
| CD-867 | `docs/guide/07-overnight.md:113` | `A scheduled or event-driven automation removes that step. Software maintenance` | automation | Cursor event-driven automations (Slack trigger). | orca | Orca supports schedule only. Emulate events with a cron trigger and `--precheck` that exits 0 only when new input exists. | todo |
| CD-868 | `docs/guide/07-overnight.md:118` | `pstack ships this as a dormant [automation pack](../../automations/benny/README.md) for Slack issue reports.` | automation | The Benny pack targets Cursor Automations. | orca | Set it up as two `orca automations create` jobs with `--precheck` polling the Slack channel. | todo |
| CD-869 | `docs/guide/07-overnight.md:120` | `` Give `/loop` a predicate that can pass or fail. `` | automation | Cursor `/loop`. | orca | Predicate becomes an Orca `--precheck` command or the coordinator's check. | todo |
| CD-870 | `docs/guide/09-make-it-yours.md:13` | `` drafts `.cursor/skills/<your-name>-mode/SKILL.md` through Cursor's built-in `create-skill` flow `` | skill-path | Cursor skill path plus built-in create-skill. | agent-native | `~/.claude/skills/<name>-mode/` or `.agents/skills/`. Claude `skill-creator` or Codex `$skill-creator`. | todo |
| CD-871 | `docs/guide/09-make-it-yours.md:13` | `mines your recent transcripts in the active workspace` | transcript | Cursor transcripts. | orca | `orca search ... --json`. | todo |
| CD-872 | `docs/guide/09-make-it-yours.md:31` | `sends the transcript to three parallel reviewers` | transcript | Cursor transcript plus Task fan-out. | orca | Transcript via session file or `worker-read`. Reviewers via worker-start. | todo |
| CD-873 | `docs/guide/09-make-it-yours.md:60` | `` routes through Cursor's built-in `create-skill` `` | cursor-ui | Cursor built-in. | agent-native | Claude `skill-creator` and Codex `$skill-creator`. Otherwise write SKILL.md directly. | todo |
| CD-874 | `docs/guide/09-make-it-yours.md:96` | `bot over a webhook routine. For example, you could swipe` | automation | Cursor Automations webhook routine. | fallback-only | No Orca webhook. A local server calls `orca automations run <id>` (or `orca agent launch --prompt`), and the per-item payload must go in a file the automation prompt reads. | todo |
| CD-875 | `docs/guide/10-recipes-and-pitfalls.md:5` | `pinned cards reading /how, /tdd, and /loop` | implicit | The image alt text references Cursor `/loop`. | skip | Cosmetic. Alt text only. | todo |
| CD-876 | `docs/guide/10-recipes-and-pitfalls.md:114` | `how do i get poteto-mode to stay on every turn?` | cursor-ui | The answer is Cursor Custom Mode. | fallback-only | poteto-help answer must change to the CLAUDE.md/AGENTS.md line. | todo |
| CD-877 | `docs/guide/10-recipes-and-pitfalls.md:164` | `` "make it better" gives `/loop` nothing to check. `` | automation | Cursor `/loop`. | orca | Reword to "the loop or Orca `--precheck`". | todo |
| CD-878 | `docs/guide/10-recipes-and-pitfalls.md:168` | `Run them as cloud agents, or say "own worktree per attempt".` | cloud-agent | Cursor cloud agents. | orca | Orca workers with `--worktree new-child`, or `--on <environment>`. | todo |
| CD-879 | `docs/guide/10-recipes-and-pitfalls.md:174` | `` **Treating `auto` as a model slug.** `` | model-slug | Cursor "auto" value. | agent-native | Means omit `--model` on Orca worker or Claude Agent. | todo |
| CD-880 | `docs/guide/README.md:7` | `Install the plugin and pick your models.` | cursor-ui | Install flow is Cursor plugin. | orca | "Install with `npx skills add`" (see README:17). | todo |
| CD-881 | `docs/guide/README.md:13` | `Projects and automations that scale past one agent.` | cloud-agent | Cursor Projects and Cursor Automations. | orca | Orca orchestration runs (`orca orchestration run-create`, `coordinator-start`) and `orca automations`. | todo |
| CD-882 | `docs/harness/claude-code.md:3` | `` `<pstack>` means the folder that holds `skills/` and `docs/`. `` | skill-path | This assumes the whole plugin tree is installed, but `npx skills add` copies only skill dirs, so `docs/`, `agents/`, and `README.md` are absent. | fallback-only | Ship needed docs inside skill `references/`, or resolve `<pstack>` to an Orca-known clone path. Otherwise give GitHub URLs. | todo |
| CD-883 | `docs/harness/claude-code.md:3` | `pstack skills use Cursor names. In Claude Code, read this file` | implicit | The whole adapter is Claude-Code-only, with no Codex/Grok/Orca mapping. | orca | Add an `skills/orca-harness/SKILL.md` (or columns) for Codex/Grok and Orca: worker-start, automations, and search. | todo |
| CD-884 | `docs/harness/claude-code.md:7` | `\| Cursor \| Claude Code \|` | tool-name | Not a dependency: this is the header of the Claude Code adapter's Tools mapping table. | keep | Orca sessions use `skills/orca-harness/SKILL.md` instead. This file applies outside Orca in Claude Code. | n/a |
| CD-885 | `docs/harness/claude-code.md:9` | `` `Task` \| `Agent` `` | tool-name | The Cursor Task tool. | agent-native | Claude `Agent`. Codex has no subagent tool, so use `orca orchestration worker-start`. Grok per CLI, else Orca worker. | todo |
| CD-886 | `docs/harness/claude-code.md:10` | `` `AskQuestion` \| `AskUserQuestion`. `` | tool-name | The Cursor AskQuestion tool. | orca | Claude `AskUserQuestion`. Codex/Grok plain text. Orca worker uses `orca orchestration ask` and `orca orchestration gate-create` for decision gates. | todo |
| CD-887 | `docs/harness/claude-code.md:11` | `` Open a todolist \| Use `TodoWrite` `` | tool-name | The Cursor todo list. | agent-native | Claude `TodoWrite`. Codex `update_plan`. Grok: in-reply list. | todo |
| CD-888 | `docs/harness/claude-code.md:12` | `` `Read` `<pstack>/skills/<name>/SKILL.md` and follow it. `` | skill-path | Cursor attaches skills by name. | agent-native | With `npx skills add`, use Claude `Skill` tool / `~/.claude/skills/<name>/SKILL.md` and Codex `~/.agents/skills/<name>/SKILL.md`. | todo |
| CD-889 | `docs/harness/claude-code.md:13` | `` `Grep`, `Glob` \| `Bash` with `rg` `` | tool-name | Cursor tool names. | agent-native | `rg` in Codex/Grok shells. | todo |
| CD-890 | `docs/harness/claude-code.md:17` | `\| Cursor \| Claude Code \|` | subagent-field | Not a dependency: this is the header of the Claude Code adapter's Subagent fields table. | keep | In Orca, orca.md's Workers table replaces it. | n/a |
| CD-891 | `docs/harness/claude-code.md:19` | `subagent_type: generalPurpose` | subagent-field | Cursor subagent type. | orca | Claude `general-purpose`. Orca `--agent <id>`. | todo |
| CD-892 | `docs/harness/claude-code.md:20` | `` `poteto-agent`, `comment-sicko` \| `pstack:poteto-agent` `` | subagent-field | Plugin-prefixed agent names. | agent-native | With npx install there is no `pstack:` prefix. Agents must be copied to `~/.claude/agents/` separately. | todo |
| CD-893 | `docs/harness/claude-code.md:21` | `` `readonly: true` \| `subagent_type: "Explore"` `` | subagent-field | Cursor readonly flag. | fallback-only | Orca has no read-only worker flag. Put "do not edit" in `--spec` and check `git status` in the worker worktree afterward. | todo |
| CD-894 | `docs/harness/claude-code.md:22` | `` `readonly: false` \| `general-purpose`. It keeps the session's MCP servers. `` | implicit | Cursor subagents share parent MCP. | agent-native | Orca workers of other vendors get only their own CLI's MCP config. | todo |
| CD-895 | `docs/harness/claude-code.md:23` | `` `environment: "cloud"` \| `isolation: "worktree"`. `` | cloud-agent | Cursor cloud subagent VM. | orca | `orca orchestration worker-start --worktree new-child --base-branch <b>`. For a real remote machine: `--on <saved-environment>` or `orca worktree create --host runtime:<id>` (per-workspace env recipe). | todo |
| CD-896 | `docs/harness/claude-code.md:24` | `` \| `environment: "local"` \| Omit. \| `` | subagent-field | Not a dependency: this is the Claude Code adapter's mapping for the Task `environment` field. | keep | In Orca the mapping is `--worktree current`, or `new-child` when the worker edits, per orca.md. | n/a |
| CD-897 | `docs/harness/claude-code.md:25` | `cloud_base_branch: <b>` | cloud-agent | Cursor cloud base. | orca | `--base-branch <b>` on worker-start or worktree create. | todo |
| CD-898 | `docs/harness/claude-code.md:26` | `` `run_in_background: true` \| Omit. `` | subagent-field | Cursor background flag. | orca | Orca workers are async by default. Wait with `orca orchestration check --wait`. | todo |
| CD-899 | `docs/harness/claude-code.md:27` | `` `resume` \| Spawn a new agent and paste the earlier result `` | subagent-field | Cursor resume of a subagent. | orca | `orca orchestration send`/`dispatch` to the retained worker (`worker-retain`), or `--retry-of <dispatch_id>`. | todo |
| CD-900 | `docs/harness/claude-code.md:28` | `` `file_attachments` \| List the paths in the brief. `` | subagent-field | Cursor attachment field. | agent-native | Paths in the `--spec`. | todo |
| CD-901 | `docs/harness/claude-code.md:32` | `\| Cursor \| Claude Code \|` | model-slug | Not a dependency: this is the header of the Claude Code adapter's Models table. | keep | In Orca, orca.md's Models table maps slugs to `<agent> <model> <effort>` triples. | n/a |
| CD-902 | `docs/harness/claude-code.md:34` | `` `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` `` | model-slug | Cursor model slugs. | orca | `--agent claude --model opus --effort xhigh`. | todo |
| CD-903 | `docs/harness/claude-code.md:35` | `` A `grok-*`, `gpt-*`, or other non-Claude slug \| Omit `model` `` | model-slug | The adapter drops non-Claude roles. | orca | Orca can honor them: `--agent grok --model <id>` and `--agent codex --model <gpt-id> --effort <lvl>`. | todo |
| CD-904 | `docs/harness/claude-code.md:37` | `~/.cursor/rules/pstack-models.mdc` | settings-path | Cursor rule path. | agent-native | `~/.agents/skills/select-model/SKILL.md`, read by that path. | done |
| CD-905 | `docs/harness/claude-code.md:44` | `` Detect. The detected models are the `model` values that the `Agent` tool schema lists `` | settings-path | Model detection is Claude-only. | orca | The generator reads the models and efforts from the `Agent` tool schema, and from Orca's catalog when Orca is here. | done |
| CD-906 | `docs/harness/claude-code.md:45` | `` Map each default slug with the rows above: `claude-opus-5-5-xhigh` is `opus xhigh`, `` | model-slug | Not a dependency: this is the Claude Code adapter's own slug mapping. | keep | In Orca, `claude-opus-5-5-xhigh` becomes `claude opus xhigh` and `grok-4.7-xhigh-fast` becomes `grok grok-4.7-build-fast xhigh` per orca.md. | n/a |
| CD-907 | `docs/harness/claude-code.md:50` | `\| Cursor \| Claude Code \|` | settings-path | Not a dependency: this is the header of the Claude Code adapter's Paths table. | keep | In Orca, orca.md's Paths table applies. | n/a |
| CD-908 | `docs/harness/claude-code.md:52` | `` `.cursor/skills/`, `~/.cursor/skills/` `` | skill-path | Cursor skill dirs. | agent-native | `~/.claude/skills`, `~/.agents/skills` (Codex), `~/.grok/skills`. Project: `.claude/skills`, `.agents/skills`. | todo |
| CD-909 | `docs/harness/claude-code.md:53` | `` `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` `` | settings-path | Cursor plugin paths. | skip | Not used with npx skills. | todo |
| CD-910 | `docs/harness/claude-code.md:54` | `` `.cursor/rules/*.mdc`, always-applied rules \| `CLAUDE.md` `` | settings-path | Cursor rules. | agent-native | CLAUDE.md, or AGENTS.md (Codex/Grok). | todo |
| CD-911 | `docs/harness/claude-code.md:55` | `https://github.com/cursor/plugins/blob/main/pstack/<path>` | url | Links into the Cursor repo. | fallback-only | With npx install the local `<pstack>/docs` does not exist, so link to the fork's GitHub URL. | todo |
| CD-912 | `docs/harness/claude-code.md:56` | `` Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` `` | transcript | Cursor transcript path. | orca | `orca search ... --json`. Fallback: `~/.claude/projects/<slug>/*.jsonl`, `~/.codex/sessions/`. | todo |
| CD-913 | `docs/harness/claude-code.md:58` | `## Cursor-only features` | cursor-ui | Not a dependency: this is a section heading in the Claude Code adapter. | keep | In Orca, orca.md's Cursor-only features table applies. | n/a |
| CD-914 | `docs/harness/claude-code.md:60` | `Claude Code has no Cursor Automations, Bugbot, Cursor cloud agents` | automation | This blanket-skips Cursor-only features. | orca | Automations map to `orca automations create/edit/run`. Cloud agents map to Orca worktrees/environments. Bugbot and PR tool stay as written. | todo |
| CD-915 | `docs/harness/claude-code.md:62` | `\| Cursor \| Claude Code \|` | cursor-ui | Not a dependency: this is the header of the Claude Code adapter's Cursor-only features table. | keep | In Orca, orca.md's table applies. | n/a |
| CD-916 | `docs/harness/claude-code.md:64` | `` `SendToUser` secret requests `` | automation | Cursor secret prompt. | fallback-only | No Orca secret store. Ask the user to set env vars on the host (or the per-workspace env recipe). | todo |
| CD-917 | `docs/harness/claude-code.md:64` | `` routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks `` | automation | Cursor routine state and webhooks. | fallback-only | Orca automations have no state API or webhook. Persist state in a file in the `--workspace` worktree (with `--reuse-session`) and trigger via `orca automations run <id>` from a local listener. | todo |
| CD-918 | `docs/harness/claude-code.md:65` | `Bugbot` | bugbot | Cursor Bugbot. | fallback-only | Triage Bugbot comments with `gh`. Skip start/configure steps. | todo |
| CD-919 | `docs/harness/claude-code.md:66` | `Cursor cloud agents` | cloud-agent | Cursor cloud dashboard/machine. | orca | `orca worktree create --host runtime:<env-id>` or worker-start `--on <env>`. Status via `orca orchestration worker-show` / `orca worktree ps`. | todo |
| CD-920 | `docs/harness/claude-code.md:67` | `A built-in PR tool \| Use the forge command` | pr-tool | Cursor PR tool. | agent-native | `gh pr create`. Orca links PRs with `orca worktree create --pr <n>`. | todo |

## README and plugin manifests

48 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CD-921 | `.cursor-plugin/plugin.json:2` | `"name": "pstack",` | settings-path | The Cursor-only plugin manifest is used by `/add-plugin`. | skip | Not read by `npx skills add`, Claude Code `~/.claude/skills`, Codex `~/.agents/skills`, or Grok. Delete it or leave it inert. | todo |
| CD-922 | `.cursor-plugin/plugin.json:9` | `"homepage": "https://github.com/cursor/plugins/tree/main/pstack",` | url | These URLs point at the Cursor monorepo. | skip | Drop with the file, or repoint if the file is kept. | todo |
| CD-923 | `.cursor-plugin/plugin.json:10` | `"repository": "https://github.com/cursor/plugins",` | url | This is metadata in the Cursor plugin manifest and points at Cursor's plugin repo. | keep | Orca and the other agents load skills from skill folders and never read `.cursor-plugin/plugin.json`. The fork's real source is `ynginkim/pstack-orca`. | n/a |
| CD-924 | `.cursor-plugin/plugin.json:12` | `"logo": "assets/logo.png",` | cursor-ui | The logo is for the Cursor marketplace UI. | skip | No skills-CLI equivalent. `orca skills share` bundles have no logo field. | todo |
| CD-925 | `.cursor-plugin/plugin.json:29` | `"skills": "./skills/",` | skill-path | Cursor reads the skill root from the manifest. | agent-native | The skills CLI auto-discovers `skills/`. Install with `npx skills add <repo> -g -a claude-code` (→ ~/.claude/skills), `-a codex` (→ ~/.agents/skills), and `-a grok` (→ ~/.grok/skills), or use `orca skills install`-style pinned `npx skills@<v> add <repo>/tree/<commit>`. Confirm agent ids with `npx skills add --help`. | todo |
| CD-926 | `.cursor-plugin/plugin.json:30` | `"agents": "./agents/"` | subagent-field | Cursor installs `poteto-agent` and `comment-sicko` as named subagent types from the manifest, but `npx skills add` installs skills only. | agent-native | Claude Code: copy `agents/*.md` to `~/.claude/agents/` with a separate install step. Codex and Grok have no subagent-definition dir, so skills must inline the agent brief or launch it as an Orca worker (`orca orchestration worker-start --spec "<agents/poteto-agent.md contents + task>" --agent codex`). | todo |
| CD-927 | `README.md:3` | `i've worked with millions of lines of code at Meta, Netflix, and Cursor.` | implicit | Not a dependency: this is the author's bio naming Cursor as an employer. | keep | No action. It is prose. | n/a |
| CD-928 | `README.md:7` | `this turns cursor into a real engineering team.` | implicit | The product framing assumes Cursor is the host. | skip | Reword for Orca, which hosts Claude Code, Codex, and Grok. | todo |
| CD-929 | `README.md:11` | `**cursor gives you the best of all worlds.** every frontier model` | implicit | Multi-model claims assume Cursor's single picker across vendors, where one subagent call can pick any model family. | orca | Orca supplies cross-vendor workers: `orca orchestration worker-start --agent codex\|claude\|grok --model <id> --effort <lvl>`. Outside Orca: single vendor only, so panels collapse to the session model. | todo |
| CD-930 | `README.md:18` | `/add-plugin pstack` | cursor-ui | This is the Cursor-only install command. | orca | Replace with `npx skills add <owner>/pstack-orca -g -a claude-code -a codex -a grok`, or point to `orca skills share` / Orca Settings → Skills. | todo |
| CD-931 | `README.md:24` | `/plugin marketplace add cursor/plugins` | url | The Claude Code instructions install from the Cursor marketplace repo. | agent-native | Replace with the `npx skills add` line above. Claude Code `/plugin` is only needed if agents/ must also ship. | todo |
| CD-932 | `README.md:25` | `/plugin install pstack@cursor-plugins` | url | This Claude Code install command pulls pstack from the `cursor/plugins` marketplace. | agent-native | Claude Code: `/plugin marketplace add` plus `/plugin install`, or a skills-CLI install into `~/.claude/skills/`. Codex: `~/.agents/skills/`. Grok: `~/.grok/skills/`. Install from `ynginkim/pstack-orca` to get the Orca adapter. | todo |
| CD-933 | `README.md:28` | `a step that needs a cursor-only feature, such as bugbot or automations, is skipped` | automation | This assumes automations and bugbot have no non-Cursor equivalent. | orca | Automations map to `orca automations create`. Bugbot stays fallback-only (treat Bugbot PR comments as ordinary review threads via `gh`). | todo |
| CD-934 | `README.md:28` | `` so `/poteto-mode` is `/pstack:poteto-mode`. `` | skill-path | The `/pstack:` prefix only applies to Claude plugin installs. | agent-native | With `npx skills add`, skills are unprefixed: Claude Code `/poteto-mode`, Codex `$poteto-mode` (or `/skills`), and Grok `/poteto-mode` per its skills UI. | todo |
| CD-935 | `README.md:30` | `` from [`harness/pstack/`](https://github.com/cursor/plugins/tree/main/harness/pstack) `` | script | The generated harness tree and `scripts/generate-pstack-harness-trees.mjs` live in the Cursor monorepo, which is not in this fork. | skip | Drop. For npx distribution the repo itself is the install source, and no generated copy is needed. | todo |
| CD-936 | `README.md:36` | `` run [`/setup-pstack`](./skills/setup-pstack/SKILL.md), pick a reasoning budget `` | settings-path | setup-pstack writes `~/.cursor/rules/pstack-models.mdc`. | agent-native | Claude: `~/.claude/rules/pstack-models.md`. Codex: `~/.codex/AGENTS.md` or a section it includes. Grok: its user rules/AGENTS file. Orca: role values become `--agent/--model/--effort` on worker-start. | todo |
| CD-937 | `README.md:41` | `go to grok, while` | model-slug | The defaults assume one host can spawn both Grok and Opus subagents (Cursor slugs). | orca | `orca orchestration worker-start --agent grok --model <id>` for code roles and `--agent claude --model opus --effort xhigh` for judgment. Outside Orca: run everything on the session model. | todo |
| CD-938 | `README.md:47` | `type your task, so cursor attaches the skill to the` | cursor-ui | Cursor attaches skill files from the `/` menu. | agent-native | Claude Code: type `/poteto-mode`. Codex: `$poteto-mode`. Grok: `/poteto-mode`. Under Orca, `orca agent launch --agent <a> --prompt "/poteto-mode ..."`. | todo |
| CD-939 | `README.md:86` | `resume or take over a prior agent's in-flight work.` | implicit | Not a dependency: "resume" here is prose about the session-pickup playbook, not the Task `resume` field. | keep | No action. Session pickup reads on-disk trails, which works in any harness. | n/a |
| CD-940 | `README.md:104` | `makes it a [custom mode](https://cursor.com/docs/skills#using-a-skill-as-a-custom-mode), which cursor offers in the` | cursor-ui | Cursor Custom Mode keeps a skill pinned every turn. | fallback-only | No Orca equivalent. Claude Code: put "always follow skills/poteto-mode" in project CLAUDE.md, or an output style. Codex/Grok: an AGENTS.md line. Otherwise re-invoke per message. | todo |
| CD-941 | `README.md:106` | `` works extremely well with cursor's `/loop` command `` | automation | Cursor `/loop` is a built-in wake/heartbeat loop. | agent-native | Claude Code `/loop` skill exists. Codex/Grok have none. With Orca: `orca automations create --trigger hourly --workspace active --reuse-session --prompt "continue; check finish condition"`, or a coordinator loop with `orca orchestration check --wait`. | todo |
| CD-942 | `README.md:130` | `discovers available MCPs at run time and queries each evidence category in parallel` | implicit | This assumes parallel subagents inherit the parent's MCP servers, as Cursor's do. | agent-native | Claude Code general-purpose subagents keep MCP. Orca workers in other agents only see MCPs configured for that agent CLI, so run MCP queries in the coordinator or same-vendor subagent. | todo |
| CD-943 | `README.md:131` | `rebuilt from your own chat history and the shared record` | transcript | /recall reads `~/.cursor/projects/*/agent-transcripts`. | orca | `orca search "<topic>" --json` searches indexed sessions across Claude, Codex, and Grok. Fallback: `~/.claude/projects/<slug>/*.jsonl` and `~/.codex/sessions/**`. | todo |
| CD-944 | `README.md:132` | `what changed in this chat since your last message` | transcript | /ketchup reads the current Cursor chat transcript. | agent-native | Claude: current `.jsonl`. Codex: `~/.codex/sessions`. In Orca, use `orca orchestration worker-read --source transcript` for workers. | todo |
| CD-945 | `README.md:135` | `you want N parallel attempts at the same thing` | implicit | /arena relies on Cursor `Task` with per-candidate model and worktree. | orca | `orca orchestration worker-start --spec ... --worktree new-child --agent <a> --model <m>` per candidate, then `orca orchestration check --wait`. Fallback: same-vendor subagents with `isolation: worktree`. | todo |
| CD-946 | `README.md:137` | `you have a diff and want different models to try to break it` | model-slug | Cross-family review assumes Cursor's multi-vendor subagents. | orca | One `orca orchestration worker-start --agent codex\|grok\|claude` per reviewer. Fallback: single-family panel, noted in reply. | todo |
| CD-947 | `README.md:138` | `` you want your own `-mode` skill, drafted from how you've actually worked `` | transcript | automate-me mines Cursor transcripts and uses Cursor `create-skill`. | orca | Mine with `orca search`. Write to `~/.claude/skills/<name>-mode` or `~/.agents/skills/<name>-mode`. | todo |
| CD-948 | `README.md:139` | `buttons wake a Grok Bot over a webhook` | automation | make-bot-ui depends on Cursor Automations webhooks (`api2.cursor.sh/automations`). | fallback-only | Orca automations have no webhook trigger, only schedule plus `--precheck`. The degraded path is a local server that calls `orca automations run <id>` on button press. | todo |
| CD-949 | `README.md:140` | `detects your models and writes a config rule` | settings-path | This detects models from the Cursor model list and writes an `.mdc` rule. | agent-native | Detect from `orca agent launch --help` / worker-start notes plus each CLI's model list, then write per-agent rule files (see README:36 row). | todo |
| CD-950 | `README.md:142` | `mines history for mistake classes` | transcript | /correct partly reads Cursor history. | orca | `orca search` and git history. Fallback: git log/PR review comments only. | todo |
| CD-951 | `README.md:150` | `generates a project-local verify skill` | skill-path | Writes `.cursor/skills/verify-<app>/`. | agent-native | `.claude/skills/verify-<app>/` and `.agents/skills/verify-<app>/` (symlink one to the other). | todo |
| CD-952 | `README.md:213` | `` ships [`subagent_type: "poteto-agent"`](./agents/poteto-agent.md) as the wrapper `` | subagent-field | The named Cursor subagent type is installed via the plugin manifest. | agent-native | Claude: `~/.claude/agents/poteto-agent.md`. Codex/Grok: Orca worker with `--spec` prefixed "read skills/poteto-mode/SKILL.md in full first". | todo |
| CD-953 | `README.md:213` | `` substituting `generalPurpose` skips that read and drifts. `` | subagent-field | `generalPurpose` is the Cursor subagent type name. | agent-native | Claude `general-purpose`. Orca `--agent claude\|codex\|grok`. | todo |
| CD-954 | `README.md:215` | `` and [`subagent_type: "poteto-agent"`](./agents/poteto-agent.md) route through the same wrapper. `` | subagent-field | `subagent_type: "poteto-agent"` is a field of Cursor's Task tool, backed by `agents/poteto-agent.md`. | orca | For your own agent, use the native subagent tool. For another agent, use `orca orchestration worker-start --agent <agent> --spec "Read <pstack>/poteto-mode/SKILL.md in full, including its Principles section, before any work. ..."`. | todo |
| CD-955 | `README.md:217` | `` available as `subagent_type: "comment-sicko"` `` | subagent-field | Cursor named subagent. | agent-native | Claude `~/.claude/agents/comment-sicko.md`. Others: Orca worker with the agent file as `--spec` prefix. | todo |
| CD-956 | `README.md:259` | `` ship in the `cursor-team-kit` plugin. `` | team-kit | `/deslop` comes from the Cursor team kit. | fallback-only | Not available. Ask in plain words ("remove narrating comments, unsupported guards..."), as guide 05:59 already says. | todo |
| CD-957 | `README.md:260` | `` - `control-cli` (for CLIs and TUIs) and `` | team-kit | App-control skills come from the Cursor team kit. | orca | control-ui maps to `orca` browser verbs (`orca goto/snapshot/click/screenshot --worktree`) and `orca computer ...`. control-cli maps to `orca terminal create/send/read/wait`. | todo |
| CD-958 | `README.md:261` | `` `/create-skill` is a cursor built-in. cursor also ships a built-in `/autopilot` `` | cursor-ui | These are Cursor built-in skills. | agent-native | Claude: `skill-creator`/write SKILL.md directly. Codex: `$skill-creator`. `/autopilot` maps to the babysit playbook. | todo |
| CD-959 | `README.md:263` | `` install `cursor-team-kit` alongside pstack `` | team-kit | Install advice is Cursor-only. | skip | Drop. | todo |
| CD-960 | `README.md:267` | `cursor already has a great plan mode` | cursor-ui | Cursor plan mode. | agent-native | Claude Code plan mode (shift+tab). Codex `/plan`-style read-only approval mode. Grok per CLI. | todo |
| CD-961 | `README.md:273` | `` it mines your recent transcripts, drafts a `<your-name>-mode` skill `` | transcript | Cursor transcripts. | orca | `orca search` and per-agent session dirs. | todo |
| CD-962 | `README.md:275` | `writes a small always-applied rule mapping each role` | settings-path | Cursor always-applied `.mdc` rule. | agent-native | Claude `~/.claude/rules/*.md`. Codex/Grok AGENTS.md. | todo |
| CD-963 | `README.md:279` | `## automations` | automation | This section heading introduces the Benny pack, which is built on Cursor Automations. | orca | Use `orca automations create`, which runs on a schedule only. For Slack triggers, poll with `--precheck <command>`. Secrets come from the host environment. | todo |
| CD-964 | `README.md:281` | `its files are not registered as slash skills.` | skill-path | This relies on the Cursor manifest scoping skills to `./skills/`. | fallback-only | `npx skills add` may discover nested `automations/benny/skills/*/SKILL.md`. Install with explicit `--skill` names or exclude, and verify with `npx skills add <repo> --list`. | todo |
| CD-965 | `README.md:283` | `` set it up, point cursor at [`FOR_AGENTS.md`](./automations/benny/FOR_AGENTS.md). setup copies the `` | automation | Benny is Cursor-only. | orca | Port to `orca automations create` (see benny rows). | todo |
| CD-966 | `plugin.json:2` | `"$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"` | frontmatter | This plugin manifest schema is read by Cursor/Claude plugin installers, and `npx skills add` ignores it. | keep | Harmless metadata. `npx skills add` discovers `skills/*/SKILL.md` directly, so the manifest is optional for distribution into ~/.claude/skills, ~/.agents/skills, and ~/.grok/skills. | n/a |
| CD-967 | `plugin.json:9` | `"homepage": "https://github.com/cursor/plugins/tree/main/pstack"` | url | The homepage points at the Cursor plugins monorepo. | orca | Repoint to the fork that `npx skills add <owner>/<repo>` will install from, for example `npx skills add <owner>/pstack-orca -g -a claude-code -a codex`. | todo |
| CD-968 | `plugin.json:10` | `"repository": "https://github.com/cursor/plugins"` | url | The repository is the Cursor monorepo, and that is not the install source for skills CLI. | orca | Change to the Orca fork's repo URL. The skills CLI resolves `<owner>/<repo>` or a full git URL. | todo |
