# Removed Cursor-only features

This fork removed two things that only work inside Cursor: the **benny automation pack** and the **`make-bot-ui` skill**. Their files stay in git history. The last commit that contains them is `cdeb36b`:

```bash
git show cdeb36b:automations/benny/README.md
git ls-tree -r --name-only cdeb36b -- automations skills/make-bot-ui
```

This page records what each one did, what the nearest equivalent is on Claude Code, Codex, and Orca, and what to build if you ask for it. Claude Code and Codex are listed as standalone CLIs, because Orca wraps both and they also run without it.

Facts were checked on 2026-10-23. Each cell cites a doc or a command you can rerun. Anything marked **unverified** was not confirmed.

## What each platform can do

| Capability | Claude Code | Codex | Orca |
| --- | --- | --- | --- |
| Run on a schedule | Yes. Routines run in the cloud (research preview). `/loop` and the Cron tools are session-scoped, capped at 50 tasks, and expire after 7 days ([routines](https://code.claude.com/docs/en/routines), [scheduled tasks](https://code.claude.com/docs/en/scheduled-tasks)). | Yes. Automations recur on a schedule. A local project task needs the computer on and the app running ([automations](https://learn.chatgpt.com/docs/automations?surface=app)). | Yes. `orca automations create --trigger <preset\|cron\|rrule>`. |
| Run on a new Slack message | **No documented trigger.** Claude Tag always answers an @mention and may answer untagged top-level messages when "Respond automatically" is on. Team and Enterprise only, public beta ([when Claude responds](https://claude.com/docs/claude-tag/users/when-claude-responds)). | **Partial.** An automation can fire on a Slack event, but only in ChatGPT on the web and mobile, not in the desktop app, CLI, or IDE. An `@ChatGPT` mention also starts a request ([automations](https://learn.chatgpt.com/docs/automations?surface=app), [Slack](https://learn.chatgpt.com/docs/third-party/slack)). | **No.** Orca triggers on a schedule only. Poll with `--precheck <command>`: exit 0 runs the automation, anything else records a skipped run. |
| Run on an HTTP request with a payload | **Yes, cloud.** A routine has an API trigger: `POST /fire` with `Authorization: Bearer <token>`. The optional `text` field is freeform, so JSON arrives as a string, and the saved prompt must reference the `<routine-fire-payload>` block. 30 fires per hour per task, 100 per account ([routines](https://code.claude.com/docs/en/routines)). **Local:** `claude -p`, with `--bare` for scripted calls ([headless](https://code.claude.com/docs/en/headless)). | **No documented webhook.** Local: `codex exec "<prompt>"` runs non-interactively and appends piped stdin as a `<stdin>` block (`codex exec --help`). | **No webhook.** A local server can start a run with `orca agent launch --agent <id> --prompt <text>`. `orca automations run <uuid>` takes no payload. |
| Reply inside the source Slack thread | Claude Tag replies in a thread under the message ([how it works](https://claude.com/docs/claude-tag/concepts/how-it-works)). The Slack MCP server is `https://mcp.slack.com/mcp`; its tool list and scopes are not documented on the connect page ([Slack MCP](https://docs.slack.dev/ai/slack-mcp-server/connect-to-claude/)). | "ChatGPT returns the result to the thread." Needs a workspace admin, cloud delegation, and a published environment ([Slack](https://learn.chatgpt.com/docs/third-party/slack)). | Through the Slack MCP of the agent Orca starts. **Unverified.** |
| Read-only helper agent | `Explore`, or a custom agent with `tools` and `disallowedTools` ([sub-agents](https://code.claude.com/docs/en/sub-agents)). | A custom agent cannot override `sandbox_mode`, so the parent's sandbox applies ([subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)). | No flag. The spec says "read-only", and the coordinator checks `git status` afterward. |
| Ask the user for a secret without seeing it | None found. | None found. | None (`CURSOR-DEPENDENCIES.md`: Orca has no secret store). Use an environment variable. |
| Screen-recording evidence | None found. | None found. | None. Use `orca screenshot` sequences or a local recorder. |

## benny

**What it did.** Two Cursor Automations for a Slack issue-report channel.

- **Triage.** For each report, post one verdict in the source thread only. Review the evidence, route by cause, deduplicate against the tracker, and create a ticket only for a clear, new bug. Fail closed when the external config is missing.
- **Reproduce and fix.** For a triaged bug, reproduce it through a configured app-control adapter, verify any existing fix, and open a bounded draft PR only after before-and-after proof.
- **Safety rules.** The coordinator is the only Slack poster. Delegated workers are read-only and get no Slack credentials. User configuration (`configuration.example.yaml`, the feature map, routing examples) lives outside the copied pack.

**Cursor mechanisms it relied on.** A Slack-message automation trigger, Cursor's own Slack actions, `.cursor/automations/benny/` plus `.cursor/settings.json`, and cloud-agent video.

**Closest equivalent.**

| Piece | Claude Code | Codex | Orca |
| --- | --- | --- | --- |
| Trigger on every new report | Not available. Use an @mention of Claude Tag per report. | Not in CLI or desktop. Use an `@ChatGPT` mention, or the web and mobile Slack event trigger. | Poll: an automation whose `--precheck` script exits 0 only when the channel has a message newer than a state file. |
| Triage verdict and ticket | A Claude Tag thread, or a routine plus the Slack MCP server. A tracker connector is **unverified**. | A cloud task started from the Slack thread. | The agent Orca starts, with `orca linear` for tickets (`orca --help`, Linear group). |
| Reproduce in a real app | Claude in Chrome or computer use. | Codex browser and computer-use plugins. **Unverified.** | `orca goto`, `orca snapshot`, `orca click`, `orca computer`, `orca emulator`. |
| Draft PR with proof | `gh pr create`. Screenshots replace video. | Same. | Same, then `orca reference add <pr-url> --worktree active`. |

**What is lost on every platform.** "Run the moment a message arrives" only exists as a mention or as a poll. Video proof becomes screenshots.

**Build it if asked.** Start with Orca, because it is the only platform that can run the whole loop locally.
1. Port `triage-issue-reports` and `reproduce-and-fix-issues` as plain skills, with their Cursor and Slack-action wording replaced by the agent's own Slack MCP tools.
2. Add a `--precheck` script that reads new messages since `~/.pstack/benny/last_ts` and exits 0 only when there is one.
3. Create two automations: `orca automations create --trigger <cron> --precheck <script> --provider <agent> --prompt <tick prompt>`.
4. Keep the "coordinator is the only poster" rule in the prompt, and check workers with `git status`.

## make-bot-ui

**What it did.** Built a small web page whose buttons wake a Grok Bot. A server on the user's machine holds the webhook sender key and POSTs JSON to a Cursor webhook routine, and the bot wakes with that JSON as untrusted input. The skill also covered exposing the page over Tailscale (bind `0.0.0.0`, not `127.0.0.1`).

**Cursor mechanisms it relied on.** `update_state` with a webhook-trigger routine, the URL `https://api2.cursor.sh/automations/webhook/<id>`, the `SendToUser` secret-request card, and the routines panel in the Cursor UI.

**Closest equivalent.** The local server calls the agent directly. The sender key and the secret card are not needed when the server starts the agent itself.

| Piece | Claude Code | Codex | Orca |
| --- | --- | --- | --- |
| Wake the agent with JSON | Cloud: routine `/fire` with the bearer token held server-side. Local: `claude -p --bare`, with `--resume <session_id>` to continue. | `codex exec "<prompt>"`, or `codex exec resume`. | `orca agent launch --agent <id> --prompt <text>`. |
| Keep the key out of the browser | The server holds it. Store it in an environment variable or the OS keychain. | Same. | Same. |
| Tailscale hosting | Unchanged. It does not depend on the agent. | Unchanged. | Unchanged. |

**Build it if asked.** A small server in any language with three jobs: serve the page, accept the button POST, and start the agent with the JSON wrapped as untrusted data. Keep the credential in an environment variable. Never ask the user to paste it into chat.
