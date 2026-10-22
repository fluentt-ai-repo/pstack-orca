#!/usr/bin/env node
// Fails when a Cursor-dependent line on the `upstream` branch has no row in CURSOR-DEPENDENCIES.md.
// A row covers a line when it names the same file and its excerpt appears in that line.
// Usage: node scripts/audit-cursor-deps.mjs [--ref upstream] [--list]

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const ref = args.includes('--ref') ? args[args.indexOf('--ref') + 1] : 'upstream'
const listOnly = args.includes('--list')

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()

export const PATTERNS = [
  /[Cc]ursor/,
  /\bTask\b/,
  /AskQuestion/,
  /\.mdc\b/,
  /agent-transcripts/,
  /\bgrok-|\bcomposer-|\bgpt-\d/,
  /claude-(opus|sonnet|haiku|fable)-\d/,
  /-fast\b/,
  /\benvironment\b.*\b(cloud|local)\b|cloud agent|cloud_base_branch/,
  /\breadonly\b|run_in_background|file_attachments|generalPurpose|subagent_type/,
  /\bresume\b/,
  /[Aa]utomation|\broutine|update_state|SendToUser/,
  /[Bb]ugbot/,
  /deslop|control-cli|control-ui|create-skill|team-kit/,
  /\/loop\b|\bcanvas\b|[Pp]lan mode/,
  /^(icon|color|disable-model-invocation):/,
]

// Code-only false positives: TypeScript's `readonly` keyword and GraphQL pagination cursors.
const CODE_FILE = /\.(ts|mjs|js|sh|json)$/
const CODE_NOISE = [/\breadonly\b/g, /\b\w+Cursor\b/g, /\bcursor is exhausted\b/g]

const PATHS = ['skills', 'agents', 'automations', 'docs', 'README.md', 'plugin.json', '.cursor-plugin']

// Files this fork deleted (see docs/removed-cursor-features.md). Their upstream lines need no row.
const REMOVED = [/^automations\//, /^skills\/make-bot-ui\//]

function upstreamHits() {
  const grepArgs = ['grep', '-n', '-I', '-E', '-e', '.', ref, '--', ...PATHS, ':!*.lock']
  const out = execFileSync('git', grepArgs, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })
  const hits = []
  for (const raw of out.split('\n')) {
    if (!raw) continue
    const m = raw.match(/^[^:]+:([^:]+):(\d+):(.*)$/)
    if (!m) continue
    const [, file, line, text] = m
    if (REMOVED.some((r) => r.test(file))) continue
    const scanned = CODE_FILE.test(file) ? CODE_NOISE.reduce((t, n) => t.replace(n, ''), text) : text
    if (PATTERNS.some((p) => p.test(scanned))) hits.push({ file, line: Number(line), text })
  }
  return hits
}

const normalize = (s) => s.replace(/\s+/g, ' ').trim()

function documentedRows() {
  const doc = readFileSync(join(root, 'CURSOR-DEPENDENCIES.md'), 'utf8')
  const rows = []
  for (const line of doc.split('\n')) {
    if (!/^\| CD-\d+/.test(line)) continue
    const cells = line.split(/(?<!\\)\|/).map((c) => c.trim())
    const loc = cells[2].replace(/`/g, '')
    const file = loc.replace(/:\d+(-\d+)?$/, '')
    const excerpt = normalize(cells[3].replace(/^``? ?| ?``?$/g, '').replace(/\\\|/g, '|'))
    rows.push({ id: cells[1], file, excerpt })
  }
  return rows
}

const hits = upstreamHits()
if (listOnly) {
  for (const h of hits) console.log(`${h.file}:${h.line}\t${h.text.trim().slice(0, 160)}`)
  process.exit(0)
}

const rows = documentedRows()
const uncovered = hits.filter((h) => {
  const text = normalize(h.text)
  return !rows.some((r) => r.file === h.file && r.excerpt && text.includes(r.excerpt))
})

if (uncovered.length) {
  console.error(`${uncovered.length} Cursor-dependent line(s) on ${ref} have no row in CURSOR-DEPENDENCIES.md:`)
  for (const h of uncovered) console.error(`  ${h.file}:${h.line}  ${h.text.trim().slice(0, 140)}`)
  process.exit(1)
}
console.log(`ok: ${hits.length} Cursor-dependent lines on ${ref}, all covered by ${rows.length} rows`)
