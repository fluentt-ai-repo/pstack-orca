---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, find this conversation's transcript. Look only in your own agent's store, limited to this workspace. Do not glob across every project folder. That crosses workspace boundaries and reads private chats from unrelated projects.

| Agent | Where this workspace's transcripts live |
|---|---|
| Claude Code | `<config dir>/projects/<workspace folder>/*.jsonl`. The config dir is `$CLAUDE_CONFIG_DIR` when set, otherwise `~/.claude`. The workspace folder is the workspace path with its separators turned into `-`, such as `-Users-me-app`. |
| Codex | `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl`, with `~/.codex` when `CODEX_HOME` is unset. Keep a file only when `payload.cwd` in its `session_meta` record is this workspace. |
| Grok | `~/.grok/sessions/<URL-encoded workspace path>/<session>/chat_history.jsonl`. |

```bash
ls -t <that location>/*.jsonl | head -10
```

For each candidate, newest first, read the opening user prompt. In Claude Code it is the first record with `type` `user`. In Codex it is the first user message after the `session_meta` record. Take the file whose opening prompt matches the conversation's. If none matches, pass a tight digest of the session instead.

## 2. Spawn three reviewers in parallel

Start all three at once. Reviewers need MCP access to look up the tickets, chat threads, and observability traces the transcript references. Pick an agent type that keeps your MCP tools, because some read-only agent types drop them. Each brief says not to edit files, and you check `git status` afterward.

Read `~/.agents/skills/select-model/SKILL.md` and choose each seat's model and how to start it from it. Start every seat as the Subagents section of `../poteto-mode/SKILL.md` says, which also covers a missing `select-model` and keeps a seat that needs your MCP servers on your own harness. The table says what each seat needs, not which model fills it. Pick each subagent's reasoning level and speed for the job, per that section.

| Seat | Kind | Needs | Prompt template |
|---|---|---|---|
| Judgment reviewer | judgment | read-only, MCP lookups | `references/judgment-reviewer.md` |
| Tooling reviewer | code or read | read-only, MCP lookups | `references/tooling-reviewer.md` |
| Divergent reviewer | judgment | read-only, MCP lookups | `references/divergent-reviewer.md` |
| Synthesizer | judgment | MCP, for the citation spot-checks | `references/synthesizer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Collect each reviewer's findings from its final result.

## 3. Synthesize

Start the Synthesizer seat once the three reviewers have returned, the same way and with MCP access, because it spot-verifies citations through MCP. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to your harness's skill-authoring skill (`skill-creator` in Claude Code, `$skill-creator` in Codex) and run its draft / test / iterate loop. With none, follow the Authoring a skill playbook at `../poteto-mode/playbooks/authoring-a-skill.md`.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to the same skill-authoring skill and run its description-optimization loop.
- `new skill: <kebab-name>`: hand creation to the same skill-authoring skill. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
