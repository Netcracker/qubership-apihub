#!/usr/bin/env node
/**
 * Quality gates for the files a change touched in frontend/ and tests/ui-tests/, grouped by pnpm package: dprint for
 * the files that do not exist in the base branch yet, ESLint with --fix, tsc --noEmit for the nearest tsconfig.json,
 * and Jest --findRelatedTests through Nx. Each gate fails only on problems in the touched files.
 *
 * Usage: node <skill directory>/scripts/validate.mjs [--files <path...>] [--base <ref>]
 *        [--scope all|format|lint|typecheck|test]
 * Without --files: every file changed since the merge base with origin/develop (or develop), plus untracked files.
 * Exits 1 when a gate fails, 2 on a usage error or when there is nothing to check.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, posix, relative, resolve, sep } from 'node:path'

const ROOT = git(['rev-parse', '--show-toplevel']) ?? process.cwd()
const CHECKED = /^(frontend|tests\/ui-tests)\/.+\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|json|jsonc|md|ya?ml|css|scss|less|html|graphql)$/
const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/
const TS = /\.(ts|tsx|mts|cts)$/
const SCOPES = ['all', 'format', 'lint', 'typecheck', 'test']

// The ui-shared Jest suite runs the unit tests of portal and agents too; the dev servers have their own suite.
const TEST_SUITES = [
  { prefix: 'frontend/ui/packages/portal/server/', dir: 'frontend/ui/packages/portal', script: 'test:server' },
  { prefix: 'frontend/ui/packages/portal/', dir: 'frontend/ui/packages/shared', script: 'test' },
  { prefix: 'frontend/ui/packages/agents/', dir: 'frontend/ui/packages/shared', script: 'test' },
]

const options = parseArgs(process.argv.slice(2))
const base = options.base ?? ['origin/develop', 'develop'].find((ref) => git(['rev-parse', '--verify', '--quiet', ref]))
const files = options.files.length ? givenFiles(options.files) : changedFiles()
const checked = files.filter((file) => CHECKED.test(file))
if (checked.length === 0) {
  console.error('No touched source, JSON, Markdown, YAML, or style files in frontend/ or tests/ui-tests/.')
  process.exit(2)
}

let failed = false
const reports = []
for (const pkg of groupByPackage(checked)) {
  const gates = {}
  if (wanted('format')) gates.format = dprintGate(pkg)
  if (wanted('lint')) gates.lint = eslintGate(pkg)
  if (wanted('typecheck')) gates.typecheck = tscGate(pkg)
  if (wanted('test')) gates.test = jestGate(pkg)
  failed ||= Object.values(gates).some((gate) => gate.status === 'FAIL')
  reports.push(report(pkg, gates))
}
const unchecked = files.length - checked.length
if (unchecked) reports.push(`not checked: ${unchecked} files outside frontend/ and tests/ui-tests/ or of another type`)
console.log(reports.join('\n\n'))
process.exit(failed ? 1 : 0)

function parseArgs(argv) {
  const parsed = { files: [], base: null, scope: 'all' }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--files') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) parsed.files.push(...argv[++i].split(',').filter(Boolean))
    } else if (argv[i] === '--base' || argv[i] === '--scope') {
      parsed[argv[i].slice(2)] = argv[++i]
    } else {
      usage(`Unknown argument: ${argv[i]}`)
    }
  }
  if (!SCOPES.includes(parsed.scope)) usage(`Unknown scope: ${parsed.scope}`)
  return parsed
}

function usage(message) {
  console.error(`${message}\nUsage: validate.mjs [--files <path...>] [--base <ref>] [--scope ${SCOPES.join('|')}]`)
  process.exit(2)
}

function wanted(gate) {
  return options.scope === 'all' || options.scope === gate
}

function givenFiles(paths) {
  return unique(paths.map((file) => toRepoPath(resolve(process.cwd(), file)))).filter((file) => {
    if (existsSync(join(ROOT, file))) return true
    console.error(`warning: skipped a file that does not exist: ${file}`)
    return false
  })
}

function changedFiles() {
  const mergeBase = base ? git(['merge-base', 'HEAD', base]) : null
  if (!mergeBase) console.error(`warning: no merge base with ${base ?? 'develop'}; checking uncommitted changes only`)
  const changed = git(['diff', '--name-only', '--diff-filter=ACMR', mergeBase ?? 'HEAD']) ?? ''
  const untracked = git(['ls-files', '--others', '--exclude-standard']) ?? ''
  return unique(`${changed}\n${untracked}`.split('\n').filter(Boolean))
}

/** Touched files grouped by their nearest package.json. */
function groupByPackage(paths) {
  const packages = new Map()
  for (const file of paths) {
    const dir = findUp(posix.dirname(file), 'package.json')
    if (!packages.has(dir)) {
      const pkg = readJson(join(ROOT, dir, 'package.json'))
      packages.set(dir, { dir, name: pkg.nx?.name ?? pkg.name ?? dir, files: [] })
    }
    packages.get(dir).files.push(file)
  }
  return [...packages.values()]
}

/** dprint for the touched files that do not exist in the base branch yet; existing files keep their formatting. */
function dprintGate(pkg) {
  if (!base) return skip('no base branch (origin/develop or develop) to tell new files from existing ones')
  const created = pkg.files.filter((file) => git(['cat-file', '-e', `${base}:${file}`]) === null)
  if (created.length === 0) return skip(`no file of the package is new against ${base}`)
  const command = `dprint fmt (${created.length} files new against ${base})`
  const result = run('dprint', ['fmt', '--allow-no-files', ...created], '')
  if (result.missing || /dprint['"]? is not recognized|dprint: (command )?not found/.test(result.output)) {
    return skip('dprint is not on PATH')
  }
  if (/No config file found/.test(result.output)) return skip('dprint has no configuration: run `dprint init --global`')
  return result.ok ? pass(command) : fail(command, excerpt(result.output))
}

function eslintGate(pkg) {
  const code = pkg.files.filter((file) => CODE.test(file))
  if (code.length === 0) return skip('no touched TypeScript or JavaScript file')
  const paths = code.map((file) => posix.relative(pkg.dir, file))
  const command = `pnpm exec eslint --fix (${paths.length} files in ${pkg.dir})`
  const result = run('pnpm', ['exec', 'eslint', '--fix', '--format', 'json', ...paths], pkg.dir)
  if (!result.stdout.trimStart().startsWith('[')) {
    if (/Command "eslint" not found/.test(result.output)) return skip(`no ESLint in ${pkg.name}`)
    if (/No ESLint configuration found/.test(result.output)) return skip(`no ESLint config in ${pkg.name}`)
    return fail(command, excerpt(result.output))
  }
  const problems = []
  for (const { filePath, messages } of JSON.parse(result.stdout)) {
    for (const message of messages) {
      // An explicit path that the config ignores is reported as a warning; CI does not lint that file either.
      if (!message.ruleId && message.message.startsWith('File ignored')) continue
      problems.push(`${toRepoPath(filePath)}:${message.line ?? 0}:${message.column ?? 0} ${message.ruleId ?? 'eslint'}: ${message.message}`)
    }
  }
  return problems.length ? fail(command, excerpt(problems.join('\n'))) : pass(command)
}

function tscGate(pkg) {
  const configs = new Map()
  for (const file of pkg.files.filter((f) => TS.test(f))) {
    const dir = findUp(posix.dirname(file), 'tsconfig.json')
    if (dir === null || !(dir === pkg.dir || dir.startsWith(`${pkg.dir}/`))) continue
    configs.set(dir, [...(configs.get(dir) ?? []), file])
  }
  if (configs.size === 0) return skip('no touched TypeScript file under a tsconfig.json of the package')
  const commands = []
  const errors = []
  let elsewhere = 0
  for (const [dir, touched] of configs) {
    const config = posix.relative(pkg.dir, posix.join(dir, 'tsconfig.json'))
    commands.push(`pnpm exec tsc --noEmit -p ${posix.join(pkg.dir, config)}`)
    const heap = (process.env.NODE_OPTIONS ?? '').includes('max-old-space-size') ? {} : { NODE_OPTIONS: '--max-old-space-size=8192' }
    const result = run('pnpm', ['exec', 'tsc', '--noEmit', '-p', config], pkg.dir, heap)
    if (/Command "tsc" not found/.test(result.output)) return skip(`no TypeScript in ${pkg.name}`)
    for (const line of result.output.split(/\r?\n/)) {
      const match = /^(.+?)\(\d+,\d+\): error TS\d+/.exec(line)
      if (!match) continue
      const file = toRepoPath(resolve(ROOT, pkg.dir, match[1]))
      if (touched.includes(file)) errors.push(`${file}${line.slice(match[1].length)}`)
      else elsewhere += 1
    }
    if (!result.ok && errors.length === 0 && elsewhere === 0) errors.push(...excerpt(result.output))
  }
  if (errors.some((line) => /TS2307: Cannot find module '@netcracker\//.test(line))) {
    errors.push(`a workspace dependency is not built: pnpm exec nx run ${pkg.name}:build builds it first`)
  }
  const command = `${commands.join(' && ')}${elsewhere ? ` (${elsewhere} errors in untouched files)` : ''}`
  return errors.length ? fail(command, excerpt(errors.join('\n'))) : pass(command)
}

function jestGate(pkg) {
  const suites = new Map()
  for (const file of pkg.files.filter((f) => CODE.test(f))) {
    const suite = TEST_SUITES.find(({ prefix }) => file.startsWith(prefix)) ?? { dir: pkg.dir, script: 'test' }
    const key = `${suite.dir}:${suite.script}`
    if (!suites.has(key)) suites.set(key, { ...suite, files: [] })
    suites.get(key).files.push(file)
  }
  if (suites.size === 0) return skip('no touched TypeScript or JavaScript file')
  const results = []
  for (const suite of suites.values()) {
    const manifest = readJson(join(ROOT, suite.dir, 'package.json'))
    const script = manifest.scripts?.[suite.script]
    if (!script) {
      results.push(skip(`no ${suite.script} script in ${suite.dir}`))
      continue
    }
    if (!/\bjest\b/.test(script)) {
      results.push(skip(`${suite.script} in ${suite.dir} is not Jest`))
      continue
    }
    const target = `${manifest.nx?.name ?? manifest.name}:${suite.script}`
    const related = suite.files.map((file) => join(ROOT, file))
    const result = run('pnpm', ['exec', 'nx', 'run', target, '--', '--findRelatedTests', ...related, '--passWithNoTests'], '')
    const command = `pnpm exec nx run ${target} -- --findRelatedTests (${suite.files.length} files)`
    const failures = result.output.split(/\r?\n/).filter((line) => /●|^\s*FAIL\s|^Tests:/.test(line))
    results.push(result.ok ? pass(command) : fail(command, excerpt(failures.length ? failures.join('\n') : result.output)))
  }
  const status = ['FAIL', 'PASS', 'SKIP'].find((candidate) => results.some((result) => result.status === candidate))
  return { status, detail: results.map((result) => result.detail).join('; '), lines: results.flatMap((result) => result.lines) }
}

function report(pkg, gates) {
  const lines = [`project: ${pkg.name} (${pkg.dir})`, `files: ${pkg.files.length}`]
  const remaining = []
  for (const [name, gate] of Object.entries(gates)) {
    lines.push(`${name}: ${gate.status} ${gate.detail}`)
    if (gate.status === 'FAIL') remaining.push(...gate.lines.map((line) => `  ${line}`))
  }
  lines.push(remaining.length ? `remaining:\n${remaining.join('\n')}` : 'remaining: none')
  return lines.join('\n')
}

function pass(detail) {
  return { status: 'PASS', detail, lines: [] }
}

function fail(detail, lines) {
  return { status: 'FAIL', detail, lines }
}

function skip(detail) {
  return { status: 'SKIP', detail, lines: [] }
}

/** Runs a command in a repository-relative directory; pnpm is a .cmd shim on Windows, which needs a shell. */
function run(command, args, cwd, env = {}) {
  const windows = process.platform === 'win32'
  const spawnOptions = { cwd: join(ROOT, cwd), encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 256 * 1024 * 1024 }
  const quote = (arg) => (/[\s"&|<>^()]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg)
  const result = windows
    ? spawnSync([command, ...args].map(quote).join(' '), { ...spawnOptions, shell: true })
    : spawnSync(command, args, spawnOptions)
  const stdout = result.stdout ?? ''
  return {
    ok: result.status === 0,
    missing: result.error?.code === 'ENOENT',
    stdout,
    output: `${stdout}\n${result.stderr ?? ''}`.trim(),
  }
}

function findUp(dir, name) {
  for (let current = dir === '.' ? '' : dir; ; current = posix.dirname(current) === '.' ? '' : posix.dirname(current)) {
    if (existsSync(join(ROOT, current, name))) return current
    if (current === '') return null
  }
}

function excerpt(text, max = 15) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  return lines.length <= max ? lines : [...lines.slice(0, max), `... ${lines.length - max} more lines`]
}

function toRepoPath(absolute) {
  return relative(ROOT, absolute).split(sep).join('/')
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

function unique(values) {
  return [...new Set(values)].sort()
}
