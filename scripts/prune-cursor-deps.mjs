#!/usr/bin/env node
// Drops the rows of CURSOR-DEPENDENCIES.md whose location lies under a path in scripts/rewritten.json,
// then recounts every section and the two summary tables.
// Usage: node scripts/prune-cursor-deps.mjs [--check]

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const list = JSON.parse(readFileSync(join(root, 'scripts/rewritten.json'), 'utf8'))
const paths = [...list.paths, ...(list.removed ?? [])]
const file = join(root, 'CURSOR-DEPENDENCIES.md')
const lines = readFileSync(file, 'utf8').split('\n')

const rowCells = (line) => line.trim().replace(/^\|\s*/, '').replace(/\s*\|$/, '').split(' | ')
const isRow = (line) => line.startsWith('| CD-')
const location = (line) => rowCells(line)[1].replace(/`/g, '').replace(/:\d+$/, '')
const covered = (loc) => paths.some((p) => (p.endsWith('/') ? loc.startsWith(p) : loc === p))

const kept = lines.filter((l) => !isRow(l) || !covered(location(l)))
const removed = lines.length - kept.length

// per-section counts: the "N rows." line under a "## " heading
let section = -1
const starts = []
kept.forEach((l, i) => { if (l.startsWith('## ')) { starts.push(i) } })
const out = [...kept]
starts.forEach((s, k) => {
  const end = k + 1 < starts.length ? starts[k + 1] : out.length
  const n = out.slice(s, end).filter(isRow).length
  for (let i = s + 1; i < end; i++) {
    if (/^\d+ rows\.$/.test(out[i])) { out[i] = `${n} rows.`; break }
  }
})

const rows = out.filter(isRow).map(rowCells)
const count = (idx) => {
  const m = new Map()
  for (const c of rows) m.set(c[idx].replace(/`/g, ''), (m.get(c[idx].replace(/`/g, '')) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}
const rewriteTable = (header, entries) => {
  const i = out.findIndex((l) => l === header)
  if (i < 0) return
  let j = i + 2
  while (j < out.length && out[j].startsWith('| `')) j++
  out.splice(i + 2, j - (i + 2), ...entries.map(([k, n]) => `| \`${k}\` | ${n} |`))
}
rewriteTable('| Handling | Rows |', count(5))
rewriteTable('| Category | Rows |', count(3))
const total = out.findIndex((l) => /^\d+ rows\. Locations refer/.test(l))
if (total >= 0) out[total] = out[total].replace(/^\d+ rows\./, `${rows.length} rows.`)

if (process.argv.includes('--check')) {
  const same = out.join('\n') === lines.join('\n')
  console.log(same ? 'ok: CURSOR-DEPENDENCIES.md is pruned and counted' : `stale: ${removed} row(s) to drop or counts to refresh. Run node scripts/prune-cursor-deps.mjs`)
  process.exit(same ? 0 : 1)
}
writeFileSync(file, out.join('\n'))
console.log(`dropped ${removed} row(s); ${rows.length} remain`)
