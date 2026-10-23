# pstack verification map

This map is the maintained list of what verify-pstack can prove about pstack's skills, and how. Find the feature your change touches and follow its file. The run table in [`../SKILL.md`](../SKILL.md) decides how many runs to spend. This map lists what can be run, not what must be.

## Baseline preconditions

- `$VP doctor` has no `FAIL` line, with `VP=.agents/skills/verify-pstack/scripts/vp.mjs` from the repo root.
- The skills your change touched are synced into the testbed with `$VP sync <name>...`.
- `select-model` is in the state the feature file names, set by the Shared state rules in `../SKILL.md`.
- Orca is running. Every surface except plain starts through `orca agent launch`.

## Driving conventions

- One run is one environment and one prompt. Runs start in an Orca terminal. Add `--surface chat` only for behavior an Orca chat alone shows, because no Orca command closes a chat.
- `vp launch` adds the run id to the prompt as `[<run id>]`, or puts it where the prompt says `{marker}`. `{id}` becomes the bare run id, `{testbed}` the testbed's absolute path, and `{home}` the fake home.
- Every run ends with `$VP cleanup <run id>`, which closes the run's terminal tab and keeps the evidence.
- Claude takes `/name <args>`. Codex takes `$name <args>`, quoted with single quotes in the shell.
- The prompts here already ran, unless a line says otherwise. Use them verbatim so results compare. When a skill's scope changes and a prompt must change, say so in the verdict.
- A prompt bounds the scope and answers the skill's questions. It never says what the skill under test should make the agent do.
- Expected seats and models below assume the fixture `select-model` (Claude, Codex, and Grok, Orca present, reading and code to Grok, judgment and prose to Claude Opus). With the user's real `select-model`, read its `## Preferences` first and expect what they say instead.

## Proof and skip reporting

- A pass names, for every criterion, the tool call number in `summary.txt` or the quoted reply line that shows it.
- A run marked `VOID` proves nothing. Rerun it.
- A sub-feature that was not run is reported as not run. One environment never stands in for another.
- An environment that could not be reached is reported with the command tried and what was missing.
- A criterion the prompt itself asked for (such as "say the reason in one line") is not evidence that the skill made the agent do it. The feature's Gotchas name these.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the behavior a user sees. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs, one line each.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with vp` starts with `Preconditions:` and pairs each action with the exact command and the observable result.
4. `Gotchas` lists traps that waste or invalidate a run.

## Features

- [Entry](entry.md) covers `poteto-mode` choosing a playbook, copying its steps, and starting nothing it was told not to.
- [Spawn](spawn.md) covers where a seat runs: your own subagent, an Orca worker, or your own model when Orca is missing.
- [Runtime model choice](runtime.md) covers reading `select-model` per task, and the fallback when it is missing.
- [Generator](generator.md) covers `/setup-pstack` writing `select-model`, proving it, and linking it.
- [Cross-model skills](cross-model.md) covers `how`, `swarm`, `interrogate`, `arena`, `reflect`, `why`, and `architect` placing their seats.
