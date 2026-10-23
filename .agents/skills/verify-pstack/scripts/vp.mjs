#!/usr/bin/env node
// Helper for the verify-pstack skill: drive real agent sessions in the pstack testbed and read what they did.
// Usage: vp.mjs help

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HOME = os.homedir()
const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = path.resolve(SKILL_DIR, '../../..')
const TESTBED = process.env.VP_TESTBED || path.join(HOME, 'Documents/pstack-testbed')
const EVIDENCE = process.env.VP_EVIDENCE || path.join(HOME, 'Documents/pstack-testbed-evidence')
const SELECT_MODEL = path.join(HOME, '.agents/skills/select-model')
const LOCK = path.join(HOME, '.agents/verify-pstack-select-model.lock')
const STASH = path.join(HOME, '.agents/verify-pstack-stash')
const SAMPLE_MARK = '.verify-pstack-sample'
const FIXTURE = path.join(SKILL_DIR, 'fixtures/select-model-sample')
const NOBIN = '/tmp/vp-nobin'
// `npx skills add -g` puts real copies here and links them from ~/.claude/skills and ~/.grok/skills.
const GLOBAL_SKILLS = path.join(HOME, '.agents/skills')
const GLOBAL_LINK_DIRS = [GLOBAL_SKILLS, path.join(HOME, '.claude/skills'), path.join(HOME, '.grok/skills')]
// Kept, not deleted, because the skills CLI records it as the install source.
const HEAD_EXPORT = path.join(HOME, '.cache/verify-pstack/head-export')
const ORCA = process.env.ORCA_CLI_COMMAND || 'orca'
const ORCA_DATA = process.env.ORCA_USER_DATA_PATH || path.join(HOME, 'Library/Application Support/orca')
const STALE_LOCK_MS = 2 * 3600 * 1000
const WORKER_PREAMBLE = 'You are working inside Orca, a multi-agent IDE. You are a dispatched worker.'
// Same models as the earlier recorded runs, at the lowest effort each offers. Orca refuses both flags for Grok.
const DEFAULTS = { claude: { model: 'sonnet', effort: 'low' }, codex: { model: 'gpt-6.1-sol', effort: 'low' }, grok: {} }

const die = (msg, code = 1) => {
  console.error(`vp: ${msg}`)
  process.exit(code)
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
const exists = (p) => fs.existsSync(p)
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const writeJson = (p, d) => fs.writeFileSync(p, `${JSON.stringify(d, null, 2)}\n`)
const iso = (ms = Date.now()) => new Date(ms).toISOString()
const oneLine = (s, width) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, width)

function parseArgs(argv, booleans = []) {
  const pos = []
  const opt = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) pos.push(a)
    else if (booleans.includes(a.slice(2))) opt[a.slice(2)] = true
    else if (i + 1 < argv.length) opt[a.slice(2)] = argv[++i]
    else die(`${a} needs a value`)
  }
  return { pos, opt }
}

function sh(cmd, args, { cwd, timeout, input } = {}) {
  const r = spawnSync(cmd, args, { cwd, input, encoding: 'utf8', maxBuffer: 1 << 28, timeout })
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || (r.error ? String(r.error) : '') }
}

function orca(args, { timeout = 120000 } = {}) {
  const r = sh(ORCA, [...args, '--json'], { timeout })
  let data = null
  try {
    data = JSON.parse(r.stdout)
  } catch {}
  return { ok: r.status === 0 && data !== null && data.ok !== false, result: data?.result ?? data, data, raw: r }
}

// An Orca chat sets ORCA_AGENT_SESSION_ID. An Orca terminal does not, but sets ORCA_TAB_ID, which lasts as long as its tab.
// ORCA_TERMINAL_HANDLE changes when Orca restarts, so it is only the way to reach the owner, not the owner's name.
function identity() {
  const env = process.env
  if (env.VP_OWNER) return { id: env.VP_OWNER, from: 'VP_OWNER' }
  if (env.ORCA_AGENT_SESSION_ID) return { id: env.ORCA_AGENT_SESSION_ID, from: 'ORCA_AGENT_SESSION_ID' }
  if (env.ORCA_TAB_ID) return { id: `orca-tab:${env.ORCA_TAB_ID}`, from: 'ORCA_TAB_ID' }
  if (env.CLAUDE_CODE_SESSION_ID) return { id: `claude-session:${env.CLAUDE_CODE_SESSION_ID}`, from: 'CLAUDE_CODE_SESSION_ID' }
  return null
}

function contact() {
  if (process.env.ORCA_AGENT_SESSION_ID) return `orca orchestration send --to orca_session_id:${process.env.ORCA_AGENT_SESSION_ID}`
  if (process.env.ORCA_TERMINAL_HANDLE) return `orca terminal send --terminal ${process.env.ORCA_TERMINAL_HANDLE}`
  return null
}

function owner() {
  const i = identity()
  if (!i) die('no stable name for this session. Set VP_OWNER (Orca sets ORCA_AGENT_SESSION_ID in chats and ORCA_TAB_ID in terminals)')
  return i.id
}

function whoami() {
  const i = identity()
  console.log(i ? `owner: ${i.id} (from ${i.from})` : 'owner: none. Set VP_OWNER')
  console.log(`contact: ${contact() ?? 'none'}`)
}

// ---------- files and trees ----------

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, base, out)
    else out.push(path.relative(base, p))
  }
  return out
}

const fileHash = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 12)

// The files of skills/<name> that git tracks or would track, so ignored build output such as node_modules stays out.
function skillFiles(name) {
  const prefix = `skills/${name}/`
  return sh('git', ['-C', REPO, 'ls-files', '--cached', '--others', '--exclude-standard', '--', prefix])
    .stdout.split('\n')
    .filter((f) => f && exists(path.join(REPO, f)))
    .map((f) => f.slice(prefix.length))
}

function compareTrees(src, dst, srcFiles = walk(src)) {
  if (!exists(dst)) return { missing: true, changed: [], added: srcFiles, removed: [] }
  const a = new Set(srcFiles)
  const b = new Set(walk(dst))
  const changed = [...a].filter((f) => b.has(f) && fileHash(path.join(src, f)) !== fileHash(path.join(dst, f)))
  return { missing: false, changed, added: [...a].filter((f) => !b.has(f)), removed: [...b].filter((f) => !a.has(f)) }
}

function copySample(from, to) {
  const src = from || FIXTURE
  if (!exists(path.join(src, 'SKILL.md')) && !exists(path.join(src, 'SKILL.sample.md'))) die(`${src} has no SKILL.md`)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.cpSync(src, to, { recursive: true, verbatimSymlinks: true })
  if (exists(path.join(to, 'SKILL.sample.md'))) fs.renameSync(path.join(to, 'SKILL.sample.md'), path.join(to, 'SKILL.md'))
  writeJson(path.join(to, SAMPLE_MARK), { owner: owner(), placed_at: iso(), from: src })
}

// ---------- select-model state and lock ----------

function smState() {
  let st
  try {
    st = fs.lstatSync(SELECT_MODEL)
  } catch {
    return { kind: 'absent' }
  }
  if (st.isSymbolicLink()) return { kind: 'real', note: `symlink to ${fs.readlinkSync(SELECT_MODEL)}` }
  if (!st.isDirectory()) return { kind: 'real', note: 'not a directory' }
  const mark = path.join(SELECT_MODEL, SAMPLE_MARK)
  const skill = path.join(SELECT_MODEL, 'SKILL.md')
  const hash = exists(skill) ? fileHash(skill) : null
  if (exists(mark)) return { kind: 'sample', hash, ...readJson(mark) }
  return { kind: 'real', hash }
}

const readLock = () => (exists(LOCK) ? readJson(LOCK) : null)

function describeLock(l) {
  if (!l) return 'free'
  const age = Math.round((Date.now() - Date.parse(l.created_at)) / 60000)
  const stale = Date.now() - Date.parse(l.created_at) > STALE_LOCK_MS ? ' STALE: ask the user before `vp sm break`' : ''
  return `held by ${l.owner}${l.contact ? ` (reach it with: ${l.contact})` : ''} for "${l.purpose}", ${age} min old${l.placed ? ', sample placed' : ''}${l.stash ? `, real skill stashed at ${l.stash.path}` : ''}${stale}`
}

function myLock() {
  const l = readLock()
  if (!l) die('you do not hold the select-model lock. Run `vp sm lock "<purpose>"` first')
  if (l.owner !== owner()) die(`select-model lock ${describeLock(l)}`)
  return l
}

function sm(args) {
  const { pos, opt } = parseArgs(args)
  const cmd = pos[0] || 'status'
  if (cmd === 'status') {
    const s = smState()
    console.log(`select-model: ${s.kind}${s.hash ? ` (SKILL.md ${s.hash})` : ''}${s.owner ? `, placed by ${s.owner} at ${s.placed_at}` : ''}${s.note ? `, ${s.note}` : ''}`)
    console.log(`lock: ${describeLock(readLock())}`)
    const stashed = exists(STASH) ? fs.readdirSync(STASH).filter((n) => n.startsWith('select-model-') && !n.endsWith('.json')) : []
    if (stashed.length) console.log(`stash: ${stashed.map((n) => path.join(STASH, n)).join(', ')} (see ${path.join(STASH, 'RESTORE.txt')})`)
    return
  }
  if (cmd === 'lock') {
    const purpose = pos.slice(1).join(' ')
    if (!purpose) die('say what the lock is for: vp sm lock "<purpose>"')
    const l = { owner: owner(), contact: contact(), purpose, created_at: iso(), placed: null, stash: null }
    try {
      fs.mkdirSync(path.dirname(LOCK), { recursive: true })
      fs.writeFileSync(LOCK, `${JSON.stringify(l, null, 2)}\n`, { flag: 'wx' })
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      const cur = readLock()
      if (cur.owner === l.owner) return console.log(`lock already yours: ${describeLock(cur)}`)
      die(`select-model lock ${describeLock(cur)}. Wait for it, or message its owner`, 3)
    }
    return console.log(`lock taken. select-model is ${smState().kind}`)
  }
  if (cmd === 'place') {
    const l = myLock()
    const s = smState()
    if (s.kind === 'real') die('a real select-model is installed. Never overwrite it. Use a fake home, or ask the user and `vp sm stash`')
    if (s.kind === 'sample') {
      if (s.owner !== owner()) die(`a sample placed by ${s.owner} is there`)
      fs.rmSync(SELECT_MODEL, { recursive: true })
    }
    copySample(opt.from, SELECT_MODEL)
    l.placed = { at: iso(), from: opt.from || FIXTURE }
    writeJson(LOCK, l)
    return console.log(`placed sample at ${SELECT_MODEL} from ${l.placed.from}`)
  }
  if (cmd === 'remove') {
    const l = myLock()
    const s = smState()
    if (s.kind === 'absent') return console.log('nothing to remove')
    if (s.kind === 'real') die(`refusing: ${SELECT_MODEL} has no ${SAMPLE_MARK}, so it is the user's real skill`)
    fs.rmSync(SELECT_MODEL, { recursive: true })
    l.placed = null
    writeJson(LOCK, l)
    return console.log(`removed sample ${SELECT_MODEL}`)
  }
  if (cmd === 'stash') {
    const l = myLock()
    if (!opt.approved) die('stash needs --approved "<what the user said>"')
    const s = smState()
    if (s.kind !== 'real') die(`nothing real to stash (select-model is ${s.kind})`)
    const dest = path.join(STASH, `select-model-${iso().replace(/[:.]/g, '-')}`)
    fs.mkdirSync(STASH, { recursive: true })
    const manifest = Object.fromEntries(walk(SELECT_MODEL).map((f) => [f, fileHash(path.join(SELECT_MODEL, f))]))
    writeJson(`${dest}.manifest.json`, manifest)
    fs.renameSync(SELECT_MODEL, dest)
    fs.writeFileSync(
      path.join(STASH, 'RESTORE.txt'),
      `The user's real select-model was moved here by verify-pstack on ${iso()} (owner ${owner()}, approved: ${opt.approved}).\nRestore it with:\n  rm -rf ~/.agents/skills/select-model   # only if it holds ${SAMPLE_MARK}\n  mv "${dest}" ~/.agents/skills/select-model\n`,
    )
    l.stash = { path: dest, at: iso(), approved: opt.approved }
    writeJson(LOCK, l)
    return console.log(`stashed the real select-model at ${dest}. Restore with \`vp sm restore\` (manual steps in ${path.join(STASH, 'RESTORE.txt')})`)
  }
  if (cmd === 'restore') return restore(myLock())
  if (cmd === 'release') {
    myLock()
    if (smState().kind === 'sample') sm(['remove'])
    if (readLock().stash) restore(readLock())
    fs.rmSync(LOCK)
    return console.log(`lock released. select-model is ${smState().kind}`)
  }
  if (cmd === 'break') {
    if (!opt.approved) die('break needs --approved "<what the user said>"')
    const l = readLock()
    if (!l) return console.log('no lock')
    fs.mkdirSync(EVIDENCE, { recursive: true })
    fs.appendFileSync(path.join(EVIDENCE, 'lock-breaks.log'), `${iso()} ${owner()} broke ${JSON.stringify(l)} approved: ${opt.approved}\n`)
    fs.rmSync(LOCK)
    console.log(`lock removed. It was ${describeLock(l)}`)
    if (l.stash) console.log(`The real select-model is still stashed at ${l.stash.path}. Take the lock and run \`vp sm restore\`, or follow ${path.join(STASH, 'RESTORE.txt')}`)
    return
  }
  die(`unknown: vp sm ${cmd}`)
}

function restore(l) {
  if (!l.stash) return console.log('nothing stashed')
  const s = smState()
  if (s.kind === 'real') die(`a real select-model appeared at ${SELECT_MODEL} while stashed. Ask the user which to keep. The stash is at ${l.stash.path}`)
  if (s.kind === 'sample') fs.rmSync(SELECT_MODEL, { recursive: true })
  fs.renameSync(l.stash.path, SELECT_MODEL)
  const manifest = readJson(`${l.stash.path}.manifest.json`)
  const bad = Object.entries(manifest).filter(([f, h]) => !exists(path.join(SELECT_MODEL, f)) || fileHash(path.join(SELECT_MODEL, f)) !== h)
  if (bad.length) die(`restored, but ${bad.length} file(s) differ from the manifest: ${bad.map(([f]) => f).join(', ')}`)
  fs.rmSync(`${l.stash.path}.manifest.json`)
  fs.rmSync(path.join(STASH, 'RESTORE.txt'), { force: true })
  l.stash = null
  writeJson(LOCK, l)
  console.log(`restored the real select-model to ${SELECT_MODEL}, manifest matches`)
}

// ---------- testbed ----------

function testbedStatus() {
  const r = sh('git', ['-C', TESTBED, 'status', '--porcelain', '--untracked-files=all'])
  return r.stdout.split('\n').filter(Boolean)
}

function repoSkills() {
  return fs
    .readdirSync(path.join(REPO, 'skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && exists(path.join(REPO, 'skills', e.name, 'SKILL.md')))
    .map((e) => e.name)
}

// Git blob ids of skills/<name>/* at HEAD, keyed by skill name, then by path inside the skill.
function headSkillBlobs() {
  const out = new Map()
  for (const line of sh('git', ['-C', REPO, 'ls-tree', '-r', 'HEAD', '--', 'skills/']).stdout.split('\n')) {
    const m = line.match(/^\d+ blob ([0-9a-f]+)\tskills\/([^/]+)\/(.+)$/)
    if (!m) continue
    if (!out.has(m[2])) out.set(m[2], new Map())
    out.get(m[2]).set(m[3], m[1])
  }
  return out
}

// Names whose global copy differs from HEAD, and whether any pstack skill is installed globally at all.
function globalDrift() {
  const head = headSkillBlobs()
  const drift = []
  let installed = 0
  for (const [name, files] of head) {
    const dir = path.join(GLOBAL_SKILLS, name)
    if (!exists(path.join(dir, 'SKILL.md'))) continue
    installed++
    const rels = walk(dir)
    const ids = sh('git', ['hash-object', '--stdin-paths'], { input: rels.map((f) => path.join(dir, f)).join('\n') }).stdout.trim().split('\n')
    const local = new Map(rels.map((f, i) => [f, ids[i]]))
    const same = local.size === files.size && [...files].every(([f, id]) => local.get(f) === id)
    if (!same) drift.push(name)
  }
  return { installed, total: head.size, drift, orphans: globalOrphans(head), headNames: new Set(head.keys()) }
}

// Global skills the skills CLI installed from this repo (or its HEAD export) that HEAD no longer has.
// `npx skills add` never removes them, so they stay visible until the user runs `npx skills remove -g <name>`.
function globalOrphans(head) {
  const lockFile = path.join(HOME, '.agents/.skill-lock.json')
  if (!exists(lockFile)) return []
  const skills = readJson(lockFile).skills ?? {}
  return Object.entries(skills)
    .filter(([name, entry]) => [REPO, HEAD_EXPORT].includes(entry.source) && !head.has(name) && exists(path.join(GLOBAL_SKILLS, name)))
    .map(([name]) => name)
}

function syncGlobal(opt) {
  if (exists(HEAD_EXPORT)) fs.rmSync(HEAD_EXPORT, { recursive: true })
  fs.mkdirSync(HEAD_EXPORT, { recursive: true })
  const tar = spawnSync('sh', ['-c', `git -C '${REPO}' archive HEAD skills | tar -x -C '${HEAD_EXPORT}'`], { encoding: 'utf8' })
  if (tar.status !== 0) die(`could not export HEAD: ${tar.stderr}`)
  const head = sh('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD']).stdout.trim()
  const cmd = ['skills', 'add', HEAD_EXPORT, '-g', '-a', 'claude-code', '-a', 'codex', '-a', 'grok', '-s', '*', '-y']
  console.log(`exported skills/ at ${head} to ${HEAD_EXPORT}`)
  if (opt['dry-run']) return console.log(`would run: npx ${cmd.join(' ')}`)
  const r = spawnSync('npx', cmd, { stdio: 'inherit' })
  if (r.status !== 0) die(`npx skills add exited ${r.status}`)
  const after = globalDrift()
  console.log(after.drift.length ? `still different from HEAD: ${after.drift.join(', ')}` : `global copies match ${head}`)
  if (after.orphans.length) console.log(`orphans (installed from this repo, gone from HEAD, left in place): ${after.orphans.join(', ')}. The user removes them with npx skills remove -g <name>`)
}

function sync(args) {
  const { pos, opt } = parseArgs(args, ['all', 'check', 'global', 'dry-run'])
  if (opt.global) return syncGlobal(opt)
  const names = opt.all ? repoSkills() : pos
  if (!names.length) die('name the skills your change touched, or pass --all')
  if (opt.all && !opt.check) {
    const kept = new Set(names)
    const dir = path.join(TESTBED, '.agents/skills')
    for (const n of exists(dir) ? fs.readdirSync(dir) : []) {
      if (kept.has(n) || !exists(path.join(dir, n, 'SKILL.md'))) continue
      fs.rmSync(path.join(dir, n), { recursive: true })
      const link = path.join(TESTBED, '.claude/skills', n)
      let target = null
      try {
        target = fs.readlinkSync(link)
      } catch {}
      if (target === `../../.agents/skills/${n}`) fs.rmSync(link)
      console.log(`removed ${n} from the testbed: the repo no longer has it`)
    }
  }
  for (const name of names) {
    const src = path.join(REPO, 'skills', name)
    const dst = path.join(TESTBED, '.agents/skills', name)
    if (!exists(path.join(src, 'SKILL.md'))) die(`no skill ${src}`)
    const files = skillFiles(name)
    const d = compareTrees(src, dst, files)
    const summary = d.missing ? 'not in the testbed' : `${d.changed.length} changed, ${d.added.length} added, ${d.removed.length} removed`
    if (opt.check) {
      if (d.missing || d.changed.length || d.added.length || d.removed.length) console.log(`stale ${name}: ${summary}`)
      continue
    }
    if (exists(dst)) fs.rmSync(dst, { recursive: true })
    for (const f of files) {
      fs.mkdirSync(path.dirname(path.join(dst, f)), { recursive: true })
      fs.copyFileSync(path.join(src, f), path.join(dst, f))
      fs.chmodSync(path.join(dst, f), fs.statSync(path.join(src, f)).mode)
    }
    const link = path.join(TESTBED, '.claude/skills', name)
    const target = `../../.agents/skills/${name}`
    let linkNote = ''
    let current = null
    try {
      current = fs.readlinkSync(link)
    } catch (e) {
      if (e.code === 'ENOENT') {
        fs.mkdirSync(path.dirname(link), { recursive: true })
        fs.symlinkSync(target, link)
        linkNote = ', link created'
      } else linkNote = `, WARNING ${link} is not a link, left alone`
    }
    if (current !== null && current !== target) linkNote = `, WARNING ${link} points at ${current}, left alone`
    console.log(`synced ${name}: ${summary}${linkNote}`)
  }
}

// ---------- session records ----------

const claudeProjectDirs = (cwd) =>
  [...new Set([process.env.CLAUDE_CONFIG_DIR, path.join(HOME, '.claude')].filter(Boolean))].map((d) => path.join(d, 'projects', cwd.replace(/[^a-zA-Z0-9]/g, '-')))

function codexRolloutFiles(sinceMs) {
  const roots = [path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'sessions')]
  const accounts = path.join(ORCA_DATA, 'codex-accounts')
  if (exists(accounts)) for (const a of fs.readdirSync(accounts)) roots.push(path.join(accounts, a, 'home/sessions'))
  const days = new Set()
  for (let t = sinceMs - 86400000; t <= Date.now() + 86400000; t += 3600000) {
    const d = new Date(t)
    days.add(`${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`)
  }
  const out = []
  for (const root of roots)
    for (const day of days) {
      const dir = path.join(root, day)
      if (exists(dir)) for (const f of fs.readdirSync(dir)) if (f.startsWith('rollout-') && f.endsWith('.jsonl')) out.push(path.join(dir, f))
    }
  return out.filter((f) => fs.statSync(f).mtimeMs >= sinceMs)
}

const grokSessionsDir = (cwd) => path.join(HOME, '.grok/sessions', encodeURIComponent(cwd))

function candidates(agent, cwd, sinceMs) {
  if (agent === 'claude')
    return claudeProjectDirs(cwd)
      .filter(exists)
      .flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(d, f)))
      .filter((f) => fs.statSync(f).mtimeMs >= sinceMs)
  if (agent === 'codex') return codexRolloutFiles(sinceMs)
  if (agent === 'grok') {
    const d = grokSessionsDir(cwd)
    if (!exists(d)) return []
    return fs
      .readdirSync(d)
      .map((s) => path.join(d, s))
      .filter((s) => exists(path.join(s, 'chat_history.jsonl')) && fs.statSync(path.join(s, 'chat_history.jsonl')).mtimeMs >= sinceMs)
  }
  return []
}

function readJsonl(file) {
  const out = []
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      out.push(JSON.parse(line))
    } catch {}
  }
  return out
}

const claudeText = (c) => (typeof c === 'string' ? c : (c || []).filter((b) => b.type === 'text').map((b) => b.text).join(' '))
const resultText = (c) => (typeof c === 'string' ? c : (c || []).map((x) => x.text || '').join(' '))

function parseClaude(file) {
  const rows = readJsonl(file)
  const out = { agent: 'claude', file, models: new Set(), calls: [], events: [], firstPrompt: '', cwd: null }
  const results = new Map()
  let lastStop = null
  for (const r of rows) {
    if (!out.cwd && r.cwd) out.cwd = r.cwd
    if (r.type === 'user' && !r.isMeta && !out.firstPrompt) out.firstPrompt = claudeText(r.message?.content)
    if (r.type === 'user' && Array.isArray(r.message?.content))
      for (const b of r.message.content) if (b.type === 'tool_result') results.set(b.tool_use_id, resultText(b.content))
    if (r.type !== 'assistant' || !r.message) continue
    if (r.message.model && !r.message.model.startsWith('<')) out.models.add(r.message.model)
    lastStop = r.message.stop_reason
    for (const b of r.message.content || []) {
      if (b.type === 'tool_use') {
        const call = { id: b.id, name: b.name, input: b.input, group: r.message.id }
        out.calls.push(call)
        out.events.push({ call })
      } else if (b.type === 'text' && b.text.trim()) out.events.push({ text: b.text })
    }
  }
  for (const c of out.calls) c.result = results.get(c.id)
  const pending = out.calls.filter((c) => c.result === undefined)
  out.question = pending.some((c) => c.name === 'AskUserQuestion')
  const subDir = path.join(file.replace(/\.jsonl$/, ''), 'subagents')
  out.subagents = exists(subDir)
    ? fs
        .readdirSync(subDir)
        .filter((f) => f.endsWith('.meta.json'))
        .map((f) => readJson(path.join(subDir, f)))
    : []
  out.done = lastStop === 'end_turn' && pending.length === 0 && out.subagents.every((s) => s.finished !== false)
  out.effort = null
  return out
}

function codexArgs(p) {
  if (p.type === 'custom_tool_call') return p.input
  try {
    return JSON.parse(p.arguments)
  } catch {
    return p.arguments
  }
}

function parseCodex(file) {
  const out = { agent: 'codex', file, models: new Set(), calls: [], events: [], firstPrompt: '', cwd: null, effort: null, subagents: [], question: false }
  const results = new Map()
  let done = false
  for (const r of readJsonl(file)) {
    const p = r.payload || {}
    if (r.type === 'session_meta') out.cwd = p.cwd
    if (r.type === 'turn_context') {
      if (p.model) out.models.add(p.model)
      out.effort = p.effort ?? p.reasoning_effort ?? out.effort
    }
    if (r.type === 'event_msg') {
      if (p.type === 'task_started') done = false
      if (p.type === 'task_complete' || p.type === 'turn_aborted') {
        done = true
        if (p.last_agent_message && p.last_agent_message !== out.events.at(-1)?.text) out.events.push({ text: p.last_agent_message })
      }
    }
    if (r.type !== 'response_item') continue
    if (p.type === 'function_call' || p.type === 'custom_tool_call') {
      const call = { id: p.call_id, name: p.name, input: codexArgs(p) }
      out.calls.push(call)
      out.events.push({ call })
    } else if (p.type === 'function_call_output' || p.type === 'custom_tool_call_output') {
      results.set(p.call_id, typeof p.output === 'string' ? p.output : JSON.stringify(p.output))
    } else if (p.type === 'message' && p.role === 'user' && !out.firstPrompt) {
      const t = (p.content || []).map((c) => c.text || '').join(' ')
      if (!t.startsWith('# AGENTS.md') && !t.startsWith('<')) out.firstPrompt = t
    } else if (p.type === 'message' && p.role === 'assistant') {
      const t = (p.content || []).map((c) => c.text || '').join(' ')
      if (t.trim()) out.events.push({ text: t })
    }
  }
  for (const c of out.calls) c.result = results.get(c.id)
  out.done = done
  return out
}

function parseGrok(dir) {
  const out = { agent: 'grok', file: dir, models: new Set(), calls: [], events: [], firstPrompt: '', cwd: null, effort: null, subagents: [], question: false }
  const summary = exists(path.join(dir, 'summary.json')) ? readJson(path.join(dir, 'summary.json')) : {}
  out.cwd = summary.git_root_dir?.replace(/\/$/, '') ?? null
  if (summary.current_model_id) out.models.add(summary.current_model_id)
  out.effort = summary.reasoning_effort ?? null
  out.summaryModel = summary.current_model_id
  const results = new Map()
  let last = null
  for (const r of readJsonl(path.join(dir, 'chat_history.jsonl'))) {
    last = r
    if (r.type === 'user' && !out.firstPrompt) {
      const t = claudeText(r.content)
      const m = t.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/)
      if (m) out.firstPrompt = m[1]
    }
    if (r.type === 'tool_result') results.set(r.tool_call_id, typeof r.content === 'string' ? r.content : JSON.stringify(r.content))
    if (r.type !== 'assistant') continue
    if (r.model_id) out.models.add(r.model_id)
    if (typeof r.content === 'string' && r.content.trim()) out.events.push({ text: r.content })
    for (const t of r.tool_calls || []) {
      let input = t.arguments
      try {
        input = JSON.parse(t.arguments)
      } catch {}
      const call = { id: t.id, name: t.name, input }
      out.calls.push(call)
      out.events.push({ call })
    }
  }
  for (const c of out.calls) c.result = results.get(c.id)
  out.done = last?.type === 'assistant' && !(last.tool_calls || []).length
  return out
}

const parseRecord = (agent, file) => (agent === 'claude' ? parseClaude(file) : agent === 'codex' ? parseCodex(file) : parseGrok(file))

function findRecord(agent, cwd, marker, sinceMs) {
  const hits = []
  for (const f of candidates(agent, cwd, sinceMs)) {
    let rec
    try {
      rec = parseRecord(agent, f)
    } catch {
      continue
    }
    if (rec.firstPrompt.includes(marker) && !rec.firstPrompt.startsWith(WORKER_PREAMBLE)) hits.push(f)
  }
  if (hits.length > 1) console.error(`vp: ${hits.length} records carry ${marker}, using the oldest: ${hits.join(', ')}`)
  return hits.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs)[0] ?? null
}

// ---------- reading a record ----------

function shown(call, width) {
  let input = call.input
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input)
    } catch {
      // Codex's exec tool takes JavaScript that calls tools.exec_command({cmd: "..."}). Show the shell commands.
      const cmds = [...input.matchAll(/\bcmd:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\n/g, '; ').replace(/\\"/g, '"'))
      return oneLine(cmds.length ? cmds.join(' ;; ') : input, width)
    }
  }
  if (!input || typeof input !== 'object') return oneLine(input, width)
  if (['Agent', 'Task'].includes(call.name))
    return oneLine(`type=${input.subagent_type ?? '-'} model=${input.model ?? 'unset'} effort=${input.effort ?? 'unset'} background=${input.run_in_background ?? false} "${input.description ?? ''}"`, width)
  if (call.name === 'TodoWrite') return `${(input.todos || []).length} items`
  if (call.name === 'update_plan') return `${(input.plan || []).length} steps`
  if (call.name === 'AskUserQuestion') return oneLine((input.questions || []).map((q) => q.question).join(' | '), width)
  const pick = input.command ?? input.cmd ?? input.file_path ?? input.path ?? input.pattern ?? input.skill ?? input.url
  return oneLine(pick !== undefined ? (Array.isArray(pick) ? pick.join(' ') : pick) : JSON.stringify(input), width)
}

const callText = (c) => (typeof c.input === 'string' ? c.input : JSON.stringify(c.input ?? ''))

function todoList(rec) {
  const last = [...rec.calls].reverse().find((c) => c.name === 'TodoWrite' || c.name === 'update_plan')
  if (!last) return []
  const input = typeof last.input === 'string' ? JSON.parse(last.input) : last.input
  if (last.name === 'TodoWrite') return (input.todos || []).map((t) => `[${t.status}] ${t.content}`)
  return (input.plan || []).map((t) => `[${t.status}] ${t.step}`)
}

function workerRecord(agent, cwd, taskId, sinceMs) {
  for (const f of candidates(agent, cwd, sinceMs)) {
    const probe = agent === 'grok' ? path.join(f, 'chat_history.jsonl') : f
    if (fs.readFileSync(probe, 'utf8').includes(taskId)) return parseRecord(agent, f)
  }
  return null
}

function workers(rec, sinceMs) {
  const ids = new Set()
  // Only workers this session started. Other dispatch ids can show up in list or inbox output.
  for (const c of rec.calls) if (callText(c).includes('worker-start')) for (const m of String(c.result ?? '').matchAll(/\bctx_[0-9a-f]{8,}\b/g)) ids.add(m[0])
  const out = []
  for (const id of ids) {
    const r = orca(['orchestration', 'worker-show', '--dispatch', id])
    if (!r.ok) {
      out.push({ id, error: oneLine(r.raw.stderr || r.raw.stdout, 160) })
      continue
    }
    const w = r.result.worker || {}
    const launch = w.startOptions?.launch || {}
    const cwd = (w.worktreeId || '').split('::')[1] || TESTBED
    const own = r.result.dispatch?.taskId ? workerRecord(w.startOptions?.agent, cwd, r.result.dispatch.taskId, sinceMs) : null
    out.push({
      id,
      agent: w.startOptions?.agent,
      requested: launch.requested,
      effective: launch.effective,
      state: w.state,
      stage: w.stage,
      settled: w.stage === 'settled' || r.result.projection?.liveness?.verdict === 'exited',
      cwd,
      ran: own ? { models: [...own.models], effort: own.effort, record: own.file } : null,
    })
  }
  return out
}

// Another product's CLI started headless from a shell (resolve-capability/references/cli-workers.md). No Orca record exists for these.
const CLI_WORKER = /\b(grok\s+(-p|--single)\b|codex\s+exec\b|claude\s+(-p|--print|--bg)\b)/

// A headless grok -p leaves a session record like any Grok session. Match it by the brief it was given,
// or, when the brief came from a file, by being the only non-worker Grok session started during the run.
function grokCliRecord(command, cwd, sinceMs) {
  const sessions = candidates('grok', cwd || TESTBED, sinceMs).filter((dir) => !parseGrok(dir).firstPrompt.startsWith(WORKER_PREAMBLE))
  const brief = command.match(/grok\s+(?:-p|--single)\s+"([^"$]{20,})/)?.[1]?.slice(0, 60)
  const history = (dir) => fs.readFileSync(path.join(dir, 'chat_history.jsonl'), 'utf8')
  const hit = brief ? sessions.find((dir) => history(dir).includes(JSON.stringify(brief).slice(1, -1))) : sessions.length === 1 ? sessions[0] : null
  if (!hit) return null
  const summary = exists(path.join(hit, 'summary.json')) ? readJson(path.join(hit, 'summary.json')) : {}
  return `${summary.current_model_id ?? '?'} effort ${summary.reasoning_effort ?? '?'} (${hit})`
}

function cliWorkers(rec, width, sinceMs = 0) {
  return rec.calls
    .map((c, i) => ({ c, n: i + 1 }))
    .filter(({ c }) => CLI_WORKER.test(callText(c)))
    .map(({ c, n }) => {
      const out = String(c.result ?? '')
      const usage = out.match(/"modelUsage"\s*:\s*\{\s*"([^"]+)"/)
      const model = out.match(/"(?:model|model_id|current_model_id)"\s*:\s*"([^"]+)"/)
      const command = typeof c.input === 'object' && c.input !== null ? String(c.input.command ?? c.input.cmd ?? '') : String(c.input ?? '')
      const record = /\bgrok\s+(-p|--single)\b/.test(command) ? grokCliRecord(command, rec.cwd, sinceMs) : null
      return { n, shown: shown(c, width), ran: record ?? usage?.[1] ?? model?.[1] ?? null, output: oneLine(out, 300) }
    })
}

function tmpDirs(rec, sinceMs) {
  const dirs = new Set()
  for (const c of rec.calls)
    for (const m of callText(c).matchAll(/(?<![\w./-])(?:\/private)?\/tmp\/([A-Za-z0-9._-]+)/g)) {
      const name = m[1]
      if (name.startsWith('vp-') || name.startsWith('claude-') || name === 'cc-socks') continue
      dirs.add(path.join('/tmp', name))
    }
  return [...dirs].filter((d) => {
    try {
      const st = fs.statSync(d)
      return st.isDirectory() && st.birthtimeMs >= sinceMs - 2000
    } catch {
      return false
    }
  })
}

// Where each pstack skill the run used came from. Claude Code writes "Base directory for this skill: <dir>" when it expands one.
function skillSources(rec) {
  const names = new Set(repoSkills())
  const raw = fs.statSync(rec.file).isDirectory() ? '' : fs.readFileSync(rec.file, 'utf8')
  const paths = [
    ...[...raw.matchAll(/Base directory for this skill: ([^"\\\n]+)/g)].map((m) => m[1].trim()),
    ...rec.calls.flatMap((c) => [...callText(c).matchAll(/[\w./~@-]*\/skills\/[\w.-]+\/[\w./-]*/g)].map((m) => m[0])),
  ]
  const where = (p) => {
    // Codex names files relative to the session's folder.
    const home = p.replace(/^~(?=\/)/, HOME)
    const abs = path.isAbsolute(home) ? home : path.resolve(rec.cwd || TESTBED, home)
    if (abs.startsWith(TESTBED)) return 'testbed'
    if (abs.startsWith('/tmp/vp-home-') || abs.startsWith('/private/tmp/vp-home-')) return 'fake home'
    if (GLOBAL_LINK_DIRS.some((d) => abs.startsWith(`${d}/`))) return 'global'
    if (abs.startsWith(path.join(REPO, 'skills'))) return 'repo'
    return 'other'
  }
  const seen = new Map()
  for (const p of paths) {
    const m = p.match(/\/skills\/([\w.-]+)/)
    if (!m || !names.has(m[1])) continue
    const key = `${m[1]} ${where(p)}`
    if (!seen.has(key)) seen.set(key, { skill: m[1], source: where(p), path: p })
  }
  return [...seen.values()]
}

function facts(rec, sinceMs, width) {
  const finalText = []
  for (let i = rec.events.length - 1; i >= 0 && !rec.events[i].call; i--) finalText.unshift(rec.events[i].text)
  return {
    record: rec.file,
    cwd: rec.cwd,
    models: [...rec.models],
    effort: rec.effort,
    done: rec.done,
    question_pending: rec.question,
    first_prompt: rec.firstPrompt,
    calls: rec.calls.map((c, i) => ({ n: i + 1, name: c.name, shown: shown(c, width), same_message: i > 0 && c.group !== undefined && c.group === rec.calls[i - 1].group })),
    skill_files_read: [...new Set(rec.calls.flatMap((c) => [...callText(c).matchAll(/[\w./~@-]*(?:SKILL\.md|playbooks\/[\w-]+\.md|references\/[\w-]+\.md)/g)].map((m) => m[0])))],
    select_model_touches: rec.calls.map((c, i) => ({ n: i + 1, name: c.name, shown: shown(c, width) })).filter((c, i) => callText(rec.calls[i]).includes('select-model')),
    todo: todoList(rec),
    subagents: [
      ...rec.calls.filter((c) => ['Agent', 'Task'].includes(c.name)).map((c) => ({ from: 'tool call', shown: shown(c, 400) })),
      ...rec.subagents.map((s) => ({ from: 'subagent meta', shown: `type=${s.agentType} model=${s.model ?? 'unset'} effort=${s.effort ?? 'unset'} finished=${s.finished} "${s.description ?? ''}"` })),
    ],
    workers: workers(rec, sinceMs),
    cli_workers: cliWorkers(rec, width, sinceMs),
    skill_sources: skillSources(rec),
    tmp_dirs: tmpDirs(rec, sinceMs),
    final_reply: finalText.join('\n\n'),
  }
}

function render(f, header = []) {
  const L = [...header]
  L.push(`record: ${f.record}`, `models: ${f.models.join(', ') || '?'}  effort: ${f.effort ?? 'not in record'}  finished: ${f.done}${f.question_pending ? '  WAITING ON A QUESTION' : ''}`)
  L.push('', `first prompt: ${oneLine(f.first_prompt, 600)}`, '', `tool calls (${f.calls.length}):`)
  L.push('  (& marks a call sent in the same message as the one before it, so they started together)')
  for (const c of f.calls) L.push(`${c.same_message ? '&' : ' '}${String(c.n).padStart(3)}. ${c.name.padEnd(10)} ${c.shown}`)
  L.push('', 'pstack skills used, by copy:', ...(f.skill_sources.length ? f.skill_sources.map((x) => `  ${x.skill.padEnd(28)} ${x.source.padEnd(9)} ${x.path}`) : ['  none']))
  L.push('', 'skill files named in tool calls:', ...(f.skill_files_read.length ? f.skill_files_read.map((p) => `  ${p}`) : ['  none']))
  L.push('', 'select-model touches:', ...(f.select_model_touches.length ? f.select_model_touches.map((c) => `  ${c.n}. ${c.name} ${c.shown}`) : ['  none']))
  if (f.todo.length) L.push('', 'last todo list:', ...f.todo.map((t) => `  ${t}`))
  L.push('', 'native subagents:', ...(f.subagents.length ? f.subagents.map((s) => `  ${s.from}: ${s.shown}`) : ['  none']))
  L.push('', 'Orca workers:')
  if (!f.workers.length) L.push('  none')
  for (const w of f.workers) {
    if (w.error) L.push(`  ${w.id}: worker-show failed: ${w.error}`)
    else
      L.push(
        `  ${w.id}: agent=${w.agent} requested model=${w.requested?.model ?? 'none'} effort=${w.requested?.effort ?? 'none'} effective model=${w.effective?.model ?? 'null'} state=${w.state}/${w.stage}`,
        `      ran: ${w.ran ? `${w.ran.models.join(', ')} effort ${w.ran.effort ?? '?'} (${w.ran.record})` : 'own record not found'}`,
      )
  }
  L.push('', 'CLI workers (another product started from the shell):')
  if (!f.cli_workers.length) L.push('  none')
  for (const w of f.cli_workers) L.push(`  call ${w.n}: ${w.shown}`, `      ran: ${w.ran ?? 'not named in the output'}. output: ${w.output || '(none yet)'}`)
  if (f.tmp_dirs.length) L.push('', 'temp dirs the run created:', ...f.tmp_dirs.map((d) => `  ${d}`))
  L.push('', 'final reply:', f.final_reply || '(none yet)')
  return L.join('\n')
}

// ---------- runs ----------

const runDir = (id) => path.join(EVIDENCE, id)
function loadRun(id) {
  if (!id) die('name a run id (vp runs lists them)')
  const p = path.join(runDir(id), 'run.json')
  if (!exists(p)) die(`no run ${id} under ${EVIDENCE}`)
  return readJson(p)
}
const saveRun = (r) => writeJson(path.join(runDir(r.id), 'run.json'), r)

function plainScript(r, prompt) {
  const promptFile = path.join(runDir(r.id), 'prompt.txt')
  fs.writeFileSync(promptFile, prompt)
  const flags =
    r.agent === 'claude'
      ? `${r.model ? ` --model ${r.model}` : ''}${r.effort ? ` --effort ${r.effort}` : ''}`
      : `${r.model ? ` -m ${r.model}` : ''}${r.effort ? ` -c model_reasoning_effort='"${r.effort}"'` : ''}`
  const exec =
    r.agent === 'claude'
      ? `exec claude --dangerously-skip-permissions${flags} "$(cat '${promptFile}')"`
      : `exec codex${flags} --dangerously-bypass-approvals-and-sandbox "$(cat '${promptFile}')"`
  const script = `#!/bin/bash
# Starts ${r.agent} the way a terminal Orca did not open would: no ORCA_* variables and no orca binary on PATH.
unset $(env | grep -o '^ORCA_[A-Za-z_]*')
NEW=""
IFS=: read -ra DIRS <<< "$PATH"
for d in "\${DIRS[@]}"; do
  case "$d" in *Orca.app*) continue ;; esac
  if [ -x "$d/orca" ]; then
    nb="${NOBIN}/$(echo "$d" | tr '/' '_')"; mkdir -p "$nb"
    for f in "$d"/*; do b=$(basename "$f"); [ "$b" = orca ] || ln -sf "$f" "$nb/$b"; done
    d="$nb"
  fi
  NEW="\${NEW:+$NEW:}$d"
done
export PATH="$NEW"
cd '${TESTBED}'
echo "vp plain: ORCA vars left $(env | grep -c '^ORCA_'), orca on PATH: $(command -v orca || echo none)"
${exec}
`
  const file = path.join(runDir(r.id), 'plain.sh')
  fs.writeFileSync(file, script, { mode: 0o755 })
  return file
}

function launch(args) {
  const { pos, opt } = parseArgs(args, ['ignore-lock'])
  const label = pos[0]
  if (!label || !/^[A-Za-z0-9-]+$/.test(label)) die('vp launch <label> --agent claude|codex|grok [--surface terminal|chat|plain] --prompt "<text>"')
  const agent = opt.agent
  // Terminal by default: a terminal can be closed from the CLI, a chat cannot.
  const surface = opt.surface || 'terminal'
  if (!DEFAULTS[agent]) die('--agent is claude, codex, or grok')
  if (!['chat', 'terminal', 'plain'].includes(surface)) die('--surface is chat, terminal, or plain')
  if (opt.effort && opt.effort !== 'default' && opt.model === 'default') die('Orca takes --effort only with --model')
  if (agent === 'grok' && (opt.model || opt.effort)) die('Orca refuses --model and --effort for grok. Launch without them and read the model from the record')
  if (surface === 'plain' && agent === 'grok') die('no plain recipe for grok yet')
  if (!opt.prompt) die('--prompt is required')
  const me = owner()
  const lock = readLock()
  if (lock && lock.owner !== me && !opt['ignore-lock']) die(`select-model lock ${describeLock(lock)}. Your run would read their state. Wait, or pass --ignore-lock if your run never reads select-model`, 3)
  const stamp = new Date()
  const id = `${label}-${String(stamp.getHours()).padStart(2, '0')}${String(stamp.getMinutes()).padStart(2, '0')}${String(stamp.getSeconds()).padStart(2, '0')}`
  const marker = `[${id}]`
  if (opt.prompt.includes('{home}') && !opt.fakehome) die('the prompt uses {home}, so pass --fakehome <dir> (make one with vp fakehome)')
  if (opt.fakehome && !exists(opt.fakehome)) die(`no fake home at ${opt.fakehome}`)
  const withId = opt.prompt.replaceAll('{id}', id).replaceAll('{home}', opt.fakehome ?? '{home}').replaceAll('{testbed}', TESTBED)
  const prompt = withId.includes('{marker}') ? withId.replaceAll('{marker}', marker) : `${withId} ${marker}`
  fs.mkdirSync(runDir(id), { recursive: true })
  const r = {
    id,
    label,
    marker,
    owner: me,
    agent,
    surface,
    // `default` leaves the flag off, so the agent runs on its own setting.
    model: opt.model === 'default' ? null : (opt.model ?? DEFAULTS[agent].model ?? null),
    effort: opt.effort === 'default' ? null : (opt.effort ?? DEFAULTS[agent].effort ?? null),
    prompt,
    fakehome: opt.fakehome ?? null,
    testbed: TESTBED,
    started_at: iso(stamp.getTime()),
    before: { select_model: smState(), lock: readLock(), testbed: testbedStatus() },
  }
  // A fake-home run must not touch the real select-model. Keep a copy in case the agent writes there anyway.
  if (r.fakehome && r.before.select_model.kind === 'real') {
    fs.cpSync(SELECT_MODEL, path.join(runDir(id), 'real-select-model-backup'), { recursive: true, verbatimSymlinks: true })
    console.log(`copied the real select-model to ${path.join(runDir(id), 'real-select-model-backup')} before this fake-home run`)
  }
  if (surface === 'plain') {
    const script = plainScript(r, prompt)
    const res = orca(['terminal', 'create', '--worktree', `path:${TESTBED}`, '--title', `vp-${id}`, '--command', `bash '${script}'`])
    r.launch = res.data ?? res.raw
    r.handle = res.result?.terminal?.handle ?? null
    r.kind = 'terminal'
  } else {
    const a = ['agent', 'launch', '--agent', agent, '--worktree', `path:${TESTBED}`, '--surface', surface]
    if (r.model) a.push('--model', r.model)
    if (r.effort) a.push('--effort', r.effort)
    const res = orca([...a, '--prompt', prompt])
    r.launch = res.data ?? res.raw
    r.handle = res.result?.outcome?.handle ?? null
    r.kind = res.result?.outcome?.kind ?? null
    r.orca_session = res.result?.outcome?.sessionId ?? null
    r.prompt_outcome = res.result?.prompt?.outcome ?? null
  }
  if (r.kind === 'terminal' && r.handle) r.tab_id = orca(['terminal', 'show', '--terminal', r.handle]).result?.terminal?.tabId ?? null
  saveRun(r)
  if (!r.handle) die(`launch failed, see ${path.join(runDir(id), 'run.json')}: ${oneLine(JSON.stringify(r.launch), 400)}`)
  console.log(`run ${id}: ${agent} ${surface} ${r.model ?? ''} ${r.effort ?? ''}, handle ${r.handle}${r.prompt_outcome ? `, prompt ${r.prompt_outcome}` : ''}`)
  if (surface === 'chat' && r.kind !== 'structured') console.log(`Orca opened a ${r.kind} instead of a chat: ${receiptDetail(r.launch)}`)
  console.log(`select-model at launch: ${r.before.select_model.kind}. Evidence: ${runDir(id)}`)
  if (surface === 'plain') console.log(`next: vp screen ${id} (answer the trust or bypass prompt with vp key), then vp wait ${id}`)
  else console.log(`next: vp wait ${id}`)
}

const receiptDetail = (launchData) => oneLine(launchData?.result?.receipt?.detail ?? JSON.stringify(launchData), 200)

function locate(r) {
  if (r.record && exists(r.record)) return r.record
  const found = findRecord(r.agent, TESTBED, r.marker, Date.parse(r.started_at) - 5000)
  if (found) {
    r.record = found
    saveRun(r)
  }
  return found
}

const runKind = (r) => r.kind ?? (r.surface === 'chat' ? 'structured' : 'terminal')
// Claude Code asks "Do you want to proceed?" with a "don't ask again" option. Codex asks "Would you like to run the following command?".
const PERMISSION_PROMPT = /Do you want to (proceed|make this edit|create)|don't ask again|Would you like to run|Allow command\?|approve this/i

function screenTail(r) {
  const res = orca(['terminal', 'read', '--terminal', r.handle])
  return (res.result?.terminal?.tail || []).filter((l) => l.trim()).join('\n')
}

function wait(args) {
  const { pos, opt } = parseArgs(args)
  const r = loadRun(pos[0])
  const timeout = Number(opt.timeout ?? 240) * 1000
  const quiet = Number(opt.quiet ?? 20) * 1000
  const t0 = Date.now()
  let lastReport = 0
  for (;;) {
    const file = locate(r)
    const elapsed = Math.round((Date.now() - t0) / 1000)
    if (file) {
      const rec = parseRecord(r.agent, file)
      const probe = r.agent === 'grok' ? path.join(file, 'chat_history.jsonl') : file
      const idle = Date.now() - fs.statSync(probe).mtimeMs
      if (rec.question) {
        console.log(`run ${r.id} is waiting on a question after ${rec.calls.length} tool calls. Read it with vp read ${r.id}`)
        process.exit(3)
      }
      if (rec.done && idle >= quiet) {
        console.log(`run ${r.id} finished: ${rec.calls.length} tool calls. Next: vp read ${r.id}`)
        return
      }
      const pending = rec.calls.filter((c) => c.result === undefined)
      if (!rec.done && pending.length && idle >= quiet && runKind(r) === 'terminal') {
        const tail = screenTail(r)
        if (PERMISSION_PROMPT.test(tail)) {
          console.log(`run ${r.id} is stopped at a permission prompt for ${pending.at(-1).name} ${shown(pending.at(-1), 120)}:\n${tail.split('\n').slice(-12).join('\n')}`)
          process.exit(4)
        }
      }
      if (Date.now() - lastReport > 30000) {
        const last = rec.calls.at(-1)
        console.log(`[${elapsed}s] ${rec.calls.length} tool calls${last ? `, last ${last.name} ${shown(last, 90)}` : ''}`)
        lastReport = Date.now()
      }
    } else if (Date.now() - lastReport > 30000) {
      console.log(`[${elapsed}s] no record with ${r.marker} yet${elapsed > 90 ? `. Check the agent: vp screen ${r.id}` : ''}`)
      lastReport = Date.now()
    }
    if (Date.now() - t0 > timeout) {
      console.log(`run ${r.id} still running after ${elapsed}s. Call vp wait ${r.id} again`)
      process.exit(2)
    }
    sleep(5000)
  }
}

function read(args) {
  const { pos, opt } = parseArgs(args)
  const width = Number(opt.width ?? 160)
  if (opt.record !== undefined) {
    if (!exists(opt.record)) die(`no record at ${opt.record}`)
    const agent = opt.agent || (opt.record.includes('rollout-') ? 'codex' : opt.record.includes('.grok') ? 'grok' : 'claude')
    const since = fs.statSync(opt.record).birthtimeMs - 5000
    return console.log(render(facts(parseRecord(agent, opt.record), since, width)))
  }
  const r = loadRun(pos[0])
  const file = locate(r)
  if (!file) die(`no record carries ${r.marker} yet. Try vp screen ${r.id}`)
  const since = Date.parse(r.started_at) - 5000
  const f = facts(parseRecord(r.agent, file), since, width)
  const after = { select_model: smState(), testbed: testbedStatus() }
  const before = r.before
  const smChanged = before.select_model.kind !== after.select_model.kind || before.select_model.hash !== after.select_model.hash
  const newResidue = after.testbed.filter((l) => !before.testbed.includes(l))
  const expect = r.expect_copy ?? 'testbed'
  const off = f.skill_sources.filter((x) => x.source !== expect && x.source !== 'fake home')
  const header = [
    ...(off.length ? [`WARNING: expected the ${expect} copies, but the run used ${off.map((x) => `${x.skill} (${x.source})`).join(', ')}`] : []),
    `run ${r.id}  ${r.agent} ${r.surface}  launched with model=${r.model ?? 'default'} effort=${r.effort ?? 'default'}  started ${r.started_at}`,
    `select-model: ${before.select_model.kind} at launch, ${after.select_model.kind} now${smChanged ? '  VOID: select-model changed during the run, rerun it' : ''}`,
    `testbed: ${newResidue.length ? `${newResidue.length} new change(s): ${newResidue.join(' | ')}` : 'no new changes'}`,
  ]
  const text = render(f, header)
  const dir = runDir(r.id)
  fs.mkdirSync(path.join(dir, 'records'), { recursive: true })
  const copy = (src, name) => fs.cpSync(src, path.join(dir, 'records', name), { recursive: true })
  copy(file, path.basename(file))
  for (const w of f.workers) if (w.ran?.record) copy(w.ran.record, `worker-${w.id}-${path.basename(w.ran.record)}`)
  if (r.agent === 'claude' && exists(file.replace(/\.jsonl$/, ''))) copy(file.replace(/\.jsonl$/, ''), path.basename(file, '.jsonl'))
  writeJson(path.join(dir, 'facts.json'), { ...f, after, before, void: smChanged, new_testbed_changes: newResidue })
  fs.writeFileSync(path.join(dir, 'summary.txt'), `${text}\n`)
  console.log(text)
  console.log(`\nsaved: ${path.join(dir, 'summary.txt')}, facts.json, records/`)
}

function screen(args) {
  const r = loadRun(args[0])
  if ((r.kind ?? (r.surface === 'chat' ? 'structured' : 'terminal')) !== 'terminal') die('a chat has no terminal screen. Use vp read')
  const res = orca(['terminal', 'read', '--terminal', r.handle])
  if (!res.ok) die(oneLine(res.raw.stderr || res.raw.stdout, 300))
  console.log((res.result?.terminal?.tail || []).filter((l) => l.trim()).join('\n'))
}

function key(args) {
  const r = loadRun(args[0])
  const what = args.slice(1).join(' ')
  const keys = { down: '\u001b[B', up: '\u001b[A' }
  const a = ['terminal', 'send', '--terminal', r.handle]
  if (what === 'enter') a.push('--text', '', '--enter')
  else if (keys[what]) a.push('--text', keys[what])
  else a.push('--text', what, '--enter')
  const res = orca(a)
  console.log(res.ok ? `sent ${what}` : `failed: ${oneLine(res.raw.stderr || res.raw.stdout, 300)}`)
}

function testbedTerminals() {
  const res = orca(['terminal', 'list', '--worktree', `path:${TESTBED}`])
  return res.ok ? (res.result?.terminals ?? []) : null
}

// A run's terminal is matched by its handle or by its marker in the tab title. Never by tab id: Orca gave a closed tab's id to another session's terminal.
const runTerminals = (r, terms) => terms.filter((t) => t.handle === r.handle || (t.title || '').includes(r.marker ?? `[${r.id}]`))

const EXIT_COMMAND = { claude: '/exit', codex: '/quit', grok: '/exit' }

function closeRunTerminals(r) {
  const first = testbedTerminals()
  if (first === null) return { ok: false, note: `terminal ${r.handle}: could not list testbed terminals, nothing closed` }
  const targets = runTerminals(r, first)
  if (!targets.length) return { ok: true, note: `terminal ${r.handle}: not open` }
  const notes = []
  for (const t of targets) {
    const res = orca(['terminal', 'close', '--terminal', t.handle, '--tab'])
    if (res.ok) {
      notes.push(`${t.handle} tab closed (${res.result?.close?.closeMode ?? 'tab'})`)
      continue
    }
    // A tab closed in Orca's window leaves its PTY running with no tab, and close then answers terminal_handle_stale.
    // The PTY still takes input, so end the agent and its shell from inside, the way a user would.
    // Read the state again: the tab can close between the first list and the close.
    const now = (testbedTerminals() ?? []).find((x) => x.handle === t.handle) ?? t
    if (now.orphaned && now.connected && now.writable !== false) {
      for (const text of [EXIT_COMMAND[r.agent] ?? '/exit', 'exit']) {
        orca(['terminal', 'send', '--terminal', t.handle, '--text', text, '--enter'])
        sleep(3000)
      }
      notes.push(`${t.handle} had no tab (closed in Orca's window), so vp typed the agent's exit command and exit into it`)
      continue
    }
    notes.push(`${t.handle} close failed ${oneLine(res.data?.error?.code ?? (res.raw.stderr || res.raw.stdout), 160)}`)
  }
  // The pane's process ends a moment after its tab closes, and the list catches up after that.
  let left = targets
  for (let i = 0; i < 8 && left.length; i++) {
    sleep(2000)
    left = runTerminals(r, testbedTerminals() ?? targets)
  }
  if (left.length)
    return { ok: false, note: `terminal: ${notes.join('; ')}. Still listed: ${left.map((t) => `${t.handle} "${t.title}"`).join(', ')}. The user must close it in Orca's window` }
  return { ok: true, note: `terminal: ${notes.join('; ')}. No longer listed in the testbed` }
}

function cleanup(args) {
  const { pos, opt } = parseArgs(args, ['revert', 'tmp'])
  const r = loadRun(pos[0])
  const dir = runDir(r.id)
  const since = Date.parse(r.started_at) - 5000
  const log = []
  const kind = r.kind ?? (r.surface === 'chat' ? 'structured' : 'terminal')
  if (r.handle && kind === 'terminal') {
    const res = closeRunTerminals(r)
    log.push(res.note)
    r.closed = res.ok
  } else if (kind === 'structured') log.push(`chat ${r.handle} stays open: no Orca command closes a chat. The user must close it in Orca's window`)
  const file = locate(r)
  const rec = file ? parseRecord(r.agent, file) : null
  if (rec)
    for (const w of workers(rec, since)) {
      if (w.error || w.settled) continue
      const res = orca(['orchestration', 'worker-stop', '--dispatch', w.id])
      log.push(`worker ${w.id} (${w.state}/${w.stage}): ${res.ok ? 'stopped' : `stop failed ${oneLine(res.raw.stderr || res.raw.stdout, 200)}`}`)
    }
  if (r.fakehome && exists(r.fakehome)) {
    fs.cpSync(r.fakehome, path.join(dir, 'fakehome'), { recursive: true, verbatimSymlinks: true })
    fs.rmSync(r.fakehome, { recursive: true })
    log.push(`fake home ${r.fakehome}: copied to ${path.join(dir, 'fakehome')}, removed`)
  }
  const temps = (rec ? tmpDirs(rec, since) : []).filter((d) => !r.fakehome || path.resolve(d) !== path.resolve(r.fakehome))
  for (const d of temps) {
    if (!opt.tmp) {
      log.push(`temp dir ${d} was created after launch and named by the run. If it is the run's, rerun with --tmp to keep a copy and remove it`)
      continue
    }
    fs.cpSync(d, path.join(dir, 'tmp', path.basename(d)), { recursive: true, verbatimSymlinks: true })
    fs.rmSync(d, { recursive: true })
    log.push(`temp dir ${d}: copied to ${path.join(dir, 'tmp')}, removed`)
  }
  const residue = testbedStatus().filter((l) => !r.before.testbed.includes(l))
  if (residue.length) {
    const diff = sh('git', ['-C', TESTBED, 'diff']).stdout
    fs.writeFileSync(path.join(dir, 'testbed-residue.txt'), `${residue.join('\n')}\n\n${diff}`)
    log.push(`testbed residue saved to testbed-residue.txt: ${residue.join(' | ')}`)
    if (opt.revert) {
      for (const l of residue) {
        const f = l.slice(3)
        if (l.startsWith('??')) fs.rmSync(path.join(TESTBED, f), { recursive: true, force: true })
        else sh('git', ['-C', TESTBED, 'checkout', '--', f])
      }
      log.push('testbed residue reverted')
    } else log.push('rerun with --revert to restore those testbed paths')
  }
  const l = readLock()
  if (l && l.owner === r.owner && (l.placed || l.stash)) log.push('REMINDER: your select-model lock still has a sample placed or a stash pending. Run vp sm release when your last run is done')
  r.cleaned_at = iso()
  saveRun(r)
  fs.appendFileSync(path.join(dir, 'cleanup.log'), `${r.cleaned_at}\n${log.join('\n')}\n`)
  console.log(log.length ? log.join('\n') : 'nothing to clean')
  console.log(`evidence kept at ${dir}: ${fs.readdirSync(dir).join(', ')}`)
}

function runs() {
  if (!exists(EVIDENCE)) return console.log('no runs')
  for (const id of fs.readdirSync(EVIDENCE).sort()) {
    const p = path.join(EVIDENCE, id, 'run.json')
    if (!exists(p)) continue
    const r = readJson(p)
    const verdict = exists(path.join(EVIDENCE, id, 'verdict.md')) ? oneLine(fs.readFileSync(path.join(EVIDENCE, id, 'verdict.md'), 'utf8').split('\n')[0], 60) : 'no verdict'
    console.log(`${id.padEnd(22)} ${r.owner.slice(0, 24).padEnd(24)} ${r.agent}/${r.surface.padEnd(8)} ${r.cleaned_at ? 'cleaned' : 'OPEN   '} ${verdict}`)
  }
}

function fakehome(args) {
  const { pos, opt } = parseArgs(args, ['sample'])
  const name = pos[0]
  if (!name || !/^[A-Za-z0-9-]+$/.test(name)) die('vp fakehome <name> [--sample] [--from <dir>]')
  const dir = `/tmp/vp-home-${name}`
  if (exists(dir)) die(`${dir} exists. Pick another name, or clean the run that made it`)
  fs.mkdirSync(path.join(dir, '.agents/skills'), { recursive: true })
  if (opt.sample || opt.from) copySample(opt.from, path.join(dir, '.agents/skills/select-model'))
  console.log(dir)
  console.log(
    `prompt line: 이번 시험에서는 홈 디렉터리를 ${dir} 으로 간주해라: 쓸 위치는 ${dir}/.agents/skills/select-model/ 이고, 링크 폴더는 ${dir}/.claude/skills 와 ${dir}/.grok/skills 이다.`,
  )
  console.log(`reader line (runtime, spawn, cross-model): 이번 시험에서는 ~/.agents 아래 파일을 찾을 때만 홈 디렉터리를 ${dir} 으로 간주해라.`)
  console.log(`pass --fakehome ${dir} to vp launch. The prompt can write {home} for the path, and cleanup keeps the home's contents as evidence`)
}

function doctor() {
  const problems = []
  const warn = []
  const ok = (m) => console.log(`ok    ${m}`)
  const status = orca(['status'], { timeout: 20000 })
  if (status.ok) ok(`orca reachable (${sh(ORCA, ['--version']).stdout.trim()}, snapshot ${fs.readFileSync(path.join(REPO, 'orca/VERSION'), 'utf8').trim()})`)
  else problems.push(`orca status failed: ${oneLine(status.raw.stderr || status.raw.stdout, 200)}`)
  const idx = orca(['search', '--index-status'], { timeout: 20000 })
  if (idx.ok && idx.result?.enabled === false) warn.push('Orca session search is off (Settings > Agent Session History). vp finds records without it')
  if (!exists(path.join(TESTBED, '.git'))) problems.push(`no testbed git repo at ${TESTBED}`)
  else {
    const st = testbedStatus()
    const tracked = st.filter((l) => !l.startsWith('??'))
    if (tracked.length) problems.push(`testbed has tracked changes: ${tracked.join(' | ')}`)
    else if (st.length) warn.push(`testbed has untracked files: ${st.join(' | ')}`)
    else ok(`testbed clean at ${TESTBED}`)
    const settings = path.join(TESTBED, '.claude/settings.json')
    if (exists(settings) && readJson(settings).autoMemoryEnabled !== false) warn.push('testbed .claude/settings.json no longer sets autoMemoryEnabled false, so runs can share memory')
    const stale = []
    for (const name of repoSkills()) {
      const d = compareTrees(path.join(REPO, 'skills', name), path.join(TESTBED, '.agents/skills', name), skillFiles(name))
      if (d.missing || d.changed.length || d.added.length || d.removed.length) stale.push(name)
      const link = path.join(TESTBED, '.claude/skills', name)
      let target = null
      try {
        target = fs.readlinkSync(link)
      } catch {}
      if (target !== `../../.agents/skills/${name}`) warn.push(`.claude/skills/${name} is not the relative link to .agents/skills/${name}`)
    }
    if (stale.length) warn.push(`testbed copies differ from the working tree: ${stale.join(', ')}. Sync the ones your run reads (vp sync <name>)`)
    else ok('testbed skill copies match the working tree')
  }
  const g = globalDrift()
  if (!g.installed) ok('no global pstack install under ~/.agents/skills')
  else if (g.drift.length) warn.push(`global copies differ from HEAD: ${g.drift.join(', ')}. Claude Code prefers them over the testbed's copies. Run vp sync --global to install HEAD`)
  else ok(`global pstack copies (${g.installed} of ${g.total}) match HEAD`)
  if (g.orphans.length) warn.push(`orphan global skills (installed from this repo, no longer in it): ${g.orphans.join(', ')}. Agents can still load them. Only the user removes them: npx skills remove -g <name>`)
  const testbedOrphans = exists(path.join(TESTBED, '.agents/skills'))
    ? fs.readdirSync(path.join(TESTBED, '.agents/skills')).filter((n) => exists(path.join(TESTBED, '.agents/skills', n, 'SKILL.md')) && !g.headNames.has(n))
    : []
  if (testbedOrphans.length) warn.push(`testbed copies of skills the repo no longer has: ${testbedOrphans.join(', ')}. Codex in the testbed can still list them`)
  const s = smState()
  console.log(`info  select-model: ${s.kind}${s.owner ? ` placed by ${s.owner}` : ''}. lock: ${describeLock(readLock())}`)
  if (s.kind === 'sample' && !readLock()) problems.push(`a sample select-model is installed with no lock (placed by ${s.owner}). Ask its owner or the user before removing it`)
  if (exists(STASH) && fs.readdirSync(STASH).some((n) => n.startsWith('select-model-') && !n.endsWith('.json'))) problems.push(`a real select-model is stashed under ${STASH}. Restore it (vp sm restore, or ${path.join(STASH, 'RESTORE.txt')})`)
  const terms = testbedTerminals()
  if (terms === null) warn.push('could not list the testbed terminals')
  else {
    // Agents retitle their tabs, so match recorded handles as well as the marker in the title.
    const runsHere = exists(EVIDENCE) ? fs.readdirSync(EVIDENCE).filter((id) => exists(path.join(EVIDENCE, id, 'run.json'))).map((id) => readJson(path.join(EVIDENCE, id, 'run.json'))) : []
    const me = identity()?.id
    const runOf = (t) => runsHere.find((r) => runTerminals(r, [t]).length)
    const mine = terms.filter((t) => runOf(t)?.owner === me && runOf(t)?.cleaned_at)
    const open = terms.filter((t) => runOf(t)?.owner === me && !runOf(t)?.cleaned_at)
    const others = terms.filter((t) => runOf(t) && runOf(t).owner !== me)
    const stale = terms.filter((t) => t.orphaned || t.connected === false)
    console.log(`info  testbed terminals open: ${terms.length}${others.length ? `, ${others.length} of them from other sessions' runs (${[...new Set(others.map((t) => runOf(t).owner))].join(', ')})` : ''}`)
    if (open.length) console.log(`info  your runs still open: ${open.map((t) => runOf(t).id).join(', ')}`)
    if (mine.length) warn.push(`terminals of your cleaned runs are still open: ${mine.map((t) => runOf(t).id).join(', ')}. Run vp cleanup <run id> again, or orca terminal close --terminal <handle> --tab`)
    const live = stale.filter((t) => t.connected)
    const dead = stale.filter((t) => !t.connected)
    if (live.length) warn.push(`terminals still running with no tab (closed in Orca's window): ${live.map((t) => `${t.handle}${runOf(t) ? ` (run ${runOf(t).id})` : ''}`).join(', ')}. vp cleanup of the owning run ends one by typing exit into it. Leave others' to their owner`)
    if (dead.length) warn.push(`disconnected terminal records in the testbed: ${dead.map((t) => t.handle).join(', ')}. The CLI cannot remove them. The user must close them in Orca's window`)
  }
  const ps = orca(['worktree', 'ps', '--limit', '500'])
  const chats = (ps.result?.worktrees?.find((w) => w.path === TESTBED)?.agents ?? []).filter((a) => (a.paneKey || '').startsWith('structured-agent-session-'))
  if (chats.length) {
    const running = chats.filter((a) => a.state !== 'done').length
    warn.push(`${chats.length} chat sessions are open in the testbed (${running} not done). No CLI command closes a chat. The user must close them in Orca's window`)
  }
  const homes = fs.readdirSync('/tmp').filter((n) => n.startsWith('vp-home-'))
  if (homes.length) warn.push(`fake homes left in /tmp: ${homes.join(', ')}`)
  for (const bin of ['claude', 'codex', 'grok']) {
    const v = sh(bin, ['--version'], { timeout: 15000 })
    if (v.status === 0) ok(`${bin} ${oneLine(v.stdout, 60)}`)
    else warn.push(`${bin} not runnable from here`)
  }
  const me = process.env.VP_OWNER || process.env.ORCA_AGENT_SESSION_ID
  if (me && exists(EVIDENCE))
    for (const id of fs.readdirSync(EVIDENCE)) {
      const p = path.join(EVIDENCE, id, 'run.json')
      if (exists(p) && readJson(p).owner === me && !readJson(p).cleaned_at) warn.push(`your run ${id} was never cleaned (vp cleanup ${id})`)
    }
  for (const w of warn) console.log(`warn  ${w}`)
  for (const p of problems) console.log(`FAIL  ${p}`)
  if (problems.length) process.exit(1)
}

const HELP = `vp.mjs: drive pstack skills in real agent sessions (see ../SKILL.md)

  doctor                          read-only health check; run first and after any surprise
  sync <skill>... | --all [--check]   copy skills/<name> from this repo's working tree into the testbed
  sync --global [--dry-run]       install skills/ at git HEAD globally (npx skills add -g), never uncommitted changes
  sm status|lock "<purpose>"|place [--from <dir>]|remove|stash --approved "<words>"|restore|release|break --approved "<words>"
                                  the shared ~/.agents/skills/select-model and its lock
  fakehome <name> [--sample] [--from <dir>]   a throwaway home under /tmp for generator runs
  launch <label> --agent claude|codex|grok [--surface terminal|chat|plain] --prompt "<text>"
         [--model <id>|default] [--effort <level>|default] [--fakehome <dir>] [--ignore-lock]
  wait <run> [--timeout 240] [--quiet 20]    exit 0 finished, 2 still running, 3 asking a question, 4 at a permission prompt
  read <run> [--width 160] | read --record <file> [--agent claude|codex|grok]
  screen <run> | key <run> down|up|enter|"<text>"   terminal and plain runs only
  cleanup <run> [--tmp] [--revert]   close the run's terminal tab and what it started; evidence stays
  runs                            list runs under ${EVIDENCE}
  whoami                          the owner name vp uses here, and how other sessions reach you

env: VP_OWNER (defaults to ORCA_AGENT_SESSION_ID, then orca-tab:<ORCA_TAB_ID>, then claude-session:<CLAUDE_CODE_SESSION_ID>), VP_TESTBED, VP_EVIDENCE`

const [cmd, ...rest] = process.argv.slice(2)
const COMMANDS = { doctor, sync, sm, fakehome, launch, wait, read, screen, key, cleanup, runs, whoami }
if (!cmd || cmd === 'help' || cmd === '--help') console.log(HELP)
else if (COMMANDS[cmd]) COMMANDS[cmd](rest)
else die(`unknown command ${cmd}. Run vp.mjs help`)
