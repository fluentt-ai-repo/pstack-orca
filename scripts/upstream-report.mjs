#!/usr/bin/env node
// Prints a Markdown report of what changed on the `upstream` branch between two commits,
// for the issue the weekly sync opens. It does not merge anything.
// Usage: node scripts/upstream-report.mjs <old-commit> <new-commit>

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const [old, next] = process.argv.slice(2)
if (!old || !next) {
  console.error('usage: node scripts/upstream-report.mjs <old-commit> <new-commit>')
  process.exit(64)
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const root = git('rev-parse', '--show-toplevel')
const { paths } = JSON.parse(readFileSync(join(root, 'scripts/rewritten.json'), 'utf8'))
const rewritten = (file) => paths.some((p) => (p.endsWith('/') ? file.startsWith(p) : file === p))

const cursorSha = (rev) => /@ ([0-9a-f]{6,})/.exec(git('log', '-1', '--format=%s', rev))?.[1]
const from = cursorSha(old)
const to = cursorSha(next)

const rows = git('diff', '--name-status', old, next)
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [status, ...rest] = line.split('\t')
    return { status, file: rest.at(-1) }
  })

const kind = { A: 'added', M: 'changed', D: 'removed', R: 'renamed' }
const ported = rows.filter((r) => rewritten(r.file))
const other = rows.filter((r) => !rewritten(r.file))
const table = (list) => ['| Change | File |', '| --- | --- |', ...list.map((r) => `| ${kind[r.status[0]] ?? r.status} | \`${r.file}\` |`)].join('\n')

console.log(`Cursor changed pstack${from && to ? ` (\`${from}\` to \`${to}\`, [compare](https://github.com/cursor/plugins/compare/${from}...${to}))` : ''}. The \`upstream\` branch holds the new files. Nothing was merged into \`main\`.\n`)
console.log(`${rows.length} file(s) changed: ${ported.length} in paths this fork rewrote by hand, ${other.length} elsewhere.\n`)
if (ported.length) {
  console.log('## Rewritten here: port the meaning\n')
  console.log('Read the change on `upstream`, decide whether it still applies, and carry it into the rewritten file in capability names (see `MIRROR.md`).\n')
  console.log(table(ported) + '\n')
}
if (other.length) {
  console.log('## Not rewritten here: copy or port\n')
  console.log('A new or changed file here has not been through the capability rewrite. Decide whether to bring it in, and if so rewrite it before it lands.\n')
  console.log(table(other) + '\n')
}
console.log('Compare locally: `git diff ' + old.slice(0, 7) + ' ' + next.slice(0, 7) + '` on the `upstream` branch.')
