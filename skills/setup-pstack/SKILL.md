---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects the models you can reach and writes one shared settings file that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Write `~/.agents/pstack-models.md`, the one file that sets pstack's model per role. Claude Code, Codex, Grok, and Orca read the same file, so run this once. Skills read it at the start of a task. Nothing loads it for them.

## Steps

### 1. Detect available models

Collect `<agent> <model> <efforts>` entries from every source you can see.

- **Your own harness.** List the models your subagent tool accepts, each with its effort values. In Claude Code these are the `model` and `effort` values in the `Agent` tool schema. In Codex and Grok, read the schema of `spawn_agent` or `spawn_subagent`. If you cannot tell, ask the user to paste the model names.
- **Orca.** When `ORCA_USER_DATA_PATH` is set and `$ORCA_USER_DATA_PATH/agent-model-catalog.json` exists, every agent in it can run as an Orca worker. List them:

```bash
jq -r '.entries[] | .agent as $a | .discovered.models[]? | "\($a) \(.id) \([.efforts[]?.value] | join(","))"' \
  "$ORCA_USER_DATA_PATH/agent-model-catalog.json"
```

An entry from your own harness runs here. An entry from the Orca catalog runs as an Orca worker. A model the user names is accepted, and you mark it as not reachable from this session. The default entries in step 5 count as named, because every harness shares the file and Orca can run them even when this session cannot. Keep them as written and mark them the same way. The aliases `inherit-parent` and `auto` are always valid. Never write a model that nobody detected, named, or listed as a default.

### 2. Load current state

The default role-to-model mapping is the file shape in step 5. If `~/.agents/pstack-models.md` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from the defaults. A line whose role is not in step 5, such as `how critics`, is from a retired role. Drop it.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Use your question tool if you have one, such as `AskUserQuestion` in Claude Code. Otherwise list numbered options in plain text. Offer these four options with these exact labels, and name the current budget when the file records one. With no file, say that `large` matches the skill defaults.

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by agent, model, list, or alias (`inherit-parent`, `auto`). `unlimited`, `large`, `medium`, and `small` set the effort of every real entry, panel entries included, to `max`, `xhigh`, `high`, or `medium`. The effort is the last token of an entry. The ladder is `max` > `xhigh` > `high` > `medium` > `low`. If the model does not offer the target effort, use the highest effort it offers at or below the target. A model with no effort list is written without an effort. `inherit-parent` and `auto` do not change. So `unlimited` turns `claude opus xhigh` into `claude opus max`. Grok tops out at `xhigh`, so under `unlimited` it stays `xhigh`. `large` keeps both defaults. `small` turns them into `claude opus medium` and `grok grok-4.7-build-fast medium`.

**(c) Show the roles and confirm.** Put the full table of roles and entries in the text of the confirmation question itself, and also print it as reply text if your harness shows it. The user sees neither your reasoning nor tool-call narration, so a table that lives only there, or that the question calls "the table above", is a missing table. Mark each entry that this session cannot reach as `not reachable here`. When some entries are not reachable, offer one bulk choice besides accepting: keep them (another harness or Orca runs them), or set every such role to `inherit-parent`. Do not ask the user to pick a replacement model for each role unless they ask to change roles. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected entries plus `inherit-parent` and `auto` (both mean: this role runs on the parent session's model, which is how Auto users stay on Auto). For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena selects one value from it whose agent differs from the parent's when possible. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every entry you write must name an agent and model that you detected, the user named, or step 5 lists as a default, and its effort must be one that model offers when you can see that model's efforts. `inherit-parent` and `auto` always pass. If a chosen entry fails, stop and ask again.

### 5. Write the file

Run `mkdir -p ~/.agents`. Write `~/.agents/pstack-models.md` with no frontmatter: the comment lines, a `# budget` line with the chosen label and its target effort, and one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Never put the role lines in `CLAUDE.md` or `AGENTS.md`. Shape:

```
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# Format: <role>: <agent> <model> <effort>. A panel role lists several entries separated by commas.
# `inherit-parent` or `auto` as a value: the role runs on the parent session's model. Alias entries in a panel list still count toward its fan-out.
# budget: large (xhigh)
feature, refactoring: grok grok-4.7-build-fast xhigh
bug-fix: grok grok-4.7-build-fast xhigh
perf-issue: grok grok-4.7-build-fast xhigh
hillclimb: grok grok-4.7-build-fast xhigh
judgment and prose: claude opus xhigh
hardest tasks: claude opus xhigh
how explorer: grok grok-4.7-build-fast xhigh
how explainer: claude opus xhigh
why investigators: grok grok-4.7-build-fast xhigh
why synthesizer: claude opus xhigh
reflect tooling: grok grok-4.7-build-fast xhigh
reflect judgment, divergent, synthesizer: claude opus xhigh
arena runners: claude opus xhigh, grok grok-4.7-build-fast xhigh
arena cross-judge pool: claude opus xhigh, grok grok-4.7-build-fast xhigh
swarm workers: grok grok-4.7-build-fast xhigh
architect runners: claude opus xhigh, grok grok-4.7-build-fast xhigh
interrogate reviewers: claude opus xhigh, grok grok-4.7-build-fast xhigh
```

### 6. Confirm

Tell the user the file was written, give its path, and say that the next task picks it up. Re-running this skill updates it. Also say how a role that names another agent runs: as an Orca worker when Orca is available, and otherwise on the current session's model, because a plain Claude Code or Codex session can only start its own models.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, run the **create-verification-skill** skill by reading its `SKILL.md` next to this one. On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, run the **create-formal-verification-skill** skill by reading its `SKILL.md` next to this one. On no, move on without pushing.
