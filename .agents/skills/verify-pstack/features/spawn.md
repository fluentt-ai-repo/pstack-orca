# Spawn

When a task needs a helper, the agent reads `select-model` and the capability adapter `resolve-capability`, picks the model for that kind of work, and starts the helper where that model can run. Its own model runs as its own subagent. Another agent's model runs as an Orca worker when Orca is here. Without Orca it starts the other product's CLI headless from its shell (`grok -p`, `codex exec`, `claude -p`), and folds the seat into its own model only when that product is not installed or not logged in, saying so in one line.

## Sub-features

- `spawn-adapter` reads `../resolve-capability/SKILL.md` before the first spawn, and `references/orca-workers.md` before the first Orca worker.
- `spawn-other-orca` starts a seat whose model belongs to another agent through `spawn-worker`: an Orca worker, or a CLI worker when the preferred model is one Orca cannot start (Grok under Orca runs only its config model), saying why. For Grok it passes `--agent grok` with no model or effort flag, and the reply names the model that actually ran.
- `spawn-same` starts a seat whose model belongs to its own harness as its own subagent, with that model and an effort, and starts no Orca worker.
- `spawn-no-orca`, when `env | grep '^ORCA_CLI_'` prints nothing, starts another product's seat as `resolve-capability/references/cli-workers.md` says: `grok -p` with `-m` and `--reasoning-effort` (a headless Grok takes both, unlike an Orca worker), `codex exec` (ending in `< /dev/null`, or it waits on an open stdin and never starts), or `claude -p`. It reads that reference first, names the model it asked for and the one the output says ran, and checks `git status` after. It folds into its own model only when the product is missing or not logged in, and says so.
- `spawn-readonly` gives a read-only seat a read-only agent type (`Explore` in Claude Code) or a brief that forbids edits, and checks `git status` after an Orca worker settles.
- `spawn-codex` does `spawn-other-orca` from Codex.
- `spawn-codex-same` starts a Codex-preferred seat from Codex. Not run yet.

## How to get to it (user POV)

- Inside any `poteto-mode` task that delegates, in Claude Code (chat, terminal, plain) or Codex (terminal).
- The checks below ask for exactly one helper so the spawn decision is the only thing under test.

## Driving it with vp

Preconditions:

- `poteto-mode` and `resolve-capability` are synced.
- `select-model` is present: the user's real one, or the fixture placed under the lock (`$VP sm lock "spawn check"`, then `$VP sm place`).
- With the fixture, reading goes to Grok and judgment goes to `claude opus`.

- **Both seats in one run, fake home.** Run `$VP fakehome S --sample`, then `$VP launch S-pair --agent claude --fakehome /tmp/vp-home-S --prompt "/poteto-mode 이번 테스트는 서브에이전트 spawn 규칙만 확인한다. playbook은 쓰지 말고, 읽기 전용 서브에이전트를 정확히 두 개 띄워라. 하나는 코드를 읽고 탐색하는 일로 {testbed}/calc.js 가 하는 일을 한 문장으로 보고하게 하고, 다른 하나는 판단을 맡는 일로 calc.js 의 sum() 설계가 적절한지 한 문장으로 평가하게 해라. 파일은 수정하지 마라. 이번 시험에서는 ~/.agents 아래 파일을 찾을 때만 홈 디렉터리를 {home} 으로 간주해라. 마지막에 각 서브에이전트를 어떤 에이전트·모델·effort로 어떻게 띄웠는지, 실제로 돈 모델은 무엇인지 보고해라."`. No lock is needed, because the run reads the fixture from the fake home. The criteria are those of the read seat and the judgment seat below, plus `spawn-adapter`, and the two `&`-linked calls show both seats started in one message.
- **Read seat, Orca.** Run `$VP launch S-read --agent claude --prompt "/poteto-mode 이번 테스트는 서브에이전트 spawn 규칙만 확인한다. playbook이나 다른 skill은 쓰지 말고, 코드를 읽고 탐색하는 읽기 전용 서브에이전트를 정확히 하나 띄워서 {testbed}/calc.js 가 하는 일을 한 문장으로 보고하게 해라. 파일은 수정하지 마라. 마지막에 그 서브에이전트를 어떤 에이전트·모델·effort로 어떻게 띄웠는지, 실제로 돈 모델은 무엇인지 보고해라."`, then `$VP wait <run id>` and `$VP read <run id>`. "Orca workers" shows exactly one worker with `agent=grok requested model=none effort=none` and a `ran:` line. No `worker-start` call for Grok carries `--model` or `--effort`. The reply names the same model as the `ran:` line.
- **Judgment seat, own harness.** Run the same with label `S-judge` and the prompt `"/poteto-mode 이번 테스트는 서브에이전트 spawn 규칙만 확인한다. playbook이나 다른 skill은 쓰지 말고, 판단을 맡는 읽기 전용 서브에이전트를 정확히 하나 띄워서 {testbed}/calc.js 의 sum() 설계가 적절한지 한 문장으로 평가하게 해라. 파일은 수정하지 마라. 마지막에 그 서브에이전트를 어떤 에이전트·모델·effort로 어떻게 띄웠는지 보고해라."`. "native subagents" shows one `Agent` call with `model=opus`, a read-only type, and "Orca workers" says `none`.
- **No Orca.** Run `$VP fakehome P --sample`, then `$VP launch S-plain --agent claude --surface plain --fakehome /tmp/vp-home-P --prompt "/poteto-mode 이번 테스트는 서브에이전트 spawn 규칙만 확인한다. playbook은 쓰지 말고, 코드를 읽고 탐색하는 읽기 전용 서브에이전트를 정확히 하나 띄워서 {testbed}/calc.js 가 하는 일을 한 문장으로 보고하게 해라. 파일은 수정하지 마라. 이번 시험에서는 ~/.agents 아래 파일을 찾을 때만 홈 디렉터리를 {home} 으로 간주해라. 마지막에 그 서브에이전트를 어떤 에이전트·모델·effort로 어떻게 띄웠는지, 실제로 돈 모델은 무엇인지 보고해라."`. Answer a first screen as `../SKILL.md` says. A tool call runs `env | grep '^ORCA_CLI_'` and prints nothing. "skill files named in tool calls" includes `references/cli-workers.md`. "CLI workers" shows one `grok -p` call with `-m` and `--reasoning-effort` and a `ran:` model. "Orca workers" says `none`. The reply names the requested and the ran model. A later call runs `git status`.
- **Codex.** Run `$VP launch S-read --agent codex --prompt '$poteto-mode 이번 테스트는 서브에이전트 spawn 규칙만 확인한다. playbook이나 다른 skill은 쓰지 말고, 코드를 읽고 탐색하는 읽기 전용 서브에이전트를 정확히 하나 띄워서 {testbed}/calc.js 가 하는 일을 한 문장으로 보고하게 해라. 파일은 수정하지 마라. 마지막에 그 서브에이전트를 어떤 에이전트·모델·effort로 어떻게 띄웠는지, 실제로 돈 모델은 무엇인지 보고해라.'`. "Orca workers" shows one `agent=grok` worker with no model or effort, and the reply names the model that ran. Close it with `$VP cleanup <run id>`.
- **Read-only.** For every worker run, a tool call after the worker settles runs `git status`, and the testbed line says `no new changes`.

## Gotchas

- S-pair-154658 (2026-10-23, `sonnet low`, terminal, fake home) passed `spawn-adapter`, `spawn-other-orca`, and `spawn-same`, and failed `spawn-readonly`: the judgment seat was a `general-purpose` subagent, not `Explore`, though its brief forbade edits. It was not rerun at the default effort. Its Grok worker spec ended with the adapter's report sentence word for word.
- S-plain-160657 (plain, `sonnet low`, the fixture in a fake home) read the adapter and found no Orca, then folded into an `Explore` subagent: "Grok은 Orca 워커로만 띄울 수 있고 ... 같은 하네스의 Claude 서브에이전트로 대체했습니다". It never read `cli-workers.md`. The fixture says Grok is "Orca worker only", because it was generated under Orca before CLI workers existed, and the model trusted it over the adapter. The fixture was then regenerated (G-161153), and S-plain-161352 under the same conditions read `cli-workers.md` and started `grok -p -m grok-4.7-build-fast --reasoning-effort xhigh --permission-mode plan`, with `modelUsage` naming that model. It passed.
- Final pass before release (2026-10-23, `sonnet low`, F3's generator output as `select-model`): F6-spawn-171904 under Orca started the Grok seat as `grok -p -m grok-4.7-build-fast --reasoning-effort xhigh` rather than an Orca worker, because Orca would run `grok-4.7`, and the judgment seat as a read-only `Plan` subagent on opus. F7-plain-171910 without Orca read `cli-workers.md` and started `grok -p` with the same flags. Both Grok session records show `grok-4.7-build-fast` at `xhigh`, so a headless Grok honors both flags. Both passed.
- S-ro-155230 rechecked `spawn-readonly` after the adapter said general-purpose types are not read-only (3ed7e61): same model, effort, surface, and fake home, one judgment seat with its model fixed to `sonnet low` for cost. It chose `Explore` and passed. Its reply said the subagent ran in the background, which the call does not show.
- Earlier passes, with the retired role table and the prompt wording "how explorer 역할": S1b and S3 (Claude chat), S2 (no Orca), S4 (Codex). The prompts above replace the role name with the kind of work and have not run yet in this wording.
- The prompts ask the agent to report how it started the helper and which model ran. So the report itself proves nothing. The proof is that the report matches Orca's worker record and the worker's own session record.
- Orca refuses `--model` and `--effort` for Grok with `Agent grok does not support launch-time model selection`. A run that hits this and then retries without the flags passes only if the skill no longer tells it to pass them.
- A Grok worker's `summary.json` says `grok-4.7` while each message says `grok-4.7-build`. Report `current_model_id` from `summary.json`.
- `vp` launches the driven session at low effort, but the helper's model and effort are the skill's choice. A worker spends that agent's usage at whatever effort the agent picked.
- The plain run reads a `select-model` that says Orca is present. The fold to its own model is the behavior under test, not a mismatch.
