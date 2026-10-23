# Keeping up with upstream

This repo started as a mirror of Cursor's pstack and is now a fork whose skills, playbooks, and bundled scripts are rewritten by hand. It tracks two upstreams, and neither one is merged into `main` any more.

| Branch | Holds | Who updates it |
| --- | --- | --- |
| `upstream` | [`cursor/plugins/pstack`](https://github.com/cursor/plugins/tree/main/pstack), byte for byte | `scripts/sync-upstream.sh`, weekly in CI |
| `upstream-orca` | `orca/`: the skill guides and command schema shipped inside the `orca` binary | `scripts/sync-orca.sh`, on a machine with Orca installed |
| `main` | this fork | commits and reviewed pull requests |

Never copy Cursor's files or an Orca snapshot onto `main` directly. That erases the edits.

Four checks guard `main` (`.github/workflows/check.yml`):

- `node scripts/check-orca-commands.mjs` fails when a doc or skill on `main` names an `orca` command or flag that `orca/agent-context.json` does not have.
- `node scripts/lint-rewritten.mjs` fails when Cursor wording or a product name comes back into a rewritten skill or playbook.
- `node scripts/prune-cursor-deps.mjs --check` fails when `CURSOR-DEPENDENCIES.md` keeps a row for a rewritten path or its counts are stale.
- The bundled scripts' tests (`bun run test` in `skills/poteto-mode/scripts`).

`node scripts/audit-cursor-deps.mjs` is a tool and not a check. It lists the lines on `upstream` that depend on Cursor and have no row in [`CURSOR-DEPENDENCIES.md`](./CURSOR-DEPENDENCIES.md). Run it when you decide whether to bring an upstream file in.

## Cursor upstream

CI (`.github/workflows/sync-upstream.yml`) runs every Monday. When Cursor changed pstack, it commits the new files to `upstream`, pushes that branch, and opens an issue labeled `upstream`. The issue lists each changed file and says whether this fork rewrote it by hand. Nothing is merged. To run it by hand:

```bash
scripts/sync-upstream.sh                          # prints the new upstream commit, or nothing
git push origin upstream
node scripts/upstream-report.mjs <old> upstream   # the report the issue carries
```

To act on an issue:

1. A file under a path in `scripts/rewritten.json` was rewritten here. Read the change on `upstream` (`git diff <old> upstream -- <file>`), decide whether it still applies, and carry its meaning into the rewritten file in capability names. Do not merge the upstream file over it.
2. A file that was not rewritten is new or untouched here. Decide whether to bring it in. If you do, rewrite it in capability names first (the rules are in [`docs/decursor-progress.md`](./docs/decursor-progress.md)), add its path to `scripts/rewritten.json`, and run `node scripts/prune-cursor-deps.mjs`.
3. Close the issue with what you ported and what you left.

## Orca upstream

Orca's skills ship inside the app and update with it, so CI cannot snapshot them. After Orca updates (`orca --version` changed):

```bash
scripts/sync-orca.sh              # prints the new upstream-orca commit, or nothing
git switch main && git merge upstream-orca
node scripts/check-orca-commands.mjs
git diff HEAD~1 -- orca/skills    # read what changed in Orca's guides
git push origin main upstream-orca
```

If the check fails, Orca renamed or removed a command or flag. Fix every reference it lists. Then read the guide diff for new capabilities that cover a row in `CURSOR-DEPENDENCIES.md` marked `fallback-only` or `skip`, and upgrade that row.

To run this weekly without remembering, create an Orca automation from inside this repo's Orca worktree:

```bash
orca automations create --name pstack-orca-sync --trigger weekly --day 1 --time 09:00 \
  --provider claude --workspace current \
  --prompt "Follow the Orca upstream section of MIRROR.md. Push only if both checks pass; otherwise report what failed."
```
