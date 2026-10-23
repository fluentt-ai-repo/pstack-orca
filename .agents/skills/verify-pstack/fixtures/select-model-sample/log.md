# Log

- 2026-10-23: created by /setup-pstack with pstack 0.15.29. User approved the preferences.
- 2026-10-23: proof run, one read-only job per product. claude: `Agent` tool, `Explore`, `model: opus`, `effort: low`, answered `claude-opus-5-5`, effort reported as "5" (unlisted value). codex: Orca worker `gpt-6-luna` at `low`, `launch.effective` matched. grok: Orca worker with `--agent grok` only; session record says `grok-4.7`, `reasoning_effort: medium`, while `~/.grok/config.toml` says `default_reasoning_effort = "high"` and the preference names `grok-4.7-build-fast`. All three started; no entry dropped. `references/grok.md` says Grok runs at `default_reasoning_effort`; the record disagrees. Left as shipped (references/ is overwritten on update); the observed value is in `inventory.md`.
