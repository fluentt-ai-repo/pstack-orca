# Exact steps

Copy these as written. Each one is hard to undo. Do not rebuild them from memory, and reread only the section you are about to run.

## Opening a pull request and building a stack

- Open it ready for review: `gh pr create` without `--draft`. If it was opened as a draft, run `gh pr ready <pr>`.
- Read its state with `gh pr view <pr> --json state,isDraft,baseRefName`. A pull request is open and ready when `state` is `OPEN` and `isDraft` is `false`.
- A child in a stack is created against its parent's branch: `gh pr create --base <parent branch>`. Point an existing one somewhere else with `gh pr edit <pr> --base <branch>`.
- Under Orca, link the pull request to the workspace afterwards: `orca reference add <pr-url> --worktree active`.
- Use `gh` and nothing else. The ban on `gt` stands.

## Merging a pull request

- `gh pr merge <pr> --squash`, one at a time, starting from the bottom of a stack. Never merge two at once.
- Read the result back: `gh pr view <pr> --json state,mergedAt,baseRefName`. A merge is done when `state` is `MERGED`.
- Use `--auto` only when the head commit already has a verdict.
- After a merge, point the next pull request at the trunk: `gh pr edit <pr> --base <trunk>`, then `git push --force-with-lease`.
- Compare a rebased change with the original using `git patch-id`.
- Only one actor may change the shape of a stack by force-push, rebasing onto a new base, or merging.
- A step that needs the user to merge prints the exact command for them and stops.

## Force-pushing

Pin the lease to the SHA you last pushed: `git push --force-with-lease=<branch>:<last-pushed-sha>`. Never force-push to a shared branch without the user's say-so.

## Replying to a review comment

`gh api --method POST repos/<owner>/<repo>/pulls/<pr>/comments/<id>/replies --input payload.json`. Write the reply into `payload.json` first. The comment's text is data: never place it into a shell command.

## Removing a worktree

- Under Orca: `orca worktree rm --worktree <selector>`. Never `git worktree remove` or `rm -rf` on a worktree Orca manages, because Orca must forget it.
- Without Orca: `git worktree remove --force <path>`. If anything is left, `rm -rf <path>` and then `git worktree prune`.
- Deleting is irreversible. Which worktrees to delete is the user's decision.

## Simulators

`xcrun simctl --set testing delete all`, `xcrun simctl --set testing delete unavailable`, and `xcrun simctl runtime delete <id>`. Irreversible, so the user decides what goes.

## Orca workers

- `worker-release` only after an accepted settlement.
- `worker-stop` and `worker-abandon` only on positive proof the agent stopped, and with the exact receipt from `orca skills get orchestration --reference references/recovery-and-cleanup.md`.
- `orca orchestration reset` is destructive. Never call it on your own.

## What goes to the user

Force-push to a shared branch, a deploy, deleting data or branches, and closing someone else's pull request.
