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

Each reviewer and the synthesizer name a role line in `~/.agents/pstack-models.md` and a default entry of the form `<agent> <model> <effort>`. Use that line, or the default when the file or the line is missing. Start each one as the Subagents section of `../poteto-mode/SKILL.md` says. It covers your own agent, another agent through Orca, the fallback without Orca, the `inherit-parent` and `auto` aliases, and an entry that gets rejected. It also keeps a subagent that needs your MCP servers on your own harness, even when its role names another agent. Pick each subagent's reasoning level and speed for the job, per that section.

| Lens | Role line | Default entry | Prompt template |
|---|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `claude opus xhigh` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `grok grok-4.7-build-fast xhigh` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `claude opus xhigh` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Collect each reviewer's findings from its final result.

## 3. Synthesize

Start one synthesizer on the `reflect judgment, divergent, synthesizer` line (default `claude opus xhigh`), the same way and with MCP access, because it spot-verifies citations through MCP. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

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
