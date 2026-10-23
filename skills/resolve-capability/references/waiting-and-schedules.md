# Waiting and schedules

## `wake-on-event`

- **Orca workers.** `orca orchestration check --wait --types worker_done,escalation,question --timeout-ms <n>`. Claude Code can wait once with a long timeout. Codex waits in chunks of about 45 seconds and continues the same exec session, repeating until the event arrives.
- **A process that ends.** `orca terminal wait --terminal <handle> --for exit --timeout-ms <n>`, or `--for tui-idle` for an agent screen. Always pass a timeout. Start the watcher with `orca terminal create --title <name> --command "<command>"`.
- **Claude Code without Orca.** Run the command with `run_in_background`. The session wakes when it ends.
- **An idle Orca chat** is woken by an orchestration message.
- **A PR.** `../poteto-mode/scripts/watch-pr/watch-pr` polls until it has a verdict. Wait on that process with the mechanisms above, and start it again after each push.
- **None of these.** A bounded shell loop, or stop and say what to re-run.

Foreground `sleep` commands past about 45 seconds are refused in some harnesses. Use a wait command, not a long sleep.

## `run-on-schedule`

- **Orca.** `orca automations create --name <program> --trigger "<cron or hourly>" --workspace active --reuse-session --provider <agent> --prompt "<tick prompt>"`. Remove it with `orca automations remove` when the program ends. Orca triggers on a schedule only. For an event trigger, poll with `--precheck <command>` that exits 0 only when new input exists, and hand the input to the run in a state file.
- **Every tick is a new agent with no memory of the last.** The tick prompt carries everything: where the decision trail is (`durable-store`), the playbook to reread, and the stop condition. Do not rely on the earlier session's context.
- **Claude Code without Orca.** `/loop`, `CronCreate`, or `ScheduleWakeup` (unverified).
- **Neither.** Skip the tick and tell the user to re-run by hand.
