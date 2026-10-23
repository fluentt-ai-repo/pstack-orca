# Set up pstack

In this page you install pstack, set up model selection, and run your first task. Setup is one command plus a short conversation.

## Where pstack runs

pstack runs wherever Claude Code, Codex, or Grok runs. You can use it in a terminal, in [Orca](https://github.com/stablyai/orca), in the Claude desktop app's Code tab, or in the ChatGPT desktop app's Codex. Orca is not required. It adds workers that report back to you, runs that survive a restart, schedules, and remote environments. Without it, a session can still start another vendor's agent from the shell.

This fork was checked in terminals and in Orca. How the skills behave inside the two desktop apps was not checked.

## Install the skills

Run this once, from any folder:

```bash
npx skills add ynginkim/pstack-orca -g -a claude-code -a codex -a grok -s '*' -y
```

It installs every pstack skill globally for the three products. The real copies sit in `~/.agents/skills/`, and Claude Code and Grok see them through links.

Type a skill as `/name` in Claude Code and `$name` in Codex. This guide writes `/name`. Grok reads the same skills. How to call one by name in Grok was not checked, so describe the task and name the skill in your prompt.

Pages in this guide name skills, not tools. When a step needs something from your environment, such as starting a worker or asking you a question, the skill names a capability in backticks, such as `spawn-worker`. [`resolve-capability`](../../skills/resolve-capability/SKILL.md) says which tool does it in each environment. [Make it yours](./09-make-it-yours.md#capability-names) says more.

## Pick your models

Run this in your project:

```text
/setup-pstack
```

[`/setup-pstack`](../../skills/setup-pstack/SKILL.md) surveys this computer for the agent products and models it can run. It asks five questions: the budget, the model for each kind of work, what to avoid, how readily to use several models at once, and, when Orca is here, whether another vendor's agent may run as an Orca worker. Last it asks whether to link `select-model` into the skill folders of products that list skills from their own folder. Then it writes the `select-model` skill under `~/.agents/skills/select-model/` and starts one read-only job per agent product to prove each one runs. Answer the questions. Every pstack skill reads `select-model` at the start of a task and decides from it which model to use and how.

The budget sets the starting reasoning effort. `large` is `xhigh`, the default. `unlimited` lifts each model to its highest tier, up to `max`. Opus goes to `max`. Grok tops out at `xhigh`, so it stays there. `medium` and `small` lower the reasoning and spend fewer tokens.

Your answers become sentences under `## Preferences` in `~/.agents/skills/select-model/SKILL.md`, each with its reason. To change one, edit the sentence, or run `/setup-pstack` again, which keeps your sentences unless you change them. Without `select-model`, skills run on their defaults and say so once.

To keep every helper on the model your chat already runs, say so in your answers. pstack then leaves the helper's model unset, so it inherits the chat's model. Each skill sets its own panel size in its seat table, and your answer about using several models at once decides how readily `/swarm`, `/arena`, `/interrogate`, and `/reflect` start.

A product that is installed but not reachable from your session is recorded as such. Another vendor's agent starts from the shell, with or without Orca. It is skipped only when the product is missing or not logged in.

## Accept the verification offers, or don't

At the end of setup, `/setup-pstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `.agents/skills/verify-<app>/`, with a link from `.claude/skills/` for Claude Code. It is a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `/create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers it in depth.

If you're new to pstack, say yes. An agent that can check its own work keeps going until the check passes. An agent that can't hands every result back to you to check by hand. Of everything in this guide, the verification skill pays off the most.

Then setup offers once to generate a formal verification skill with [`/create-formal-verification-skill`](../../skills/create-formal-verification-skill/SKILL.md), unless the project already has one. Tests check the cases someone thought to write. A formal verification skill checks one key property of your code, such as "a job never runs twice at once", in every case within a stated scope. Say yes when your code has concurrency, retries, a state machine, or a parser, where a bug is costly and tests rarely reach the case that breaks. Otherwise say no, and run it later if that changes. [Verify and ship](./06-verify-and-ship.md#prove-a-property-with-a-formal-verification-skill) covers it.

After setup, the next task reads `select-model` on its own.

## Keep the cost in check

pstack spends extra tokens on subagents and review panels. That's the price of the rigor. To spend fewer:

- Rerun `/setup-pstack` and pick a smaller reasoning budget or cheaper models. A strong model in the main chat with cheaper, faster models for the code work is a good split.
- Say you want to follow the chat's own model, so subagents run on it.
- Say you want fewer models used at once, so the review panels run smaller.
- Save `/poteto-mode` for work that needs rigor. A small, obvious edit doesn't.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt. If `/poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. The earlier turns hold the playbook, so a short message continues the work. How long each product keeps a skill in context was not checked. When a long chat drifts, type `/poteto-mode` again with your next message.

Next: [Route work through `/poteto-mode`](./02-poteto-mode.md).
