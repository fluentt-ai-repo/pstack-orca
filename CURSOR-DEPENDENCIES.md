# Cursor dependencies in pstack

Every place where upstream pstack ([`cursor/plugins/pstack`](https://github.com/cursor/plugins/tree/main/pstack)) depends on Cursor, and how this fork handles it in Orca. The rules these rows apply live in [`skills/resolve-capability/SKILL.md`](./skills/resolve-capability/SKILL.md). This file is the checklist that proves nothing was missed.

78 rows. Locations refer to the `upstream` branch.

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
| `agent-native` | 39 |
| `keep` | 18 |
| `orca` | 14 |
| `fallback-only` | 4 |
| `skip` | 3 |

| Category | Rows |
| --- | --- |
| `frontmatter` | 23 |
| `bugbot` | 12 |
| `implicit` | 9 |
| `automation` | 5 |
| `cursor-ui` | 5 |
| `transcript` | 5 |
| `subagent-field` | 4 |
| `settings-path` | 3 |
| `skill-path` | 3 |
| `team-kit` | 3 |
| `model-slug` | 2 |
| `url` | 2 |
| `pr-tool` | 1 |
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

0 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Docs (docs/)

0 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## README and plugin manifests

39 rows.

| ID | Location | Excerpt | Category | Cursor dependency | Handling | Orca handling and fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
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
