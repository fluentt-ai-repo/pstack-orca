---
name: verify-pstack
description: "Prove that a change to a pstack skill in this repo works by running it in real Claude Code, Codex, and Grok sessions in the pstack testbed through Orca, then reading their session records. Use after editing anything under skills/ and before calling the change verified, or for verify-pstack. Internal to this repo, not shipped."
metadata:
  internal: true
---

# Verify pstack

pstack is a set of skills, so the app under test is an agent following one. A proof is a real session in the testbed, started the way a user starts it. Its evidence is what the session did (tool calls, subagents, Orca workers, its reply) and what it left behind (files, worker states, the shared `select-model`). This skill holds the commands, the rules for shared state, and the feature map in [`features/`](features/README.md). It is for agents changing this repo. `metadata.internal` keeps the `skills` CLI from offering it to users.

## Pick the runs first

Every run spends usage, and an earlier session already hit its monthly limit. Choose the runs from this table before you start anything. Add a run only when one fails or the change spans several rows.

| What changed | Minimum proof | Feature |
| --- | --- | --- |
| Wording only: a typo, a split sentence, a heading nothing links to | The four repo checks. No run. | |
| An `orca` command or flag that a skill tells agents to run | `check-orca-commands`, then one run that reaches the command | the feature that runs it |
| `poteto-mode` routing, the playbook list, or a playbook's steps | One entry check routed to that playbook, Claude terminal | [entry](features/entry.md) |
| The Subagents section of `poteto-mode` | One spawn check for each case the changed sentence covers (same agent, another agent with Orca, no Orca) | [spawn](features/spawn.md) |
| How `select-model` is read, or the fallback when it is missing | One runtime check with `select-model` present. Add the fallback check only when the missing-skill sentence changed. | [runtime](features/runtime.md) |
| `setup-pstack` or `create-model-selection-skill` | One generator run, Claude terminal, fake home | [generator](features/generator.md) |
| The generator's link question | One generator run that answers the link question, fake home | [generator](features/generator.md) |
| A cross-model skill (`arena`, `swarm`, `interrogate`, `reflect`, `architect`, `how`, `why`) | One run of that skill on a small read-only task, Claude terminal. `why` and `architect` stop at the plan. | [cross-model](features/cross-model.md) |
| A line only Codex reads differently (`$name`, `update_plan`, `CODEX_HOME`, rollout paths) | The same check once more, Codex terminal | the same feature |
| Behavior only an Orca chat shows | The same check once more, `--surface chat` | the same feature |
| A rule for a session without Orca | The same check once more, plain surface | the same feature |

The four repo checks run for every change, from the repo root:

```bash
node scripts/audit-cursor-deps.mjs
node scripts/check-orca-commands.mjs
node scripts/apply-orca-pointer.mjs --check
node scripts/lint-rewritten.mjs
```

Rules for spending:

- A run is one environment and one prompt.
- `vp launch` starts a terminal unless told otherwise, because the CLI can close a terminal and cannot close a chat.
- It starts Claude on `sonnet` and Codex on `gpt-6.1-sol`, both at `low`. These are the models of the earlier recorded runs, at the lowest effort each offers. Orca starts Grok on its own config and refuses both flags.
- A run that fails because the model skipped a step the skill states plainly may be rerun once with `--model default --effort default`, which leaves both flags off, to tell a weak model from unclear text. Report both runs. In a terminal that means the model and effort the user pinned in the product's settings (`opus` in `~/.claude/settings.json` today), so the rerun costs more than the first run. This happened in the first proof of this skill: `sonnet low` skipped the Orca check that the default effort made (see the runtime feature's Gotchas).
- Never repeat a passing run to be sure. Never run the whole map. The map lists what can be proved, not what must be.

## Where things are

- **Testbed.** `~/Documents/pstack-testbed`, a git repo outside this one. `calc.js` has a deliberate off-by-one and `calc.test.js` fails on it. `.agents/skills/<name>/` holds copies of this repo's skills and `.claude/skills/<name>` is a relative link to each copy. Codex reads the copies from `.agents/skills/`, Claude Code through the links. `.claude/settings.json` turns auto memory off so runs do not share memory.
- **Helper.** `.agents/skills/verify-pstack/scripts/vp.mjs`. Every command below assumes `VP=.agents/skills/verify-pstack/scripts/vp.mjs` from the repo root. It names you, for locks and runs, by the first of these it finds: `VP_OWNER`, `ORCA_AGENT_SESSION_ID` (an Orca chat), `orca-tab:<ORCA_TAB_ID>` (an Orca terminal, which has no session id and keeps its tab id until the tab closes), and `claude-session:<CLAUDE_CODE_SESSION_ID>` (Claude Code anywhere). Set `VP_OWNER` when none is there. `$VP whoami` prints the name and how another session reaches you. The lock stores that contact.
- **Evidence.** `~/Documents/pstack-testbed-evidence/<run id>/`. It sits outside this repo so no record gets committed, and outside the testbed so a driven agent never reads an earlier verdict.
- **Sample `select-model`.** [`fixtures/select-model-sample/`](fixtures/select-model-sample/), the G1 output of 2026-10-23 (Claude, Codex, and Grok, Orca present). Its `SKILL.md` is stored as `SKILL.sample.md` so no agent finds it as a skill. `vp` renames it when it places the sample.

## Shared state

### `select-model`

`~/.agents/skills/select-model` is one path for the whole computer. Every pstack skill reads it, so whatever sits there shapes every run in every session. The user's real one will live there.

- **Real or sample.** A sample carries a `.verify-pstack-sample` file naming its owner. Anything at that path without the file is the user's real skill. `vp` refuses to overwrite, remove, or move a real one except through the stash below.
- **Runs that only read it** (entry, spawn, cross-model, and the runtime check with it present) use whatever is there. `vp launch` records its state, and `vp read` compares. A run whose state changed in between is marked `VOID`. Rerun it.
- **Another session holds the lock.** `vp launch` refuses, because your run would read that session's sample. Wait, or message the owner with the contact the refusal prints: `orca orchestration send --to orca_session_id:<id> --subject "select-model lock" --type question --body "<when will you release it?>" --json` for a chat, or `orca terminal send --terminal <handle> --text "<message>" --enter --json` for a terminal.
- **Runs that need it absent or set to the sample** take the lock first with `$VP sm lock "<purpose>"`. Then one of these.
  - It is absent and the run needs it absent. Run.
  - It is absent and the run needs the sample. `$VP sm place`, or `$VP sm place --from <dir>` for a freshly generated one.
  - A real one is there. Ask the user before anything else. Offer a fake home, which is a stand-in that primes the model with the path, or a stash. On their yes to a stash, run `$VP sm stash --approved "<their words>"`. It moves the real skill to `~/.agents/verify-pstack-stash/select-model-<time>/`, writes a file manifest and a `RESTORE.txt` with the manual steps, and records the stash in the lock. `$VP sm restore` moves it back and checks every file against the manifest.
- **Always finish with `$VP sm release`.** It removes your sample, restores your stash, and frees the lock, in that order. Never end a session holding the lock, whether the runs passed, failed, or were abandoned.
- **Stale lock.** A lock older than two hours, or one whose owner is gone, is the user's call. On their yes, `$VP sm break --approved "<their words>"` removes it and logs the old lock to `lock-breaks.log` in the evidence root. A sample or stash it guarded stays where it was. `$VP sm status` shows both.
- **A fake home sidesteps the lock.** When another session holds the lock and your check only needs `select-model` absent or set to the fixture, run it from a fake home (`$VP fakehome <name>`, with `--sample` for the fixture) and launch with `--fakehome <dir> --ignore-lock`. Add the reader line `vp fakehome` prints to the prompt. Confirm in "select-model touches" that the run read only fake-home paths, and name the fake home as a stand-in in the verdict.
- **Generator runs use a fake home**, never the real path. `$VP fakehome <name>` makes `/tmp/vp-home-<name>/` and prints the prompt line that points the generator there. It needs no lock. Pass `--fakehome` to `vp launch` so cleanup keeps what the generator wrote.

The lock is a JSON file at `~/.agents/verify-pstack-select-model.lock` (owner, purpose, time, placed sample, stash). Without `vp`, create it only when absent (`set -o noclobber`) and delete it only when it is yours.

### The testbed

- Other sessions launch runs in the same testbed. `vp` finds your session by the run id in the prompt and the launch time, so their sessions never mix with yours.
- Sync only the skills your change touched (`$VP sync <name>...`). A sync replaces the copy another session's run may be reading, so ask before syncing a skill another session is changing.
- A driven agent must leave the testbed's tracked files as they were. `vp read` lists every new change. `vp cleanup --revert` puts back only what your run changed.

## Launch

`$VP launch <label> --agent claude|codex|grok [--surface terminal|chat|plain] --prompt "<prompt>"` starts one session, in a terminal unless `--surface` says otherwise. The run id is `<label>-<HHMMSS>`. It goes into the prompt as `[<run id>]`, at the end or wherever the prompt says `{marker}`. A prompt that needs the bare id, such as in a temp path, writes `{id}`. The launch output, the prompt, and the state before the run go to `run.json` in the run's evidence folder.

What `vp` runs for each surface, so you can run it by hand:

- **terminal** (Claude or Codex), the default. `orca agent launch --agent claude --worktree path:/Users/fluentt/Documents/pstack-testbed --surface terminal --model sonnet --effort low --prompt "<prompt>" --json`, with `--agent codex --model gpt-6.1-sol` for Codex. Ready when `prompt.outcome` is `handed-to-terminal`. `outcome.handle` is the terminal, and `vp` records its tab for cleanup.
- **chat** (Claude), only for a check about what an Orca chat alone does. The same command with `--surface chat`. Ready when `prompt.outcome` is `journaled`. The result's `outcome.sessionId` is Orca's id for the chat, not the record's file name. A chat outlives the run (see Known limits).
- **plain** (Claude). `orca terminal create --worktree path:/Users/fluentt/Documents/pstack-testbed --title vp-<run id> --command "bash <evidence>/<run id>/plain.sh" --json`. The script unsets every `ORCA_*` variable, swaps each `PATH` folder that holds `orca` for a copy without it, and runs `claude --dangerously-skip-permissions --model sonnet --effort low`. Ready when `$VP screen <run id>` shows `ORCA vars left 0, orca on PATH: none` and the prompt is running. The first screen can be the folder trust prompt or the bypass-permissions warning. Read it, move to the accepting option with `$VP key <run id> down`, and confirm with `$VP key <run id> enter`. Codex has a plain recipe in the script that no run has used yet.
- **Grok** as the driven session: `orca agent launch --agent grok --worktree path:/Users/fluentt/Documents/pstack-testbed --surface terminal --prompt "<prompt>" --json`, with no model or effort. No run has driven Grok this way yet. Grok so far ran as an Orca worker that a Claude or Codex session started.

Prompts:

- Claude takes `/name <args>`. Codex takes `$name <args>`. Quote a Codex prompt with single quotes so the shell keeps the `$`.
- A prompt bounds the scope (read-only, plan only, stop after a step) and answers every question the skill will ask, so the run never stops to wait. A terminal run that asks anyway can be answered with `$VP key`. A chat cannot be answered from the command line.
- A prompt never tells the agent what the skill under test should make it do. "Read select-model first" in a prompt turns a check into a demonstration.
- The feature files keep prompts that already ran. Use them verbatim so results compare across runs. They are in Korean because the user works in Korean.

Known limits:

- No Orca command closes a chat. `orca terminal close --terminal <handle>` takes terminal handles only, and a chat handle (`structured-agent-session-...`) gets `terminal_handle_stale`. Every chat run stays in the testbed until the user closes it in Orca's window. That is why runs default to a terminal.
- `orca terminal close --worktree path:/Users/fluentt/Documents/pstack-testbed --all --json` failed with `terminal_close_incomplete` and left orphaned terminal records that the CLI cannot remove. Do not use it for cleanup.
- Orca starts a terminal Claude with `--dangerously-skip-permissions`, so a terminal run does not stop at a permission prompt. S-pair-154658 started an Orca worker from a terminal Claude without one. A run you start some other way can stop at one, and `vp wait` exits 4.
- An Orca terminal sets `ORCA_CLI_BIN_DIR` but not `ORCA_CLI_COMMAND` or `ORCA_AGENT_SESSION_ID`. It sets `ORCA_TAB_ID`, `ORCA_TERMINAL_HANDLE`, and `ORCA_PANE_KEY`. An agent started in it inherits the same.
- A tab closed in Orca's window while its agent is alive leaves the PTY running with no tab. `orca terminal close` then answers `terminal_handle_stale`. `vp cleanup` types the agent's exit command and then `exit` into that PTY. It ended Claude (`/exit`) this way in S-ro-155230 and R-missing-155347, where the tab was already gone at cleanup. The Codex command (`/quit`) has not been tried.
- Claude Code rewrites its process arguments soon after it starts, so a run's process cannot be found by the run id in its command line.
- Closing a terminal without `--tab` left its tab in place. The tab came back under a new handle with the agent still running. `vp cleanup` closes with `--tab` and matches the run's terminal by its handle or by the `[<run id>]` marker in the tab title. The title alone is not enough, because Claude Code retitles its tab. It never matches by tab id, because Orca gave the id of a tab closed in its window to another session's terminal.

## Doctor

`$VP doctor` is read-only. It checks that Orca answers and matches the snapshot in `orca/VERSION`, that the testbed is clean, which testbed copies differ from the working tree, that each `.claude/skills/<name>` link is the relative one, the state of `select-model` and its lock, any stash or fake home left behind, that `claude`, `codex`, and `grok` run, and your runs that were never cleaned. It also counts the testbed's open terminals and chats. It warns about a terminal whose title carries a run id, about orphaned or disconnected terminal records, and about open chats, and says when only the user can close them in Orca's window. Run it before the first launch and again after anything surprising. Fix every `FAIL` line before you launch. A `warn` line about a copy is a problem only when your run reads that skill.

## Drive

1. Pick the runs from the table at the top.
2. Run `$VP doctor`.
3. Sync the skills your change touched: `$VP sync <name>...`. `$VP sync --check <name>...` only reports.
4. Set the `select-model` state the feature names, by the rules in Shared state.
5. Launch with the feature's prompt.
6. `$VP wait <run id>`. Exit 0 means finished. Exit 2 means still running, so call it again. Exit 3 means the session is waiting on a question. Read it with `$VP screen <run id>`. The question is the finding. Answer it with `$VP key` only to let the run finish. Exit 4 means a terminal run stopped at a permission prompt. `vp` prints the screen. Answer it with `$VP key`, and report it, because a driven agent should not need one. Give the Bash tool a timeout above `--timeout` (240 seconds by default). A foreground `sleep` longer than about 45 seconds is blocked in Claude Code, and `vp wait` polls inside node instead.
7. `$VP read <run id>`. Judge each pass criterion in the feature file against `summary.txt`, and write `verdict.md` (shape below).
8. `$VP cleanup <run id>`, then `$VP sm release` if you took the lock.
9. Report each run id, its verdict, and the evidence path. A failure names the tool call number and the skill sentence it contradicts.

## Evidence

`vp` writes these into `~/Documents/pstack-testbed-evidence/<run id>/`.

- `run.json`, with the prompt, the launch output, and the `select-model`, lock, and testbed state at launch.
- `summary.txt`, the readable account: models and effort, the first prompt, every tool call (an `&` marks a Claude call sent in the same message as the one before, so the two started together), the skill files named in tool calls, every touch of `select-model`, the last todo list, native subagents with their model and effort, Orca workers with what was requested and what model actually ran (read from the worker's own record), CLI workers started from the shell (`grok -p`, `codex exec`, `claude -p`, `claude --bg`) with the model their output names, temp folders the run created, and the final reply.
- `facts.json`, the same as data.
- `records/`, copies of the session record, its subagent records, and each worker's own record.
- `fakehome/` and `tmp/` from cleanup, `testbed-residue.txt` when the run changed the testbed, and `cleanup.log`.
- `verdict.md`, which you write. Its first line is the verdict, because `vp runs` shows it.

```markdown
PASS|FAIL|VOID <run id> <feature> <sub-feature ids>
- <criterion>: pass|fail. <evidence: summary.txt call N, or a quoted line of the reply>
Environment: <agent> <surface> <model> <effort>, select-model <state>.
Stand-ins: <fake home, low effort, a model other than the user's>.
Not covered: <what this run did not exercise>.
```

Proof standards:

- Drive the real path. The prompt goes to a real session through the slash command or `$name`. Reading the skill yourself and predicting what an agent would do proves nothing.
- Capture the action and the result. The tool calls show the action. The reply, the files, and the worker states show the result.
- Check side effects from their own source. A worker's model comes from Orca's worker record and the worker's session record, not from the command text the agent wrote. A written file is checked on disk.
- A failure stays a failure. Do not reword the prompt until it passes. A precondition the testbed lacks goes into that feature's Gotchas, and the run is reported as failed.
- Name every stand-in. A fake home, low effort, or Sonnet in place of the user's model are differences a real user's run would not have.
- Records and evidence stay out of the repo.

## Cleanup

`$VP cleanup <run id>` does these, and logs each to `cleanup.log`.

- Closes the run's terminal with `orca terminal close --terminal <handle> --tab --json`, then checks the testbed's terminal list until the run's handle and marker are gone. A terminal still listed after that is reported as one the user must close in Orca's window.
- Leaves a chat open, because no Orca command closes it, and says so.
- Stops every Orca worker the run started with `worker-start` that has not settled.
- Copies the fake home into the evidence and deletes it.
- Lists temp folders the run created and named. Check that they are the run's, then rerun with `--tmp` to copy each into the evidence and delete it.
- Saves any new testbed change to `testbed-residue.txt`. `--revert` restores those paths.

It never touches `select-model`. `$VP sm release` does that. It prints the evidence folder's contents at the end, so you can see that the proof survived. Never kill a process by name, and never close a terminal `vp` did not record.

## Helpers

`vp.mjs` is executable. `$VP help` prints this list.

| Command | What it does |
| --- | --- |
| `doctor` | The read-only check above. |
| `sync <name>... \| --all [--check]` | `rsync -a --delete` each `skills/<name>/` into the testbed, and create its `.claude/skills` link if missing. |
| `sm status` | The state of `select-model`, the lock, and any stash. |
| `sm lock "<purpose>"`, `sm place [--from <dir>]`, `sm remove`, `sm stash --approved "<words>"`, `sm restore`, `sm release`, `sm break --approved "<words>"` | The `select-model` rules above. |
| `fakehome <name> [--sample] [--from <dir>]` | A home under `/tmp` and the prompt line that points the generator at it. `--sample` puts the fixture inside. |
| `launch <label> --agent <a> [--surface terminal\|chat\|plain] --prompt "<p>" [--model <m>\|default] [--effort <e>\|default] [--fakehome <dir>] [--ignore-lock]` | Start one run, in a terminal unless `--surface` says otherwise. `default` leaves that flag off. `--ignore-lock` is only for a run that never reads `select-model`. |
| `wait <run id> [--timeout 240] [--quiet 20]` | Poll the record until the turn ends and the record has been quiet for `--quiet` seconds. Exit 0 finished, 2 still running, 3 a question, 4 a permission prompt. |
| `read <run id> [--width 160]` | Write and print the summary. `read --record <file> [--agent <a>]` reads any record without a run. |
| `screen <run id>`, `key <run id> down\|up\|enter\|"<text>"` | Read and type into a terminal or plain run. |
| `cleanup <run id> [--tmp] [--revert]` | The cleanup above. Safe to run twice. |
| `runs` | Every run in the evidence root, with its owner, state, and verdict line. |
| `whoami` | The owner name `vp` uses in this session, and how another session reaches you. |

Records, for reading by hand:

- Claude Code: `~/.claude/projects/-Users-fluentt-Documents-pstack-testbed/<session>.jsonl`. Tool calls are the `tool_use` blocks of `assistant` messages. Subagents keep their own records and a `.meta.json` with type, model, and effort under `<session>/subagents/`.
- Codex started by Orca: `~/Library/Application Support/orca/codex-accounts/<id>/home/sessions/YYYY/MM/DD/rollout-*.jsonl`, not `~/.codex/sessions`. Tool calls are `response_item` entries of type `function_call` or `custom_tool_call`. This Codex wraps shell commands in an `exec` call that runs JavaScript, and `vp` pulls the `cmd` strings out of it. `turn_context` holds the model and effort. `orca search "<run id>" --agent codex --since <iso time> --fresh --json` finds a session when the index is on.
- Grok: `~/.grok/sessions/<URL-encoded cwd>/<session>/`. `summary.json` holds `current_model_id` and `reasoning_effort`, and `chat_history.jsonl` the turns. Orca reports `launch.effective` as null for Grok, so this record is the only source for the model that ran.
- An Orca worker's first prompt starts with `You are working inside Orca, a multi-agent IDE. You are a dispatched worker.` and names its task id. `vp` uses that to tell workers from driven sessions and to find each worker's own record.
