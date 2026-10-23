# Generator

A user runs `/setup-pstack`. It says whether this is a new setup or an update, then follows `create-model-selection-skill`: it surveys the agent products and models on this computer, asks five questions and then a link question, writes `select-model` with its inventory, references, and log, proves each product with one cheap job, and hands over. The tests give every answer in the prompt and point the generator at a fake home, so the user's real `~/.agents/skills/select-model` is never touched.

## Sub-features

- `gen-state` says in one sentence whether this is a new setup or an update.
- `gen-survey` finds `claude`, `codex`, and `grok`, reads Orca's model catalog, and notes model pins in each product's settings.
- `gen-noask` asks no question when the prompt already answers them all.
- `gen-write` writes `SKILL.md` (under about 90 lines), `inventory.md`, `log.md`, and `references/` (Orca's file and one per product found, each starting `<!-- from pstack <version>, overwritten on update -->`) under the target.
- `gen-prefs` writes one sentence per answer with its reason under `## Preferences`, and nothing the user did not say.
- `gen-links` handles the link question last. It creates `<home>/.claude/skills/select-model` as a relative link to `../../.agents/skills/select-model`, leaves a name that is already taken alone and says so, links nothing for Codex, and copies the skill nowhere.
- `gen-prove` starts one read-only job per product at the lowest effort, records what each reported, and takes Grok's model from its session record.
- `gen-handover` reports in the order of step 6 of the generator and starts no project work.
- `gen-update` reruns on an existing `select-model`, keeps `## Preferences`, appends to `log.md`, and offers only missing links. Not run with this generator yet.
- `gen-codex` generates from Codex. Not run with this generator yet.

## How to get to it (user POV)

- Claude Code: `/setup-pstack`, in an Orca chat, an Orca terminal, or plain.
- Codex: `$setup-pstack` in an Orca terminal.
- `/create-model-selection-skill` runs the generator alone. `setup-pstack` is the entry users know, so the checks use it.

## Driving it with vp

Preconditions:

- `setup-pstack` and `create-model-selection-skill` are synced.
- A fake home. Run `$VP fakehome G` (any unused name). It prints `/tmp/vp-home-G`. No lock is needed.
- For `gen-links`, occupy one link name first so the refusal is tested: `mkdir -p /tmp/vp-home-G/.grok/skills/select-model && echo "someone's own dir" > /tmp/vp-home-G/.grok/skills/select-model/README.txt`.

- **Launch.** Run `$VP launch G --agent claude --fakehome /tmp/vp-home-G --prompt "/setup-pstack 실행해줘. 이번은 생성기의 링크 질문 검증이다. 질문 답은 미리 준다. 그대로 쓰고 다시 묻지 마라. 예산 large, 코드와 읽기는 grok grok-4.7-build-fast, 판단과 산문은 claude opus, 피할 것 없음, 여러 모델은 위험하거나 의견이 갈릴 때만, 다른 vendor의 agent는 Orca worker로 허용. 링크는 찾은 제품 모두에 건다. 이번 시험에서는 홈 디렉터리를 {home} 으로 간주해라: 쓸 위치는 {home}/.agents/skills/select-model/ 이고, 링크 폴더는 {home}/.claude/skills 와 {home}/.grok/skills 이다. 증명 단계(job 시작)는 건너뛰고 inventory에 not verified here로 적어라. 검증 skill 제안(4번, 5번)도 건너뛴다."`. The output says `select-model at launch` and, when a real one exists, that it was copied into the evidence first.
- **Wait.** Run `$VP wait <run id> --timeout 540`. A generator run takes several minutes. Exit 3 means it asked a question, which fails `gen-noask`.
- **Read.** Run `$VP read <run id>`. No `AskUserQuestion` call appears. The tool calls read the testbed's `create-model-selection-skill/SKILL.md` and its references, Orca's catalog, and the products' settings files.
- **Files.** Run `find /tmp/vp-home-G \( -type f -o -type l \) | sort`, `wc -l /tmp/vp-home-G/.agents/skills/select-model/SKILL.md`, and `head -1 /tmp/vp-home-G/.agents/skills/select-model/references/*.md`. The four kinds of files exist, `SKILL.md` is under about 90 lines, and each reference starts with the version comment.
- **Preferences.** Run `sed -n '/^## Preferences/,/^## /p' /tmp/vp-home-G/.agents/skills/select-model/SKILL.md`. Each answer in the prompt has one sentence with a reason. No sentence states a preference the prompt did not give.
- **Links.** Run `readlink /tmp/vp-home-G/.claude/skills/select-model` and `cat /tmp/vp-home-G/.grok/skills/select-model/README.txt`. The first prints `../../.agents/skills/select-model`. The second still prints `someone's own dir`, and the reply says that name was taken and left alone.
- **Real path untouched.** The `select-model` line of the summary shows the same state at launch and now. A change there is a failure of the generator, not a `VOID`.
- **Prove step.** Only when step 5 of the generator changed: replace "증명 단계(job 시작)는 건너뛰고 inventory에 not verified here로 적어라." with "증명 단계 job은 제품당 하나만 시작한다." "Orca workers" and "native subagents" then show one job per product at the lowest effort, and `inventory.md` records what each reported. This spends usage on all three products.
- **Cleanup.** Run `$VP cleanup <run id>`. The fake home moves to `fakehome/` in the evidence, links included.

## Gotchas

- Earlier passes: Unit 1 runs A to D and C (the retired role table), G1 on 2026-10-23 (the first `select-model`, written to `/tmp/select-model-test`), and G4 (this link prompt, fake home `/tmp/fakehome`).
- The generator surveys the real computer (`~/.claude/settings.json`, `~/.codex/config.toml`, `~/.grok/config.toml`, Orca's catalog) even with a fake home. Only the write target and the link folders move. That is intended.
- The fake home is a stand-in. It does not prove the real `~` resolves, and the prompt names the target, which a user's run would not do.
- If the generator asks a question anyway, the run fails `gen-noask` and `vp wait` exits 3. `$VP screen <run id>` shows the question. Answer it with `$VP key` only to let the run finish, then clean up as usual.
- G1 found two defects later fixed: `references/grok.md` claimed the effort Grok runs at, and the generator added a Codex preference the user never gave. `gen-prefs` exists to catch the second kind again.
- `gen-prove` starts real jobs on Claude, Codex, and Grok. Run it only when the prove step itself changed.
