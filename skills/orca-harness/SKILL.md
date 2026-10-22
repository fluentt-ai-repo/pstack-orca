---
name: orca-harness
description: Maps pstack's Cursor names (Task, AskQuestion, model slugs, environment cloud, /loop, Automations, transcripts) to Orca and the agent it runs. Read before following any pstack skill when ORCA_CLI_BIN_DIR or ORCA_CLI_COMMAND is set.
disable-model-invocation: true
---

# pstack in Orca

pstack skills use Cursor names. In [Orca](https://github.com/stablyai/orca), read this file once per session, then map each Cursor name in a skill with the tables below. Every Cursor-dependent line in pstack, with its handling, is listed in [`CURSOR-DEPENDENCIES.md`](https://github.com/ynginkim/pstack-orca/blob/main/CURSOR-DEPENDENCIES.md). This file is the rule set those rows apply.

You are in Orca when the `ORCA_CLI_BIN_DIR` or `ORCA_CLI_COMMAND` environment variable is set. Orca terminals set only `ORCA_CLI_BIN_DIR`. Orca chat sessions set both. Run Orca commands with `$ORCA_CLI_COMMAND` when it is set, otherwise with `orca`, which is on PATH in Orca terminals (`$ORCA_CLI_BIN_DIR/orca` if it is not). Below, `orca` stands for that executable. Outside Orca, skip this file. In Claude Code outside Orca, use `docs/harness/claude-code.md`.

`<pstack>` means the folder that holds this skill's folder, such as `~/.claude/skills/` or `~/.agents/skills/`. A pstack skill named `name` is at `<pstack>/name/SKILL.md`. `docs/` and `agents/` are not installed with the skills. Read them from `https://github.com/ynginkim/pstack-orca/blob/main/<path>`.

## Why Orca changes pstack

Cursor's `Task` tool spawns a subagent on any vendor's model. Claude Code and Codex spawn subagents only on their own vendor's models, so a pstack panel such as `claude-opus-5-5-xhigh` with `grok-4.7-xhigh-fast` collapses to one family there. Orca runs Claude Code, Codex, and Grok side by side and starts any of them as a supervised worker. pstack's cross-family panels become real again.

## Route each spawn

Read the role's line in the settings file (see Models). Then:

| The role's agent | Spawn with |
| --- | --- |
| Your own agent (a Claude role while you are Claude Code) | Your native subagent tool: `Agent` in Claude Code, `spawn_agent` in Codex, `spawn_subagent` in Grok. It is faster, and it keeps your MCP servers. |
| Another agent | An Orca worker. See Workers. |
| `inherit-parent` or `auto` | Your native subagent tool on your own model. |

A subagent that needs an MCP server stays native even when its role names another agent. An Orca worker loads only its own agent's MCP config and never inherits yours. Say so in your reply when this cost the panel its diversity.

## Workers

Start one Run per skill invocation, then one worker per seat. Start the full wave before you wait.

```text
orca orchestration run-create --objective "<skill>: <task>" --json
orca orchestration worker-start --spec "<brief>" --agent <agent> --model <model> --effort <effort> --worktree <placement> --json
orca orchestration check --wait --types worker_done,escalation,question --timeout-ms 900000 --json
```

Before your first worker, run `orca skills get orchestration` and follow its coordinator loop. It is the version-matched contract for `check`, `--ack`, `worker-release`, and recovery. This file maps pstack onto it and does not replace it.

| Cursor `Task` field | Orca worker |
| --- | --- |
| `subagent_type: generalPurpose`, `poteto-agent` | `--agent <agent>`. For `poteto-agent`, start the spec with "Read `<pstack>/poteto-mode/SKILL.md` in full, including its Principles section, before any work." |
| `model: <cursor slug>` | `--agent`, `--model`, and `--effort` from the role's line. See Models. |
| `readonly: true` | No flag exists. Put "Read-only. Do not edit, commit, or push." in the spec, use `--worktree current`, and check `git status` after the worker settles. |
| `readonly: false` | `--worktree new-child` so its edits land in its own checkout. |
| `environment: "cloud"` | `--worktree new-top-level`. Add `--on <saved-environment>` when `orca environment list` has one and the work must survive this machine sleeping. |
| `environment: "local"` | `--worktree current`, or `new-child` when it edits. |
| `cloud_base_branch: <b>` | `--base-branch <b>`. Only valid with `new-child` or `new-top-level`. |
| `run_in_background: true` | Omit. Workers are always asynchronous. |
| `resume` | A fresh worker with consolidated scope, per poteto-mode's Subagents section. When the work strictly needs the old worker's state, `orca orchestration send --to dispatch:<id>`. |
| `file_attachments` | List the paths in the spec. |
| The subagent's final message | The worker writes its result to a file and names it in `worker_done --report-path`. Read that file, or `orca orchestration worker-read --dispatch <id> --source transcript`. |

Every spec ends with: "Write your full result to `<report path>`. Then send `worker_done` with `--report-path` as your preamble instructs."

Orca refuses `--model` and `--effort` for Grok. `worker-start` exits 1 with `Agent grok does not support launch-time model selection. Omit --model to run the model from its own config.` Start a Grok worker with `--agent grok` alone. It runs the model in `~/.grok/config.toml`, and `worker-show` reports `launch.effective` as null. Read the model that actually ran from the Grok session record (`current_model_id` in `~/.grok/sessions/<url-encoded cwd>/<session>/summary.json`) and say so in your reply.

## Models

The settings file is `~/.agents/pstack-models.md`. Skills read it at the start of a task. `/setup-pstack` writes it. Each role line is `<role>: <agent> <model> <effort>`, and panel roles list several triples separated by commas:

```text
# budget: high
feature, refactoring: grok grok-4.7-build-fast xhigh
judgment and prose: claude opus xhigh
interrogate reviewers: claude opus xhigh, grok grok-4.7-build-fast xhigh, codex gpt-6.1-sol xhigh
```

Valid agents, models, and efforts are the entries in `$ORCA_USER_DATA_PATH/agent-model-catalog.json`:

```bash
jq -r '.entries[] | .agent as $a | .discovered.models[]? | "\($a) \(.id) \([.efforts[]?.value] | join(","))"' \
  "$ORCA_USER_DATA_PATH/agent-model-catalog.json"
```

| Cursor | Orca |
| --- | --- |
| `claude-<family>-<version>-<effort>`, such as `claude-opus-5-5-xhigh` | `claude <family> <effort>`, such as `claude opus xhigh` |
| `grok-4.7-xhigh-fast` | `grok grok-4.7-build-fast xhigh` |
| `gpt-*` | `codex <model id from the catalog> <effort>` |
| `composer-*`, `cursor-grok-*` | `grok grok-4.7-build-fast xhigh` |
| `-fast` suffix | The model id is the speed. No speed flag exists. |
| `auto`, `inherit-parent` | Omit `--model` and `--effort`. The worker uses its agent's configured default. |
| The Task tool rejects a slug | `worker-start` exits 1 with `failedStage`. Use the role's default once and say so. Never guess a second id. |

Raising or lowering a role's effort moves along that model's `efforts` list in the catalog and stops at its ends.

## Tools

| Cursor | Orca session |
| --- | --- |
| `Task` | See Route each spawn. |
| `AskQuestion` | `AskUserQuestion` in Claude Code. Plain text with numbered options in Codex and Grok. Inside an Orca worker, `orca orchestration ask --question "<q>" --options "<a,b>"` so the coordinator answers. |
| Open a todolist | `TodoWrite` in Claude Code, `update_plan` in Codex. Otherwise keep the list in your reply. |
| Run another pstack skill (`/name`, "the **name** skill") | Read `<pstack>/<name>/SKILL.md` and follow it. |
| `Grep`, `Glob` | `rg` when your session has no such tool. |
| `create-skill` | Claude Code `skill-creator`, Codex `$skill-creator`. Otherwise follow agentskills.io and pstack's authoring-a-skill playbook. |
| `deslop` (cursor-team-kit) | Reread the diff before commit and cut slop with pstack's `unslop` and `no-comments`. |
| `control-ui` (cursor-team-kit) | Orca's browser: `orca goto`, `orca snapshot`, `orca click`, `orca fill`, `orca screenshot`, `orca eval`. Native windows: `orca computer`. Mobile: `orca emulator`. Run `orca skills get orca-cli` or `orca skills get computer-use` first. |
| `control-cli` (cursor-team-kit) | `orca terminal create --command`, `orca terminal send --enter`, `orca terminal read`, `orca terminal wait --for tui-idle`. |
| Built-in PR tool | `gh pr create`, then `orca reference add <pr-url> --worktree active` so Orca links the PR. |
| Origin forge CLI | Absent. Every step that checks `command -v origin` falls through to `gh`. |

## Waking and loops

| Cursor | Orca session |
| --- | --- |
| `/loop` in this chat | Claude Code has `/loop`. In Codex and Grok, block on the event instead: `orca orchestration check --wait` for workers, or `orca terminal wait --for exit` on a watcher. |
| `/loop 1h` heartbeat for a long program | `orca automations create --name <program> --trigger hourly --workspace active --reuse-session --provider <agent> --prompt "<tick prompt>"`. Remove it with `orca automations remove` when the program ends. |
| `watch-pr` under `/loop` | `orca terminal create --title watch-pr --command "<pstack>/poteto-mode/scripts/watch-pr/watch-pr <args>"`, then `orca terminal wait --for exit`. Re-arm after each push. |
| A watcher subagent that wakes the parent | A worker whose spec says to send `worker_done` on the event. The parent waits on `check --wait`. |

## Transcripts

| Cursor | Orca session |
| --- | --- |
| `agent-transcripts/` named in the system prompt | Your own session: Claude Code `~/.claude/projects/<slug>/<session>.jsonl`, Codex `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` filtered on `payload.cwd`, Grok `~/.grok/sessions/<url-encoded cwd>/`. |
| Past chats across agents | `orca search "<query>" --path <workspace> --json`. It covers Claude Code, Codex, and Grok sessions Orca hosted. Read only the active workspace's results. |
| A worker's transcript | `orca orchestration worker-read --dispatch <id> --source transcript`. |
| A cloud-agent URL | `orca reference find <pr-or-issue-url> --json` lists the workspaces and agents tied to it. |

## Paths

| Cursor | Orca session |
| --- | --- |
| `~/.cursor/rules/pstack-models.mdc` | `~/.agents/pstack-models.md`. See Models. |
| `.cursor/skills/`, `~/.cursor/skills/` | Project `.claude/skills/` and `.agents/skills/`. User `~/.claude/skills/`, `~/.agents/skills/` (Codex), `~/.grok/skills/`. |
| `.cursor/rules/*.mdc` | `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex and Grok. |
| `.cursor/worktrees/` | `orca worktree list --json`. Remove an Orca worktree with `orca worktree rm`, never `git worktree remove`, so Orca forgets it. |
| The agent store named in the system prompt | `~/.pstack/store/<repo-slug>/`. Name it in every worker spec. |
| `pstack/skills/...` inside the target repo | `<pstack>/...`. Read the installed copy, not `git show origin/main:pstack/...`. |

## Cursor-only features

| Cursor | Orca session |
| --- | --- |
| Cursor Automations | `orca automations create`. Orca triggers on a schedule only. For an event trigger, poll with `--precheck <command>` that exits 0 only when new input exists, and hand the input to the run through a state file. Orca has no secret store, so secrets come from the host environment. |
| Cloud agents | Workers, per the Workers table. Orca has no screen recording. Take `orca screenshot` sequences, or record with `screencapture -v` or Playwright. |
| Bugbot | Bugbot comments are ordinary GitHub review threads. Triage them with `gh`. Skip a step that starts or configures Bugbot when the PR has no Bugbot check or comment. |
| Custom Modes, the `/` menu attaching a skill, Plan Mode, the Cursor sidebar | Skip with one line in your reply: `Skipped in Orca: <step>. <reason>.` Then go on. |
