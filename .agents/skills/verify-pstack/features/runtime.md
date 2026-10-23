# Runtime model choice

At the start of a `poteto-mode` task the agent reads `~/.agents/skills/select-model/SKILL.md` by that path, then decides for this task which model to use and how. Small, reversible work stays in the session. Large or risky work is split across the models the user's preferences name. With no `select-model`, the agent says so once, points at `/setup-pstack`, and runs on the defaults.

## Sub-features

- `runtime-read` reads `~/.agents/skills/select-model/SKILL.md` and `../resolve-capability/SKILL.md` (the capability adapter that `poteto-mode` names) before deciding, in Claude Code and in Codex.
- `runtime-small` keeps a one-file bug check in the session, starts nothing, and gives the reason in one line.
- `runtime-large` splits a wide read plus a hard-to-undo redesign: the wide read to the reading preference, the judgment to the judgment preference, and a second vendor for the risky part when the preferences allow it. It says which model Orca will actually run for Grok.
- `runtime-missing` says once in the reply that no `select-model` exists, points at `/setup-pstack`, and decides from the defaults in `poteto-mode`, checking for Orca before it folds another agent's default into its own model.

## How to get to it (user POV)

- Any `/poteto-mode` task in Claude Code, or `$poteto-mode` in Codex. The checks ask for the decision only.

## Driving it with vp

Preconditions:

- `poteto-mode` is synced.
- For `runtime-read`, `runtime-small`, and `runtime-large`: `select-model` is present. Use the user's real one as is, or take the lock and place the fixture (`$VP sm lock "runtime check"`, `$VP sm place`).
- For `runtime-missing`: `select-model` is absent and stays absent for the whole run. Take the lock (`$VP sm lock "fallback check"`) so no session places a sample meanwhile. If a real one is installed, ask the user first, as `../SKILL.md` says. Do not move it on your own.

- **Small task.** Run `$VP launch R-small --agent claude --prompt "/poteto-mode calc.js의 sum()이 마지막 원소를 빼먹는지 확인하고, 빼먹으면 고쳐줘. 이번은 모델 선택 확인용이다. 실제 작업과 subagent와 worker는 시작하지 말고, 이 작업을 어떤 모델과 어떤 방식으로 돌릴지 결정만 해서 말해라. 선택 이유를 한 줄로 붙여라."`, then wait and read. "select-model touches" shows a read of `~/.agents/skills/select-model/SKILL.md` before any other decision. "native subagents" and "Orca workers" say `none`. The reply keeps the work in this session.
- **Large task.** Run `$VP launch R-large --agent claude --prompt "/poteto-mode 이 프로젝트의 .agents/skills 아래 59개 skill 전체를 읽고, 서로 겹치거나 모순되는 규칙을 모두 찾아 통합 설계안을 만들어라. 되돌리기 어려운 구조 변경이 포함될 수 있다. 이번은 모델 선택 확인용이다. 실제 조사와 subagent와 worker는 시작하지 말고, 이 작업을 어떤 모델과 어떤 방식으로 돌릴지 결정만 해서 말해라. 선택 이유를 한 줄로 붙여라."`. The reply sends the wide read to the reading preference (a Grok worker with the fixture), the design judgment to the judgment preference (`claude opus` with the fixture), and says Orca runs Grok on the model in `~/.grok/config.toml`. Nothing starts.
- **Missing.** With the lock held and `$VP sm status` saying `absent`, run `$VP launch R-missing --agent claude --prompt "/poteto-mode pstack 저장소의 skills 아래 59개 skill에서 Cursor 전용 표현이 남은 곳을 전수 조사하고 고치는 방안을 정해라. 이번은 모델 선택 확인용이다. 실제 조사와 subagent와 worker는 시작하지 말고, 이 작업을 어떤 모델과 어떤 방식으로 돌릴지 결정만 해서 말해라. 선택 이유를 한 줄로 붙여라."`. The reply says once that no `select-model` exists and names `/setup-pstack`. A tool call reads `resolve-capability/SKILL.md`, and one checks `ORCA_CLI_BIN_DIR` or `ORCA_CLI_COMMAND`. The decision uses the `poteto-mode` defaults, with the Grok default sent to `spawn-worker` when Orca is there. End with `$VP cleanup <run id>` and `$VP sm release`.
- **Codex.** Run `$VP launch R-small --agent codex --prompt '$poteto-mode calc.js의 sum()이 마지막 원소를 빼먹는지 확인하고, 빼먹으면 고쳐줘. 이번은 모델 선택 확인용이다. 실제 작업과 subagent와 worker는 시작하지 말고, 이 작업을 어떤 모델과 어떤 방식으로 돌릴지 결정만 해서 말해라. 선택 이유를 한 줄로 붙여라.'`. Call 1 or 2 in "tool calls" reads `~/.agents/skills/select-model/SKILL.md`, and the reply keeps the work in this session.

## Gotchas

- Earlier passes on 2026-10-23: R1 small, R2 large, R3 missing (Claude chat), R4 small (Codex terminal). R1, R2, and R4 used the sample now kept as the fixture.
- `poteto-mode` asks to say the missing-skill line once, not in a set place. R3 happened to put it first. Do not fail a run for its position.
- At `sonnet low`, R-missing-145839 never checked the Orca variables and folded the Grok default into its own model. At the default effort, R-missing-150001 checked them and sent Grok to an Orca worker. A low-effort failure of a decision is rerun once at `--model default --effort default` before it counts against the skill.
- With the adapter (commit 1780317), R-missing-154538 passed at `sonnet low` in a terminal. It read `resolve-capability/SKILL.md` with `select-model`, checked `ORCA_CLI_*`, and sent the Grok default to `spawn-worker`. Its plan still named `grok-4.7-build-fast` at xhigh for the worker, which Orca refuses. Nothing started, so the adapter's `orca-workers.md` was not yet due.
- After the adapter told planners to give Grok no flags (3ed7e61), R-missing-155347 at `sonnet low` in a terminal read the adapter's section 1 and even ran `which orca`, then decided "이 세션은 Orca가 아니라 Claude Code입니다" without reading `ORCA_CLI_BIN_DIR`, and kept the whole job on its own model. So the Grok-flag sentence could not be observed. At `sonnet low` the Orca check passed in 1 of 3 runs (145839 chat fail, 154538 pass, 155347 fail). A single low-effort run does not settle this criterion either way.
- After the adapter split section 1 into two questions with the command `env | grep '^ORCA_CLI_'` (4216b3a), two more `sonnet low` terminal runs from empty fake homes, R-missing-155657 and R-missing-155704, both skipped the command. 155657 read the adapter and said "이번에는 `env | grep '^ORCA_CLI_'`로 확인하지 않았습니다". 155704 did not read the adapter and said it still had to check section 1 "시작 전에". Both kept the Grok default on `spawn-worker` with a fallback instead of deciding Orca was absent, and both still named `grok-4.7-build-fast xhigh` for it. A plan-only prompt reads to them as a reason to leave the check for the start. The Orca check now stands at 1 of 5 runs at `sonnet low`.
- After `poteto-mode`'s fallback said to run `env | grep '^ORCA_CLI_'` even when only planning, and to plan Grok with no flags (7c6541c), R-missing-160658 and R-missing-160705 (`sonnet low`, terminal, empty fake homes) both ran the command before deciding, sent the Grok default to `spawn-worker`, and named no Grok model or effort ("Orca에서는 Grok이 model과 effort 플래그를 거부하므로 둘 다 지정하지 않는다"). 2 of 2.
- Without Orca, that fallback still says to run the seat on its own model when the command prints nothing, while `resolve-capability` now starts another product's CLI without Orca. A no-Orca missing check would follow the fallback and fold. The two texts disagree until one changes.
- The prompts ask for the reason in one line, which is also what `poteto-mode` asks. The reason line is not evidence for the skill. Judge the choice and the read.
- The missing check is the cheapest run in this map. It reads no worker record and starts nothing. Use it to prove `vp` itself works after a change to the helper.
- When the read fails, the model may search `~/.agents`, `~/.claude`, and `~/.codex` for the skill (V9 did). That search is fine. Finding and using a different file is not.
- A real `select-model` makes the large-task expectations those of the user's preferences. Read its `## Preferences` before judging.
