#!/usr/bin/env node
// Fails when this repo's own docs or skills name an `orca` command or flag that the
// snapshotted Orca schema (orca/agent-context.json) does not have.
// Usage: node scripts/check-orca-commands.mjs

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const schema = JSON.parse(readFileSync(join(root, 'orca/agent-context.json'), 'utf8'))

const commands = new Map()
for (const c of schema.commands) {
  for (const name of [c.command, ...(c.aliases ?? [])]) commands.set([name].flat().join(' '), new Set(c.flags))
}

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '*.md', '*.sh', '*.mjs', '*.ts'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !f.startsWith('orca/') && f !== 'scripts/check-orca-commands.mjs')

// ORCA is the placeholder Orca's own guides use for the resolved executable.
const INVOCATION = /\b(?:orca|ORCA)((?: [a-z][a-z-]*)+)((?: [^`\n|]*)?)/g

const problems = []
let checked = 0
for (const file of files) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n')
  lines.forEach((line, i) => {
    for (const m of line.matchAll(INVOCATION)) {
      const words = m[1].trim().split(' ')
      let name = null
      for (let n = words.length; n > 0; n--) {
        const candidate = words.slice(0, n).join(' ')
        if (commands.has(candidate)) {
          name = candidate
          break
        }
      }
      if (!name) {
        const isGroup = [...commands.keys()].some((k) => k.startsWith(`${words[0]} `))
        if (isGroup && words.length > 1) {
          problems.push(`${file}:${i + 1}  unknown command "orca ${m[1].trim()}"`)
        }
        continue
      }
      checked++
      const flags = commands.get(name)
      // Flags inside a quoted argument, such as --command "<cmd> --flag", belong to the inner command.
      const rest = (m[1].trim().slice(name.length) + m[2]).replace(/"[^"]*"|'[^']*'/g, '')
      for (const f of rest.matchAll(/--([a-z][a-z-]*)/g)) {
        if (!flags.has(f[1])) problems.push(`${file}:${i + 1}  "orca ${name}" has no --${f[1]}`)
      }
    }
  })
}

if (problems.length) {
  console.error(`${problems.length} orca reference(s) do not match orca ${readFileSync(join(root, 'orca/VERSION'), 'utf8').trim()}:`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log(`ok: ${checked} orca invocation(s) match the snapshotted schema`)
