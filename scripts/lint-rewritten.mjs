#!/usr/bin/env node
// Fails when a skill listed in scripts/rewritten.json contains Cursor wording again.
// Usage: node scripts/lint-rewritten.mjs

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const { paths } = JSON.parse(readFileSync(join(root, 'scripts/rewritten.json'), 'utf8'))

// The generator's references describe Orca's catalog, which lists a `cursor` agent product and full Claude model ids.
const CATALOG = ['skills/create-model-selection-skill/references/']

// The adapter names Claude Code's own `Agent` tool fields (`subagent_type`, `run_in_background`) and Orca's `cursor` agent id.
const ADAPTER = ['skills/resolve-capability/']
const ADAPTER_REFERENCES = ['skills/resolve-capability/references/']

const BANNED = [
  [/\bcursor/i, 'the word Cursor', [...CATALOG, ...ADAPTER_REFERENCES]],
  [/\.mdc\b/, '.mdc rule file'],
  [/\bAskQuestion\b/, 'AskQuestion'],
  [/`Task`|\bTask (tool|subagent|call)\b/, 'the Task tool'],
  [/agent-transcripts|cursor-team-kit|[Bb]ugbot/, 'a Cursor-only service'],
  [/environment: "cloud"|\bcloud agent/i, 'Cursor cloud agents'],
  [/\bsubagent_type\b|\bgeneralPurpose\b|\brun_in_background\b|\bcloud_base_branch\b|\breadonly: (true|false)/, 'a Cursor Task field', ADAPTER],
  [/\bcreate-skill\b|todolist/, 'a Cursor-only skill or tool name'],
  [/\bgrok-[\d.]+-(max|xhigh|high|medium|low)\b|\bclaude-(opus|sonnet|haiku|fable)-\d/, 'a Cursor model slug', CATALOG],
  [/pstack-models|role lines?\b/, 'the retired role table'],
]

// The seven cross-model skills name capabilities (skills/resolve-capability) and no harness, tool, or command.
// The adapter, the generator, poteto-mode, and setup-pstack are outside this list because they have to name products.
const CAPABILITY_ONLY = ['skills/arena/', 'skills/swarm/', 'skills/interrogate/', 'skills/reflect/', 'skills/architect/', 'skills/how/', 'skills/why/']

const NO_PRODUCT = [
  [/\b(spawn_agent|spawn_subagent|AskUserQuestion|TodoWrite|update_plan|run_in_background|subagent_type|skill-creator|SendMessage|TaskStop|CronCreate|ScheduleWakeup|worker-(start|show|read|stop|release))\b/, 'a harness tool or Orca command'],
  [/\borca\b/i, 'Orca'],
  [/\bClaude\b|\bCodex\b|\bGrok\b/i, 'an agent product'],
  [/`(Agent|Explore|Plan)`|\bAgent tool\b/, 'a harness tool'],
  [/`gh( [^`]*)?`|\bgh (pr|api|issue|run)\b/, 'a gh command'],
  [/\.(claude|grok)\/|\bCLAUDE\.md\b|\bAGENTS\.md\b|\$CLAUDE_CONFIG_DIR|\$CODEX_HOME|~\/\.(claude|codex|grok)\b/, 'a product path'],
]

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* files(p)
    else if (/\.(md|mjs|js|sh|json|ya?ml|toml)$/.test(name)) yield p
  }
}

// A rewritten skill may keep a block of old wording between these markers while the skills it routes to are still being rewritten.
const TRANSITION = /<!-- transition:start -->[\s\S]*?<!-- transition:end -->/g

const hits = []
for (const rel of paths) {
  const target = join(root, rel)
  const list = statSync(target).isDirectory() ? [...files(target)] : [target]
  for (const file of list) {
    readFileSync(file, 'utf8')
      .replace(TRANSITION, (block) => block.replace(/[^\n]/g, ''))
      .split('\n')
      .forEach((text, i) => {
        const capabilityOnly = CAPABILITY_ONLY.some((x) => file.startsWith(join(root, x)))
        if (capabilityOnly) for (const [re, why] of NO_PRODUCT) if (re.test(text)) hits.push(`${file.slice(root.length + 1)}:${i + 1}  ${why} (name a capability instead): ${text.trim().slice(0, 100)}`)
        for (const [re, why, exempt = []] of BANNED) if (re.test(text) && !exempt.some((x) => file.startsWith(join(root, x)))) hits.push(`${file.slice(root.length + 1)}:${i + 1}  ${why}: ${text.trim().slice(0, 100)}`)
      })
  }
}

if (hits.length) {
  console.error(`Cursor wording in rewritten skills (${hits.length}):`)
  for (const h of hits) console.error(`  ${h}`)
  process.exit(1)
}
console.log(`ok: ${paths.length} rewritten path(s) free of Cursor wording`)
