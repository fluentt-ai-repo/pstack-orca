# A product pstack has no file for

Work read-only. Do not log in, install, or write that product's config.

1. Run `<command> --help`. Find how to start it with a prompt and no interaction, how to choose a model, and any command that lists models.
2. Find where it keeps its model list (a cache or config file under its home folder). Read it. Record each model and its efforts.
3. Show the user what you found and ask them to confirm the model ids and the non-interactive start command. Do not guess.
4. Start one read-only job with a trivial brief. Record the model it reports.
5. Write its section in `inventory.md`, and a short `references/<product>.md` that says what you learned and how. Start that file with `<!-- learned on this computer, not from pstack -->`.

If it cannot start without interaction, record it as `installed, not startable from here`.

## Skill folder

Do not guess a folder for a product with no file. Ask the user where it lists skills from. If they do not know, make no link.
