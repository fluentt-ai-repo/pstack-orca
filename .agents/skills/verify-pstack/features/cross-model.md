# Cross-model skills

Seven skills put several models on one job: `how`, `swarm`, `interrogate`, `arena`, `reflect`, `why`, and `architect`. Each states a seat table (kind of work, needs, count and diversity) and names no model. The agent reads `select-model` and the Subagents section of `poteto-mode`, then fills each seat with a model and starts it where that model runs. The user sees the seats run and a reply that says which model ran each one.

## Sub-features

- `xm-read` reads `~/.agents/skills/select-model/SKILL.md` and the Subagents section of `poteto-mode` before the first spawn, and reads no role table.
- `xm-how` runs two explorers together on the reading preference and one explainer on the judgment preference, all read-only.
- `xm-swarm` runs one read-only worker per slice and writes one report with `PASS` and `ISSUES`.
- `xm-interrogate` runs at least two reviewers, labeled A and B, on different models and vendors when the computer has them, started together.
- `xm-arena` runs at least two structurally different runners on different vendors, started in the same message, then a judge outside the parent's vendor that starts after every runner finishes.
- `xm-reflect` finds its own transcript among parallel sessions, keeps seats that need MCP on its own harness, and starts the synthesizer.
- `xm-why` plans an investigator per category with a matching MCP, keeps MCP seats home, may send source control to a worker, and names categories with no MCP as gaps. Plan only.
- `xm-architect` names the bundled skills it reads, splits the runners across vendors, and puts a read-only cross-judge after the runners. Plan only.
- `xm-missing` says once that no `select-model` exists, gives the `/setup-pstack` line, and still keeps runners diverse and the judge outside its own vendor.
- `xm-clean` leaves the testbed unchanged and names the model that ran for every Grok seat.

## How to get to it (user POV)

- Claude Code: `/how`, `/swarm`, `/interrogate`, `/arena`, `/reflect`, `/why`, `/architect`.
- Codex: the same names with `$`.
- `poteto-mode` playbooks route to them too. These checks call them directly.

## Driving it with vp

Preconditions:

- The changed skill, `poteto-mode`, and `resolve-capability` are synced.
- `select-model` is present (the user's real one, or the fixture under the lock), except for `xm-missing`, which needs it absent under the lock.
- Expected seats below assume the fixture. Workers spend usage at the effort the skill picks.

- **how.** Run `$VP launch V-how --agent claude --prompt "/how {marker} calc.js와 calc.test.js가 어떻게 맞물려 동작하는지 설명해줘. 이번 시험에서는 complex 경로로 처리해라. explorer 2명(각각 calc.js, calc.test.js 담당)을 쓰고 explainer 1명이 종합한다. 파일은 수정하지 마."`. "select-model touches" comes before the first `worker-start`. "Orca workers" shows two `agent=grok` workers with no model or effort and a `ran:` line each. "native subagents" shows one read-only explainer on `opus`. The reply names the Grok model from the `ran:` lines.
- **swarm.** Run `$VP launch V-swarm --agent claude --prompt "/swarm {marker} calc.js와 calc.test.js를 각각 읽고 결함이 있는지 보고하게 해줘. slice 2개(calc.js, calc.test.js)로 나누고 둘 다 읽기 전용이다. 파일은 수정하지 마."`. Two read-only seats, one per slice. The reply has `PASS` and `ISSUES`.
- **interrogate.** Run `$VP launch V-int --agent claude --prompt "/interrogate {marker} git log -1 의 변경을 리뷰해줘. 파일은 수정하지 마."`. At least two reviewers on different vendors, started in one message, labeled Reviewer A and B in the reply.
- **arena.** Run `$VP launch V-arena --agent claude --prompt "/arena {marker} calc.js의 sum()의 off-by-one 버그를 고치는 diff를 후보로 만든다. 이번 시험은 작게 끝낸다. 각 후보는 /tmp/arena-{id}/candidate-<n>/ 아래에만 쓴다(git worktree는 만들지 마라). 저장소 파일은 수정하지 마. 선택한 base를 적용하지 말고 synthesis note까지만 쓰고 멈춰라."`. Two runners on different vendors start in the same message. The judge's `worker-start` comes after both runners settle and uses a vendor other than Claude. The testbed line says `no new changes`. Clean with `$VP cleanup <run id> --tmp` after checking `/tmp/arena-<run id>` is the run's.
- **reflect.** Run `$VP launch V-reflect --agent claude --prompt "/reflect {marker} 이번 시험은 transcript 위치 탐색과 spawn 경로 확인용이다. 대화가 짧아도 건너뛰지 말고 Step 1부터 3까지 진행해라. 승인 요청 단계에서 멈추고 아무것도 적용하거나 backlog에 올리지 마. 파일 수정 금지."`. A tool call opens the run's own record under `~/.claude/projects/<testbed path with every / as ->/`. Seats that need MCP are native subagents.
- **why.** Run `$VP launch V-why --agent claude --prompt "/why {marker} calc.js의 sum()이 왜 이렇게 생겼는지. 이번 시험에서는 investigator와 synthesizer를 실제로 띄우지 마라. Step 3의 Discovery까지만 하고, 각 seat를 어떤 agent·model·effort로 어디서(자기 harness인지 Orca worker인지) 띄울지 select-model에 비추어 계획만 표로 보여주고 멈춰라. 파일은 수정하지 마."`. Nothing starts. The plan keeps every MCP seat and the synthesizer on its own harness and marks categories without an MCP as gaps.
- **architect.** Run `$VP launch V-arch --agent claude --prompt "/architect {marker} calc.js에 mean() 추가를 설계하려 한다. 이번 시험에서는 실제 단계를 실행하지 마라. 각 Phase에서 어떤 skill 파일을 읽을지(경로)와 Phase B runner를 어떤 agent·model·effort로 어디서(자기 harness인지 Orca worker인지) 띄울지 select-model에 비추어 계획만 표로 보여주고 멈춰라. 파일은 수정하지 마."`. Nothing starts. The plan names the bundled skills by path, splits the runners across two vendors, and runs a read-only cross-judge after them.
- **Missing.** With the lock held and `select-model` absent, run `$VP launch V-missing --agent claude --prompt "/arena {marker} calc.js의 sum()의 off-by-one 버그를 고치는 diff를 후보로 만든다. 이번 시험에서는 실제로 아무것도 띄우거나 쓰지 마라. Phase A까지만 하고, runner와 cross-judge를 각각 어떤 agent·model·effort로 어디서(자기 harness인지 Orca worker인지) 띄울지, 그리고 사용자에게 알릴 안내가 있으면 그 문구까지 계획만 표로 보여주고 멈춰라. 파일은 수정하지 마."`. The reply says once that no `select-model` exists with the `/setup-pstack` line. Runners span two vendors and the judge is outside Claude. End with `$VP sm release`.
- **Codex.** Run the `how` check with `--agent codex` and the prompt starting `$how {marker}` in single quotes. Grok explorers are workers with `--agent grok` only. The explainer is an Orca Claude worker with a model and effort. Close it with `$VP cleanup <run id>`. The other checks run the same way: the Claude prompt with `$<name>` in place of `/<name>`, in single quotes, with `--agent codex`. `why`, `swarm`, `interrogate`, and `arena` ran this way on 2026-10-27 (see Gotchas). For a check whose criteria name a vendor, launch with `--effort xhigh`, because at `low` Codex kept seats on its own model.

## Gotchas

- Since commit 1780317 the Subagents section names capabilities (`spawn-worker`, `spawn-subagent`), so a run is expected to read `../resolve-capability/SKILL.md` and its `orca-workers.md` before the first worker. F8-interrogate-171911 and every Codex run on 2026-10-27 did.
- Codex runs on 2026-10-27 (gpt-6.1-sol, the fixture). C-why-131742 (low) passed, with Codex memory still on. The rest ran with it off.
  - C-swarm-152445 (low) passed after a capacity error and one "계속".
  - `interrogate` failed three times. C-int-152804 (low) killed its Claude and Grok CLI reviewers after six silent minutes while both were still working, which led to the "Silence is not a hang" rule in `cli-workers.md` (fcab995). After it, C-int-154641 (low) and C-int-x-160147 (xhigh) waited for the Claude reviewer and collected a cross-vendor review, but both replies skipped interrogate's Output Format and its "Reviewer [label]:" bullets.
  - C-arena-155437 (low) put the judge on its own Codex subagent and failed. C-arena-x-160149 (xhigh) put it on Claude and passed.
- At `low`, Codex fills seats with its own `spawn_agent` where it can. It called swarm's read-only slices code review and took the fixture's Review line ("follow the session's own model"), so the slices did not go to Grok, though swarm's table names their kind as read. It also judged its own arena. At `xhigh` it placed the arena judge on Claude.
- Codex dropped interrogate's output template at both `low` and `xhigh`, so effort does not explain it. Judge the labels from the reply, and report a miss as a question about the skill's wording or Codex's habit of shortening its final reply.
- A headless `claude -p` or `grok -p` seat prints nothing until it ends and can run past five minutes. Wait with `--quiet 90` or more.
- Codex starts CLI seats from python scripts, with absolute paths, `--prompt-file`, briefs on stdin, and `--no-session-persistence`. The last leaves no Claude record, so read the model from the files the script wrote (`run.json` or the JSON `modelUsage` in the arena temp folder, which `vp cleanup --tmp` copies into the evidence).
- Headless Grok refuses `--add-dir` ("additionalDirectories is not supported: a session works only in its cwd"). C-arena-x-160149 retried without it.
- The interrogate prompt reviews `git log -1`. Since the testbed history was cut on 2026-10-27, that is 779bcdf, the seven-line Codex memory config. Earlier runs reviewed other commits, so compare how reviewers were placed, not what they found.
- Final pass before release: F8-interrogate-171911 read the adapter in its first call, ran Reviewer A as a read-only `Explore` on opus and Reviewer B as `grok -p -m grok-4.7 --reasoning-effort xhigh` in the same message, and kept two vendors. Its reply called A "opus xhigh" though the call set no effort. It ran about fifteen minutes.
- Earlier passes with `select-model`: V1 to V9 on 2026-10-23, in the same order as above (V8 is the Codex `how`). Unit 3 runs U3-1 to U3-10 used the retired role table.
- `arena`, `interrogate`, and `how` start several workers. They are the most expensive checks in the map. `why` and `architect` stop at the plan, so they are cheap.
- V5 stopped after starting the synthesizer, so its output was never collected. A reflect check that needs the synthesizer must wait for it.
- Codex runs have tried to read the retired role-table file even though no skill names it. Note such a read. It fails `xm-read` only if a skill sent it there.
- The `why` and `architect` prompts say "select-model에 비추어", which points the agent at `select-model`. For those two, `xm-read` is not evidence. Use the `how` or `arena` check for it.
- A Claude reviewer started by Codex shows up as a Claude record in the testbed project folder, with the worker preamble as its first prompt. `vp` keeps it out of the driven-session search and lists it under the worker.
