# Entry

A user types `/poteto-mode` (or `$poteto-mode` in Codex) with a task. The agent matches the task to a playbook, opens that playbook's file, and copies its steps word for word into a todo list before any task-specific item. When the prompt says to stop there, it starts no investigation, subagent, or worker.

## Sub-features

- `entry-route` picks the playbook that fits the task. The calc.js question is a read-only question, so Investigation.
- `entry-copy` opens `skills/poteto-mode/playbooks/<title>.md` and copies its numbered steps verbatim as the first todo items. A step it will not do stays with `skip: <reason>`.
- `entry-hold` starts no subagent, no Orca worker, and no investigation, and changes no file.
- `entry-todo-tool` uses the plan tool the harness has (`TodoWrite` in Claude Code, `update_plan` in Codex), or a list in the reply when it has none.

## How to get to it (user POV)

- Claude Code in an Orca chat or terminal: `/poteto-mode <task>`.
- Claude Code outside Orca: the same, in the plain surface.
- Codex in an Orca terminal: `$poteto-mode <task>`.

## Driving it with vp

Preconditions:

- `poteto-mode` is synced into the testbed.
- `select-model` may be in any state. The entry does not depend on it, and `vp` records it.

- **Launch.** Run `$VP launch E --agent claude --prompt "/poteto-mode calc.js의 sum()이 마지막 원소를 빼먹는지 조사해줘. 이번은 진입 확인용이다. 선택한 playbook의 단계를 todo(todo 도구가 없으면 답변 목록)로 옮기는 데까지만 하고 멈춰라. 조사·subagent·worker는 시작하지 마."`. The output names the run id and `prompt handed-to-terminal`.
- **Wait.** Run `$VP wait <run id>`. It exits 0 with the number of tool calls.
- **Route.** Run `$VP read <run id>`. "skill files named in tool calls" lists `poteto-mode/playbooks/investigation.md`.
- **Copy.** "last todo list" starts with the four numbered steps of `skills/poteto-mode/playbooks/investigation.md`, in order and in the playbook's words. Compare with `grep -n '^[0-9]\. ' skills/poteto-mode/playbooks/investigation.md`.
- **Hold.** "native subagents" and "Orca workers" both say `none`, and the testbed line says `no new changes`.
- **Codex.** Run `$VP launch E --agent codex --prompt '$poteto-mode calc.js의 sum()이 마지막 원소를 빼먹는지 조사해줘. 이번은 진입 확인용이다. 선택한 playbook의 단계를 todo(todo 도구가 없으면 답변 목록)로 옮기는 데까지만 하고 멈춰라. 조사·subagent·worker는 시작하지 마.'`. The todo list comes from `update_plan`. Close it with `$VP cleanup <run id>`.
- **No Orca.** Run the Claude prompt with `--surface plain`, answer the first screen as `../SKILL.md` says, then wait and read. The criteria are the same.

## Gotchas

- Earlier passes: E1 (Claude chat), E2 (Claude terminal), E3 (no Orca), E4 (Codex terminal). They ran before `select-model` existed.
- Final pass before release: F1-entry-171628 (Claude terminal) and F2-entry-171630 (Codex terminal) both passed. Neither build offered a todo tool (Claude Code 2.1.309 showed no `TodoWrite`, and that Codex build's instructions had no `update_plan`), so both kept the list in the reply, which the criterion allows.
- `poteto-mode` reads `select-model` and `../resolve-capability/SKILL.md` near the start even for an entry check. Those reads are expected and are not criteria here.
- E4 also tried to read a role-table file that no skill names any more. Note such a read in the verdict. It does not fail the entry.
- The prompt says to stop after the todo list. A run that goes on to investigate fails `entry-hold`, even when its answer is right.
- A step reworded in the todo list fails `entry-copy`. Compare the text, not the meaning.
