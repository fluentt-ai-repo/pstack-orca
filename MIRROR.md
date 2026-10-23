# Keeping this mirror current

This repo tracks two upstreams and adds Orca adaptations on top.

| Branch | Holds | Who updates it |
| --- | --- | --- |
| `upstream` | [`cursor/plugins/pstack`](https://github.com/cursor/plugins/tree/main/pstack), byte for byte | `scripts/sync-upstream.sh`, weekly in CI |
| `upstream-orca` | `orca/`: the skill guides and command schema shipped inside the `orca` binary | `scripts/sync-orca.sh`, on a machine with Orca installed |
| `main` | `upstream` + `upstream-orca` + this repo's Orca edits | merges only |

Never copy Cursor's files or an Orca snapshot onto `main` directly. That erases the edits. Always merge, and merge with a merge commit, never a squash, so both upstream branches stay ancestors of `main`.

Four checks guard `main` (`.github/workflows/check.yml`):

- `node scripts/audit-cursor-deps.mjs` greps the `upstream` branch for Cursor-dependent lines and fails on any line that has no row in [`CURSOR-DEPENDENCIES.md`](./CURSOR-DEPENDENCIES.md). A row covers a line when it names the same file and its excerpt appears in that line. `--list` prints every hit.
- `node scripts/check-orca-commands.mjs` fails when a doc or skill on `main` names an `orca` command or flag that `orca/agent-context.json` does not have.
- `node scripts/lint-rewritten.mjs` fails when Cursor wording or a product name comes back into a rewritten skill or playbook.
- `node scripts/prune-cursor-deps.mjs --check` fails when `CURSOR-DEPENDENCIES.md` keeps a row for a rewritten path or its counts are stale.

## Cursor upstream

CI (`.github/workflows/sync-upstream.yml`) runs every Monday. When Cursor changed pstack, it commits the new files to `upstream` and opens a PR from `upstream` into `main`. To run it by hand:

```bash
scripts/sync-upstream.sh          # prints the new upstream commit, or nothing
git push origin upstream
```

To land the PR:

1. If `check` fails on the audit, Cursor added a new dependency. Add a row to `CURSOR-DEPENDENCIES.md` with its Orca handling, apply that handling, and push to `main`. The PR's check reruns against the new `main`.
2. If the merge conflicts, Cursor changed a line this mirror also changed. Merge locally (`git switch main && git merge upstream`), keep Cursor's new meaning, and reapply the Orca wording.
3. Update stale `file:line` locations in `CURSOR-DEPENDENCIES.md`. The audit matches by file and excerpt, so line drift does not fail it, but readers use the numbers.
4. A skill that was rewritten by hand and is listed in `scripts/rewritten.json` takes the port, not the merge. Read what Cursor changed, and carry the meaning into the rewritten skill in capability names. Run `node scripts/prune-cursor-deps.mjs` after you add a rewritten path.

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
