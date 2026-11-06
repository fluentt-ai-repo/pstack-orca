# Workers without Orca

Any session with a shell can start another product's CLI without its interface. Orca is not needed for that. What Orca adds is supervision: a run record that survives a restart, an inbox, a report-file protocol, and worktrees it manages. Without Orca you start the process, wait for it, and read its output yourself.

Run these from the shell tool. Start one in the background (Claude Code: `run_in_background`) when you have other work, write its answer to a file, and wait with `wake-on-event`.

| Product | Command | Notes |
| --- | --- | --- |
| Codex | `codex exec --skip-git-repo-check --ephemeral -s read-only -C <dir> -m <model> -c model_reasoning_effort=<level> -o <report file> "<brief>" < /dev/null` | Ran from Claude Code with `gpt-6-luna` at `low` and wrote `OK` to the report file. `-s read-only` was accepted. That it blocks edits was not tested. A seat that writes takes `-s workspace-write`. `--dangerously-bypass-approvals-and-sandbox` only when the user asked. The `< /dev/null` is required: see Rules. |
| Claude Code | `claude -p --model <model> --effort <level> --output-format json "<brief>"` | Ran with `haiku`. The answer is in the JSON `result` and the model that ran is a key of `modelUsage`. `--effort` was not run. Read-only: `--permission-mode plan` or an `--allowedTools` list (not tested). |
| Claude Code, in the background | `claude --bg --model <model> "<brief>"` prints a short id. `claude agents --json --all`, `claude logs <id>`, `claude stop <id>`, `claude rm <id>` | Ran end to end. The workspace must already be trusted, so run it where a Claude Code session has been accepted before. `rm` deletes the session. |
| Grok | `grok -p "<brief>" -m <model> --reasoning-effort <level> --permission-mode plan --output-format json` | Ran with `grok-4.7-build-fast` at `low`, and `modelUsage` named that model. Unlike an Orca worker, a headless Grok takes the model and the effort. It refuses `--add-dir` ("additionalDirectories is not supported: a session works only in its cwd"), so start it in the folder it should read. `-w [name]` starts it in its own git worktree (not tested). |

## Rules

- Close stdin on `codex exec`: end the command with `< /dev/null`. When stdin is not a terminal, `codex exec` prints `Reading additional input from stdin...` and waits for it to reach EOF. A background shell can leave stdin open, and then Codex does nothing: one run sat 66 minutes with a 39-byte log, and the same command with `< /dev/null` finished in 20 seconds. Reproduced with Codex 0.160.1: an open pipe on stdin ran until `timeout` killed it (exit 124) and wrote no report, while `< /dev/null` and a closed descriptor (`<&-`) both finished in about 5 seconds. A log whose only line is that message means this, not a slow model. `claude -p` and `grok -p` do not hang on an open stdin (Claude Code waits 3 seconds, prints "no stdin data received", and goes on), so `< /dev/null` is harmless there but not needed.
- The report is the output file or the JSON answer. There is no `worker_done` message and no inbox, so wait on the process, not on a message.
- Silence is not a hang. With `--output-format json` a run prints nothing until it ends, and a review can run past five minutes. A Codex session once took six silent minutes for a hang and killed two reviewers that were still working. Before you stop one, look at its session record (Claude Code: `~/.claude/projects/<cwd with each / as ->/`, Grok: `~/.grok/sessions/<cwd, URL-encoded>/`). A record that still grows is working.
- A process you started dies with the session that started it unless you started it with `claude --bg` or detached it yourself. Say so when the work is long.
- A seat that writes needs `isolate-checkout`. A seat that reads is held by the product's own mode where one was named above, and by the brief. Check `git status` after either.
- MCP servers do not cross products, and remaining usage cannot be read. A limit shows up as an error.
- Name the model and effort you asked for and the one the output says ran. They can differ.
