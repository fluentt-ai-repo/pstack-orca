#!/usr/bin/env node
// Fails when a skill listed in scripts/rewritten.json contains Cursor wording again.
// Usage: node scripts/lint-rewritten.mjs

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const { paths } = JSON.parse(readFileSync(join(root, 'scripts/rewritten.json'), 'utf8'))

const BANNED = [
  [/cursor/i, 'the word Cursor'],
  [/\.mdc\b/, '.mdc rule file'],
  [/\bAskQuestion\b/, 'AskQuestion'],
  [/`Task`|\bTask (tool|subagent|call)\b/, 'the Task tool'],
  [/agent-transcripts|cursor-team-kit|[Bb]ugbot/, 'a Cursor-only service'],
  [/environment: "cloud"|\bcloud agent/i, 'Cursor cloud agents'],
  [/\bgrok-[\d.]+-(max|xhigh|high|medium|low)\b|\bclaude-(opus|sonnet|haiku|fable)-\d/, 'a Cursor model slug'],
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
        for (const [re, why] of BANNED) if (re.test(text)) hits.push(`${file.slice(root.length + 1)}:${i + 1}  ${why}: ${text.trim().slice(0, 100)}`)
      })
  }
}

if (hits.length) {
  console.error(`Cursor wording in rewritten skills (${hits.length}):`)
  for (const h of hits) console.error(`  ${h}`)
  process.exit(1)
}
console.log(`ok: ${paths.length} rewritten path(s) free of Cursor wording`)
