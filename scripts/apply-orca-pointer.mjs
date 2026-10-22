#!/usr/bin/env node
// Puts one line after the frontmatter of every skill that CURSOR-DEPENDENCIES.md says needs Orca handling,
// pointing the agent at skills/orca-harness. Idempotent: rerun after every upstream sync.
// Usage: node scripts/apply-orca-pointer.mjs [--check]

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const check = process.argv.includes('--check')

// Orca terminals export only ORCA_CLI_BIN_DIR; Orca chat sessions export it and ORCA_CLI_COMMAND. Gate on either.
export const POINTER =
  '> **In Orca** (`ORCA_CLI_BIN_DIR` or `ORCA_CLI_COMMAND` is set): read `../orca-harness/SKILL.md` before this skill and map its Cursor names through it.'

// Any earlier wording of the pointer. Replaced in place so a rerun never adds a second line.
const ANY_POINTER = /^> \*\*In Orca\*\* \(.*\): read `\.\.\/orca-harness\/SKILL\.md`.*$/m

const NEEDS_POINTER = new Set(['orca', 'agent-native', 'fallback-only', 'skip'])

// Skills rewritten by hand carry no Cursor names, so they need no pointer (scripts/rewritten.json).
const rewritten = JSON.parse(readFileSync(join(root, 'scripts/rewritten.json'), 'utf8')).paths

const skills = new Set()
for (const line of readFileSync(join(root, 'CURSOR-DEPENDENCIES.md'), 'utf8').split('\n')) {
  if (!/^\| CD-\d+/.test(line)) continue
  const cells = line.split(/(?<!\\)\|/).map((c) => c.trim())
  const file = cells[2].replace(/`/g, '').replace(/:\d+$/, '')
  const [category, handling] = [cells[4], cells[6]]
  const m = file.match(/^skills\/([^/]+)\//)
  if (m && NEEDS_POINTER.has(handling) && category !== 'frontmatter' && !rewritten.some((p) => file.startsWith(p))) skills.add(m[1])
}

const stale = []
for (const name of [...skills].sort()) {
  if (rewritten.some((p) => `skills/${name}/SKILL.md`.startsWith(p))) continue
  const path = join(root, 'skills', name, 'SKILL.md')
  const text = readFileSync(path, 'utf8')
  if (text.includes(POINTER)) continue
  stale.push(name)
  if (check) continue
  if (ANY_POINTER.test(text)) {
    writeFileSync(path, text.replace(ANY_POINTER, POINTER))
    continue
  }
  const end = text.indexOf('\n---\n', 4)
  if (!text.startsWith('---\n') || end < 0) throw new Error(`${path}: no frontmatter`)
  const at = end + '\n---\n'.length
  writeFileSync(path, `${text.slice(0, at)}\n${POINTER}\n${text.slice(at)}`)
}

if (check && stale.length) {
  console.error(`missing the Orca pointer: ${stale.join(', ')}. Run node scripts/apply-orca-pointer.mjs`)
  process.exit(1)
}
console.log(`${check ? 'ok' : 'applied'}: ${skills.size} skill(s) point at orca-harness${stale.length && !check ? ` (${stale.length} updated)` : ''}`)
