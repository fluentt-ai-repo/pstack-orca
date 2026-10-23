# Spawn

When a task needs a helper, the agent reads `select-model` and the capability adapter `resolve-capability`, picks the model for that kind of work, and starts the helper where that model can run. Its own model runs as its own subagent. Another agent's model runs as an Orca worker when Orca is here. Without Orca it folds the seat into its own model and says so in one line.

## Sub-features

- `spawn-adapter` reads `../resolve-capability/SKILL.md` before the first spawn, and `references/orca-workers.md` before the first Orca worker.
- `spawn-other-orca` starts a seat whose model belongs to another agent as an Orca worker (`spawn-worker`). For Grok it passes `--agent grok` with no model or effort flag, and the reply names the model that actually ran.
- `spawn-same` starts a seat whose model belongs to its own harness as its own subagent, with that model and an effort, and starts no Orca worker.
- `spawn-no-orca` runs the seat on its own model when `ORCA_CLI_BIN_DIR` and `ORCA_CLI_COMMAND` are unset, and the reply says Orca was missing.
- `spawn-readonly` gives a read-only seat a read-only agent type (`Explore` in Claude Code) or a brief that forbids edits, and checks `git status` after an Orca worker settles.
- `spawn-codex` does `spawn-other-orca` from Codex.
- `spawn-codex-same` starts a Codex-preferred seat from Codex. Not run yet.

## How to get to it (user POV)

- Inside any `poteto-mode` task that delegates, in Claude Code (chat, terminal, plain) or Codex (terminal).
- The checks below ask for exactly one helper so the spawn decision is the only thing under test.

## Driving it with vp

Preconditions:

- `poteto-mode` and `orca-harness` are synced.
- `select-model` is present: the user's real one, or the fixture placed under the lock (`$VP sm lock "spawn check"`, then `$VP sm place`).
- With the fixture, reading goes to Grok and judgment goes to `claude opus`.

- **Both seats in one run, fake home.** Run `$VP fakehome S --sample`, then `$VP launch S-pair --agent claude --fakehome /tmp/vp-home-S --prompt "/poteto-mode 이번 테스트는 서브에이전트 spawn 규칙만 확인한다. playbook은 쓰지 말고, 읽기 전용 서브에이전트를 정확히 두 개 띄워라. 하나는 코드를 읽고 탐색하는 일로 /Users/fluentt/Documents/pstack-testbed/calc.js 가 하는 일을 한 문장으로 보고하게 하고, 다른 하나는 판단을 맡는 일로 calc.js 의 sum() 설계가 적절한지 한 문장으로 평가하게 해라. 파일은 수정하지 마라. 이번 시험에서는 ~/.agents 아래 파일을 찾을 때만 홈 디렉터리를 {home} 으로 간주해라. 마지막에 각 서브에이전트를 어떤 에이전트·모델·effort로 어떻게 띄웠는지, 실제로 돈 모델은 무엇인지 보고해라."`. No lock is needed, because the run reads the fixture from the fake home. The criteria are those of the read seat and the judgment seat below, plus `spawn-adapter`, and the two `&`-linked calls show both seats started in one message.
- **Read seat, Orca.** Run `$VP launch S-read --agent claude --prompt "/poteto-mode 이번 테스트는 서브에이전트 spawn 규칙만 확인한다. playbook이나 다른 skill은 쓰지 말고, 코드를 읽고 탐색하는 읽기 전용 서브에이전트를 정확히 하나 띄워서 /Users/fluentt/Documents/pstack-testbed/calc.js 가 하는 일을 한 문장으로 보고하게 해라. 파일은 수정하지 마라. 마지막에 그 서브에이전트를 어떤 에이전트·모델·effort로 어떻게 띄웠는지, 실제로 돈 모델은 무엇인지 보고해라."`, then `$VP wait <run id>` and `$VP read <run id>`. "Orca workers" shows exactly one worker with `agent=grok requested model=none effort=none` and a `ran:` line. No `worker-start` call for Grok carries `--model` or `--effort`. The reply names the same model as the `ran:` line.
- **Judgment seat, own harness.** Run the same with label `S-judge` and the prompt `"/poteto-mode 이번 테스트는 서브에이전트 spawn 규칙만 확인한다. playbook이나 다른 skill은 쓰지 말고, 판단을 맡는 읽기 전용 서브에이전트를 정확히 하나 띄워서 /Users/fluentt/Documents/pstack-testbed/calc.js 의 sum() 설계가 적절한지 한 문장으로 평가하게 해라. 파일은 수정하지 마라. 마지막에 그 서브에이전트를 어떤 에이전트·모델·effort로 어떻게 띄웠는지 보고해라."`. "native subagents" shows one `Agent` call with `model=opus`, a read-only type, and "Orca workers" says `none`.
- **No Orca.** Run the read-seat prompt with `--surface plain`. Answer the first screen as `../SKILL.md` says. "Orca workers" says `none`. "native subagents" shows one read-only subagent. The reply says Orca was missing and the seat ran on the session's own model.
- **Codex.** Run `$VP launch S-read --agent codex --prompt '$poteto-mode 이번 테스트는 서브에이전트 spawn 규칙만 확인한다. playbook이나 다른 skill은 쓰지 말고, 코드를 읽고 탐색하는 읽기 전용 서브에이전트를 정확히 하나 띄워서 /Users/fluentt/Documents/pstack-testbed/calc.js 가 하는 일을 한 문장으로 보고하게 해라. 파일은 수정하지 마라. 마지막에 그 서브에이전트를 어떤 에이전트·모델·effort로 어떻게 띄웠는지, 실제로 돈 모델은 무엇인지 보고해라.'`. "Orca workers" shows one `agent=grok` worker with no model or effort, and the reply names the model that ran. Close it with `$VP cleanup <run id>`.
- **Read-only.** For every worker run, a tool call after the worker settles runs `git status`, and the testbed line says `no new changes`.

## Gotchas

- S-pair-154658 (2026-10-23, `sonnet low`, terminal, fake home) passed `spawn-adapter`, `spawn-other-orca`, and `spawn-same`, and failed `spawn-readonly`: the judgment seat was a `general-purpose` subagent, not `Explore`, though its brief forbade edits. It was not rerun at the default effort. Its Grok worker spec ended with the adapter's report sentence word for word.
- S-ro-155230 rechecked `spawn-readonly` after the adapter said general-purpose types are not read-only (3ed7e61): same model, effort, surface, and fake home, one judgment seat with its model fixed to `sonnet low` for cost. It chose `Explore` and passed. Its reply said the subagent ran in the background, which the call does not show.
- Earlier passes, with the retired role table and the prompt wording "how explorer 역할": S1b and S3 (Claude chat), S2 (no Orca), S4 (Codex). The prompts above replace the role name with the kind of work and have not run yet in this wording.
- The prompts ask the agent to report how it started the helper and which model ran. So the report itself proves nothing. The proof is that the report matches Orca's worker record and the worker's own session record.
- Orca refuses `--model` and `--effort` for Grok with `Agent grok does not support launch-time model selection`. A run that hits this and then retries without the flags passes only if the skill no longer tells it to pass them.
- A Grok worker's `summary.json` says `grok-4.7` while each message says `grok-4.7-build`. Report `current_model_id` from `summary.json`.
- `vp` launches the driven session at low effort, but the helper's model and effort are the skill's choice. A worker spends that agent's usage at whatever effort the agent picked.
- The plain run reads a `select-model` that says Orca is present. The fold to its own model is the behavior under test, not a mismatch.
