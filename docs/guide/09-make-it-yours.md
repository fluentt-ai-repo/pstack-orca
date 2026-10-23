# Make it yours

poteto-mode is one person's style. The playbooks, routing, and model selection underneath it work just as well with yours. This page covers generating a personal mode, capturing lessons from a session, fixing the repo so agents stop repeating mistakes, authoring a focused skill, and testing a skill change before you trust it.

Start smaller than you think. You don't need many skills on day one, or even this whole set of skills. Prompt plainly, watch where agents fail, and add a skill or a check when the same failure shows up twice.

## Generate your own mode with `/automate-me`

```text
/automate-me
```

You don't describe your style, because [`/automate-me`](../../skills/automate-me/SKILL.md) reads it out of your history. It mines your recent transcripts in the active workspace for repeated preferences, in how you like replies, delegation, verification, code, prose, and process, then asks you which patterns are really you. It drafts `<your-name>-mode/SKILL.md` in your project's skill folder, or your user-level one, with your harness's skill-authoring skill (`author-skill`), runs the draft through [`/unslop`](../../skills/unslop/SKILL.md), and can open a PR from a worktree so you review it like any other change.

Run it again whenever your habits drift:

```text
/automate-me update my mode skill with everything since its last edit
```

Update mode mines only the history since the skill last changed. It keeps rules you haven't contradicted, revises the ones with new evidence, and adds sections only for new patterns.

## Capture a session's lessons with `/reflect`

Right after a task that taught you something, run:

```text
/reflect that took way too long. capture what we learned so the next run doesn't repeat it.
```

[`/reflect`](../../skills/reflect/SKILL.md) sends the transcript to three parallel reviewers, then a synthesizer sorts the proposals into `Accepted`, `Rejected`, and `Backlog` and waits for your approval before any skill changes. Approve a proposal only if it would change a future decision. One weird session is an anecdote, not a rule.

## Fix the environment with `/correct`

When you correct agents for the same mistake again and again, the fix belongs in the repo, not in your next prompt. Rank the options by how well they hold:

1. Make the mistake impossible with architecture or a better data structure.
2. Block it with types, or with a lint or CI check whose error names the fix.
3. Catch it with a test.
4. Write it down as a doc or agent rule. Nothing fails when an agent skips a rule, so this comes last.

Human review isn't on the list. A reviewer who must catch the same mistake on every PR is the problem this fixes. [`/correct`](../../skills/correct/SKILL.md) does the work:

```text
/correct agents keep calling the database client directly instead of going through the repository layer
```

It reads recent commits, reverts, review comments, and comments that explain workarounds, then groups the mistakes into classes. A class counts once it has happened twice. It fixes the most frequent classes one commit each, at the highest level that works, and proves each new check fails on a real past mistake. It also keeps a table in the agent instruction file that pairs each rule with what enforces it, so a rule that nothing enforces shows up as a repeat. The reply lists each class with its evidence, the level chosen, and why a higher level didn't work.

Run it with no argument and it finds the classes from history on its own. `/reflect` and `/correct` split the work. `/reflect` improves skills from one session. `/correct` changes the repo so a mistake class can't come back. Pair it with `/architect` when the fix is a new boundary. [Run a program with a standing coordinator](./07-overnight.md#run-a-program-with-a-standing-coordinator) has a prompt that does both across a whole repo.

## Author a focused skill

When you already know the workflow you want to capture:

```text
/poteto-mode write a skill for verifying database migrations in this repo
```

Writing a skill matches the [Authoring or modifying a skill playbook](../../skills/poteto-mode/playbooks/authoring-a-skill.md), which routes through `author-skill`, validates the frontmatter and links, and ships the result through the Opening a PR playbook. Agent-facing prose has a higher bar than human prose, because an unhelpful sentence becomes an instruction some future agent follows. Let the playbook hold that bar rather than writing a `SKILL.md` freehand.

Two special cases have their own generators. A skill that must drive your app and prove behavior is a verification skill, so use [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md) and [`/maintain-verification-skill`](../../skills/maintain-verification-skill/SKILL.md) instead. A skill that checks a property of your code with a model checker, a proof, or another verifier is a formal verification skill, so use [`/create-formal-verification-skill`](../../skills/create-formal-verification-skill/SKILL.md) and [`/maintain-formal-verification-skill`](../../skills/maintain-formal-verification-skill/SKILL.md). [Verify and ship](./06-verify-and-ship.md#prove-a-property-with-a-formal-verification-skill) covers both kinds.

## Capability names

Open a pstack skill and you will see names in backticks, such as `spawn-worker`, `wake-on-event`, or `use-forge`. They are capabilities, not commands. A step names what it needs from your environment and leaves the tool out, because the tool differs between Claude Code, Codex, Grok, and Orca. [`resolve-capability`](../../skills/resolve-capability/SKILL.md) says which tool does each one in each environment, and what to do when none can. The model reads it at the start of a task, and it asks whether Orca is here as its own question.

There are 21, in groups:

- **Agents and work.** `spawn-subagent` starts a helper inside your harness. `spawn-worker` starts a worker on another agent product and collects a report. `isolate-checkout` gives a writer its own worktree, ports, and temp paths. `run-remote` keeps a run alive while your computer sleeps. `coordinate-workers` holds dispatch, dependencies, an inbox, and decision gates. `control-agent` probes, messages, stops, or replaces an agent. `choose-model` picks a model and effort for a seat.
- **Waiting and time.** `wake-on-event` blocks on or is woken by a finished worker, a CI result, or a PR change. `run-on-schedule` is a recurring tick for a long program.
- **Talking to you.** `ask-user` is a question with options, only for a call you must make. `track-todos` is a visible plan with step status.
- **Code hosting.** `use-forge` creates, reviews, and merges pull requests. `read-review-bot` reads automated review threads and check runs.
- **Files, skills, and sessions.** `run-skill` runs another pstack skill. `author-skill` writes a new one. `find-sessions` finds this workspace's past and running sessions. `locate` says where instructions, skills, and worktrees live. `durable-store` is a place that outlives a restart.
- **Driving and inspecting.** `list-mcp-servers` shows which MCP servers the session has. `drive-app` drives a browser, a terminal program, or a window and captures evidence. `inspect-runtime` attaches to a live process for a profile or a heap snapshot.

Each capability has one of four states in a given environment. The harness does it with its own tool, it needs a product that may be missing (Orca, `gh`), you do it by hand with the shell, or the step is skipped and the reply says so in one line. Starting another vendor's agent is a good example. Any session with a shell can start Codex, Claude, or Grok without its interface. Orca adds supervision, an inbox, and a run that survives a restart.

When you write your own skill, name a capability and read `resolve-capability` instead of naming a tool. The list is closed. A new need goes into the adapter first, in a pull request to pstack, because the adapter ships with the skills. `select-model` records the facts about your computer and is the place for those, not a skill.

## Write docs to a standard with `/technical-writing`

Skills aren't the only prose you ship. For docs, RFCs, readmes, PR descriptions, and commit messages:

```text
/technical-writing review the readme changes
```

[`/technical-writing`](../../skills/technical-writing/SKILL.md) applies a layered standard. Its goal is prose that a tired engineer understands on the first read. It picks the document's mode first (tutorial, how-to, reference, or explanation), then works sentence by sentence: who does what, one thought per sentence, nothing readable two ways. Use it to review what you or an agent just wrote, or name it up front when you ask for a doc.

## Test a skill change blind

A skill edit affects every future session, so test it like the experiment it is. The same goes for adopting someone else's skill. Check that it makes the agent better on your work before you keep it.

```text
/poteto-mode run the eval playbook on this skill change. same task for both variants, candidates stay blind.
```

When a skill keeps missing and you know what it should do, change and test it in one task:

```text
/poteto-mode update the review skill so it flags missing migrations, and eval the change.
```

Asking for the eval up front keeps the edit honest. A fix written from one bad session tends to overfit that session, and over many edits the skill drifts. The eval catches the drift before it ships.

The [Eval playbook](../../skills/poteto-mode/playbooks/eval.md) is built around one failure mode, the observer effect. An agent that knows it's being evaluated behaves differently. So candidate agents get an organic-looking task in sanitized directories, never the words "eval" or "candidate", and never each other's existence. One judge scores all outputs under neutral labels, and chain-following gets graded from which files each candidate actually read, not from what it claims.

Read every output yourself before accepting the verdict. If you disagree with the judge, suspect the rubric before you suspect your judgment.

**Pitfall:** don't edit a skill mid-task because it's misbehaving. Fix it in its own PR and keep the task moving. A skill edit that ships tangled into feature work is invisible to review and impossible to evaluate.

Next: [Recipes and pitfalls](./10-recipes-and-pitfalls.md).
