---
name: resolve-capability
description: Say how each thing a pstack step asks for (start a helper, start a worker on another agent, ask the user, wait for an event, find past sessions, and so on) is done in this environment, and what to do when it cannot be. Read at the start of a task. Use when a step names a capability.
disable-model-invocation: true
---

# Resolve a capability

A pstack step names what it needs by a capability name in backticks, such as `spawn-worker`. It does not name a tool. This skill says which tool does it here. The skills that name capabilities live next to this one, so read this file as `../resolve-capability/SKILL.md`.

## 1. Which environment is this

Answer these as separate questions. They are not alternatives. Orca runs on top of a harness, so you can be in Claude Code and in Orca at the same time.

1. **Which harness are you?** Claude Code, Codex, or Grok. Your own tool list tells you.
2. **Is Orca here?** Run `env | grep '^ORCA_CLI_'` now, before you plan or start anything, and also when the task says to plan only. Any output means yes. Do not decide this from the harness you are, from `which`, or from memory, and do not put the check off to a later step. An Orca terminal sets only `ORCA_CLI_BIN_DIR` and an Orca chat sets both. Run Orca commands with `$ORCA_CLI_COMMAND` when it is set, otherwise with `orca`. Below, `orca` means that executable. Orca adds workers, durable run state, schedules, remote environments, and session search. No output means a plain session: read [`references/plain.md`](references/plain.md).
3. **This computer and this user.** `~/.agents/skills/select-model/SKILL.md` records which products and models are installed, which Orca environments exist, and what the user prefers. Read it too. When it is missing, say so once and use the defaults in `../poteto-mode/SKILL.md`.

Read the file for your harness once, and the Orca files when Orca is here: [`claude-code.md`](references/claude-code.md), [`codex.md`](references/codex.md), [`grok.md`](references/grok.md).

## 2. How to use the index

Each line below gives the mechanism per environment and then what to do when there is none. A mechanism marked `(unverified)` has not been run on a real session yet. Use it, and say in your reply if it failed.

- You choose among the mechanisms that exist here. Prefer your harness's own tool, and use Orca for what the harness cannot do.
- When a line points to a reference file, read that file before the first use in the run.
- `select-model` records what was true when it was generated. When it says a product starts only through Orca and Orca is not here, read [`references/cli-workers.md`](references/cli-workers.md) before you give up on that product.
- A step that cannot be done and has no fallback is skipped with one line: `Skipped: <step>. <reason>.`
- Where a line says "exact", copy the command from [`references/exact-steps.md`](references/exact-steps.md) as written. Do not rebuild it.
- A seat that needs one of your MCP servers stays on your own harness. An Orca worker loads only its own agent's MCP configuration.

## 3. Index

**Agents and work**

- `spawn-subagent`: a helper inside your harness. Claude Code: the `Agent` tool (`model`, `effort`, `subagent_type`, `isolation`, `run_in_background`). Codex: `spawn_agent` (unverified). Grok: `spawn_subagent` (unverified). None: do the work yourself and say so. Give a read-only job a read-only agent type (one whose tool list has no edit or write tool) and a brief that says not to edit, and check `git status` after. A general-purpose type is not read-only even when the brief says so.
- `spawn-worker`: an asynchronous worker on another agent product, with a report. Any session with a shell can start another product's CLI headless: [`references/cli-workers.md`](references/cli-workers.md) (`codex exec`, `claude -p` or `claude --bg`, `grok -p`; all three ran). Under Orca, [`references/orca-workers.md`](references/orca-workers.md) adds supervision and a durable run. Read it before the first start, and when you plan one, because it says which agents refuse a model or effort flag there (Grok refuses both under Orca, so plan it with neither; started directly it takes both, so when a preference names a Grok model or effort, start Grok through its own CLI even under Orca). None, because the other product is not installed or not logged in: run the seat on your own model and say in one line which product would run it.
- `isolate-checkout`: its own worktree, ports, and temp paths for a seat that writes. Claude Code: `Agent` with `isolation: "worktree"` (unverified), `claude --worktree [name]`, or Worktree mode in the desktop app's Code tab. Codex: `codex --worktree` (documented, unverified). Grok: `grok -w [name]` (unverified). Orca: `worker-start --worktree new-child`. Otherwise `git worktree add` by hand, and remove it with the exact step.
- `run-remote`: a run that survives this computer sleeping. Orca: `worker-start --on <saved environment>`; list the environments with `orca environment list`. None: run here and say that it ends with this session.
- `coordinate-workers`: dispatch, dependencies, an inbox, and decision gates. Orca: `orca orchestration run-create`, `task-create`, `gate-create`, `check --wait` (see the orca-workers reference). Otherwise the `orch` tool in `../poteto-mode/scripts/orch/` (needs `bun`). The verification ledger always stays on `orch`.
- `control-agent`: probe, message, stop, or replace an agent. Claude Code: `ListAgents` lists the local Claude sessions, terminal ones included, and `SendMessage` delivers a message to one by name (seen: a message reached a terminal session that Orca had started, and it answered); `claude agents --json`, `claude logs <id>`, `claude stop <id>` for background sessions. Codex: `codex agents`, `codex queue --thread <id> --message <text>` (help text read, not run). Orca: `worker-show`, `send`, `worker-stop`, `worker-abandon`, with the conditions in the orca-workers reference. None: say the agent cannot be probed.
- `choose-model`: which model and effort for a seat. Read `select-model`. When it is missing, use the defaults in `../poteto-mode/SKILL.md`.

**Waiting and time**

- `wake-on-event`: block on, or be woken by, a worker finishing, a CI result, or a PR change. See [`references/waiting-and-schedules.md`](references/waiting-and-schedules.md). Claude Code: a `run_in_background` command wakes the session when it ends, and `SendMessage` with `notify_when_idle: true` sends one notice when another local Claude session next goes idle (seen). Codex: `orca orchestration check --wait --timeout-ms 45000` repeated in the same exec session. Orca: `check --wait`, `orca terminal wait --for exit`. None: poll with a bounded shell loop, or stop and say what to re-run.
- `run-on-schedule`: a recurring tick for a long program. Orca: `orca automations create --trigger ...`, and each tick starts a new agent with no memory, so the prompt carries everything. Claude Code: `/loop`, `CronCreate`, `ScheduleWakeup` (unverified). The Codex desktop app has scheduled tasks (documented, unverified); the Codex CLI has none. None: skip, and tell the user to re-run by hand.

**Talking to the user**

- `ask-user`: a question with options, only for a call the user must make. Claude Code: `AskUserQuestion`. Codex and Grok: numbered options in the reply. In an Orca worker: `orca orchestration ask`. None: numbered options in the reply.
- `track-todos`: a visible plan with step status. Use the plan or todo tool in your tool list. The Codex build seen here (0.160.1) had no plan tool in its instructions, and its app showed no plan list. None: a list in the reply.

**Code hosting**

- `use-forge`: create, list, review, and merge pull requests. `gh` in every environment. Under Orca, after `gh pr create`, `orca reference add <pr-url> --worktree active` links the PR. Exact steps for opening, stacking, merging, and re-basing are in the exact-steps reference. A step that needs the user to click or merge prints the exact command instead.
- `read-review-bot`: read automated review threads and check runs on a PR. `gh`, with the bot named by the repository's own checks and logins. Skip the step when the PR has no review bot.

**Files, skills, and sessions**

- `run-skill`: run another pstack skill. Read its `SKILL.md` at `../<name>/SKILL.md` and follow it. The slash form for a user is `/name` in Claude Code and `$name` in Codex.
- `author-skill`: write a new skill. Claude Code: `skill-creator`. Codex: `$skill-creator`. None: the Authoring a skill playbook.
- `find-sessions`: this workspace's past and running sessions and their transcripts. Claude Code: `~/.claude/projects/<slug>/*.jsonl`. Codex: `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl`, filtered on `payload.cwd` (under Orca, `CODEX_HOME` is Orca's own account home). Grok: `~/.grok/sessions/<URL-encoded cwd>/<session>/`. Live sessions: `ListAgents` and `claude agents --json` in Claude Code, `codex agents` in Codex. Orca adds `orca search`, `orca worktree ps`, and `orca orchestration worker-read`. To pick your own session out of the files, read the first user message: in Claude Code the first `user` record's `message.content`, in Codex the first user message after `session_meta`. The Claude workspace folder is the absolute path with `/` and `.` replaced by `-`. None: say which store you could not read.
- `locate`: where things live. Instructions: `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex and Grok. Skills: `.claude/skills/` and `~/.claude/skills/` for Claude Code, `.agents/skills/` and `~/.agents/skills/` for Codex, `~/.grok/skills/` for Grok. Worktrees under Orca: `orca worktree list --json`. The folder that holds the pstack skills is the parent of this skill's folder. Playbooks call it `<pstack>`, so `<pstack>/poteto-mode/SKILL.md` is `../poteto-mode/SKILL.md` from this file.
- `durable-store`: a place that outlives a restart: decision trails, plan files, queue state. `~/.pstack/store/<repo-slug>/`. Name it in every worker spec. A one-off report or a worker's output is scratch, not durable: write it under a `mktemp -d` path.

**Driving and inspecting**

- `list-mcp-servers`: which MCP servers this session has. Your tool list shows the tools they provide. Otherwise `claude mcp list`, `codex mcp list`, or `grok mcp list`. A worker has only its own agent's servers, not yours.
- `drive-app`: drive a browser, a terminal program, or a desktop window, and capture evidence. Orca: `orca goto`, `snapshot`, `click`, `fill`, `screenshot`, `eval` for its browser, `orca computer` for native windows (run `orca skills get orca-cli` first). Otherwise a browser MCP or Playwright, or the shell. For a recording, Orca has no screen recorder. On macOS `screencapture -v -V <seconds> <file>.mov` recorded a clip here (it films the whole screen, so tell the user and keep the file out of the repository). Otherwise take `orca screenshot` sequences, or use Playwright's video option (unverified). None: the shell and screenshots.
- `inspect-runtime`: attach to a live process for CDP, a CPU profile, a heap snapshot, or code evaluated in it. The Node inspector or the Chrome DevTools protocol through the shell (unverified). Say which attach method was missing.

## 4. Bundled tools are not capabilities

`../poteto-mode/scripts/` ships tools that run the same everywhere: `orch` (units, the verification ledger, the frontier), `watch-pr` (the READY, WAITING, ADVANCE, COMPLETE verdict for a PR), `check-plan.mjs`, and `worktree-audit.sh`. Several need `bun`. A step that uses one names it. Only the waiting is a capability: use `wake-on-event`.

## 5. When to read this again

At the start of a task, after a restart, after the context was compacted and before the next wave of spawns, on every heartbeat tick, and when you take over a run from an earlier session, which may have run in another environment. Before an irreversible command, reread only that command's section of the exact-steps reference.

## 6. When this skill is wrong

If a mechanism fails or does not exist, use the fallback, say so in the reply, and tell the user what you saw. This skill ships with pstack and is not edited from a task. A fact about this computer belongs in `select-model`, which asks the user before it changes.
