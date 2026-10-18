#!/usr/bin/env node
/**
 * Reports whether a pnpm-lock.yaml change moves an installed version or only rewires peer
 * dependencies. One manifest change can rewrite thousands of lockfile lines without moving any.
 *
 *   packages:   the name@version set that is installed; unchanged means nothing downloaded or removed
 *   specifiers: what each workspace project declares
 *   versions:   what each project resolves, compared literally and with peer suffixes stripped;
 *               equal only when stripped means the change is representation, not resolution
 *
 *   node tools/lockfile-diff.js                  # HEAD vs the working tree
 *   node tools/lockfile-diff.js <ref>            # <ref> vs the working tree
 *   node tools/lockfile-diff.js <fileA> <fileB>  # two files
 *   node tools/lockfile-diff.js --self-test      # checks that the tool detects a change
 *
 * Exits 0 whatever it finds. --strict exits 1 when a version moves, for a change that should
 * move none, such as a package-manager upgrade.
 */
const fs = require('fs')
const { execFileSync } = require('child_process')

const argv = process.argv.slice(2)
const strict = argv.includes('--strict')
const args = argv.filter((a) => !a.startsWith('--'))

/**
 * The last YAML document of a lockfile. pnpm 12 writes a first document for the package manager
 * itself, with its own `importers:` key; pnpm 10 wrote only the lockfile.
 */
function lastDocument(text) {
  const docs = text.split('\n').reduce(
    (acc, line) => {
      if (line === '---') acc.push([])
      else acc[acc.length - 1].push(line)
      return acc
    },
    [[]],
  )
  const nonEmpty = docs.filter((d) => d.some((l) => l.trim()))
  return nonEmpty[nonEmpty.length - 1] || []
}

/** Lines of a top-level section, e.g. `packages:` up to the next top-level key. */
function section(lines, name) {
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (start < 0 && lines[i] === name + ':') { start = i + 1; continue }
    if (start >= 0 && /^\S/.test(lines[i]) && lines[i].trim()) return lines.slice(start, i)
  }
  return start < 0 ? [] : lines.slice(start)
}

function parse(text, label) {
  const lines = lastDocument(text)

  // `packages:` and `snapshots:` entries are keys at two spaces. packages: carries no peer
  // suffix; snapshots: does.
  const keys = (name) =>
    new Set(
      section(lines, name)
        .map((l) => l.match(/^ {2}'?(.+?)'?:$/))
        .filter(Boolean)
        .map((m) => m[1]),
    )

  // importers: project at 2 spaces, dependency group at 4, dependency name at 6, and its
  // `specifier:`/`version:` at 8.
  const specifiers = []
  const versions = []
  let project = '?'
  let dep = '?'
  for (const l of section(lines, 'importers')) {
    let m
    if ((m = l.match(/^ {2}(\S.*):$/))) { project = m[1]; continue }
    if ((m = l.match(/^ {6}'?(.+?)'?:$/))) { dep = m[1]; continue }
    if ((m = l.match(/^ {8}specifier: (.+)$/))) { specifiers.push(`${project} ${dep} = ${m[1]}`); continue }
    if ((m = l.match(/^ {8}version: (.+)$/))) { versions.push(`${project} ${dep} -> ${m[1]}`) }
  }

  const parsed = { label, packages: keys('packages'), snapshots: keys('snapshots'), specifiers, versions }

  // Fails rather than report two empty sets as identical.
  if (!parsed.packages.size && !parsed.versions.length) {
    throw new Error(
      `parsed nothing out of ${label}. Either it is not a pnpm lockfile, or its layout moved ` +
        `and this parser needs updating. Refusing to report a comparison of two empty sets.`,
    )
  }
  return parsed
}

const only = (a, b) => [...b].filter((x) => !a.has(x))
const stripPeers = (list) => list.map((s) => s.replace(/\(.*$/, '').trim()).sort()

// execFileSync, not execSync: through cmd.exe, `^` is an escape, and `HEAD^` became `HEAD`.
function read(spec, fallbackToWorkingTree) {
  if (spec && fs.existsSync(spec)) return { text: fs.readFileSync(spec, 'utf8'), label: spec }
  if (spec) {
    const out = execFileSync('git', ['show', `${spec}:pnpm-lock.yaml`], {
      encoding: 'utf8',
      maxBuffer: 1 << 28,
    })
    return { text: out, label: `${spec}:pnpm-lock.yaml` }
  }
  if (!fallbackToWorkingTree) throw new Error('nothing to read')
  return { text: fs.readFileSync('pnpm-lock.yaml', 'utf8'), label: 'pnpm-lock.yaml (working tree)' }
}

function compare(beforeSrc, afterSrc) {
  // Two different sources with identical bytes usually means the wrong file was read.
  if (beforeSrc.label !== afterSrc.label && beforeSrc.text === afterSrc.text) {
    console.log('NOTE: the two inputs are BYTE-IDENTICAL although they name different sources.')
    console.log('      If a difference was expected, suspect how the refs resolved before')
    console.log('      believing the verdict below.')
    console.log('')
  }

  const a = parse(beforeSrc.text, beforeSrc.label)
  const b = parse(afterSrc.text, afterSrc.label)

  const pkgAdded = only(a.packages, b.packages)
  const pkgRemoved = only(b.packages, a.packages)
  const specChanged = JSON.stringify(a.specifiers) !== JSON.stringify(b.specifiers)
  const versionsLiterallyEqual = JSON.stringify(a.versions) === JSON.stringify(b.versions)
  const versionsStrippedEqual = JSON.stringify(stripPeers(a.versions)) === JSON.stringify(stripPeers(b.versions))

  console.log(`before  ${a.label}`)
  console.log(`after   ${b.label}`)
  console.log('')
  console.log(`packages   (installed name@version)  ${a.packages.size} -> ${b.packages.size}` +
    `   added ${pkgAdded.length}, removed ${pkgRemoved.length}`)
  console.log(`snapshots  (with peer suffixes)      ${a.snapshots.size} -> ${b.snapshots.size}`)
  console.log(`specifiers (what projects declare)   ${a.specifiers.length} -> ${b.specifiers.length}` +
    `   ${specChanged ? 'CHANGED' : 'identical'}`)
  console.log(`versions   (what projects resolve)   ${a.versions.length} -> ${b.versions.length}` +
    `   ${versionsLiterallyEqual ? 'identical' : 'differ'}` +
    `, peer suffixes stripped: ${versionsStrippedEqual ? 'identical' : 'DIFFER'}`)

  for (const [title, list] of [['packages added', pkgAdded], ['packages removed', pkgRemoved]]) {
    if (list.length) {
      console.log(`\n${title}:`)
      for (const x of list.slice(0, 40)) console.log('   ' + x)
      if (list.length > 40) console.log(`   … and ${list.length - 40} more`)
    }
  }

  if (specChanged) {
    const added = only(new Set(a.specifiers), b.specifiers)
    const removed = only(new Set(b.specifiers), a.specifiers)
    console.log('\ndeclared specifiers that changed:')
    for (const x of removed.slice(0, 20)) console.log('   - ' + x)
    for (const x of added.slice(0, 20)) console.log('   + ' + x)
  }

  if (!versionsStrippedEqual) {
    const before = new Set(stripPeers(a.versions))
    const moved = stripPeers(b.versions).filter((x) => !before.has(x))
    console.log('\nRESOLVED VERSIONS THAT MOVED (peer suffixes already stripped):')
    for (const x of moved.slice(0, 40)) console.log('   ' + x)
    if (moved.length > 40) console.log(`   … and ${moved.length - 40} more`)
  }

  const versionMoved = pkgAdded.length > 0 || pkgRemoved.length > 0 || !versionsStrippedEqual
  const before = new Set(stripPeers(a.versions))
  const moved = stripPeers(b.versions).filter((x) => !before.has(x))
  const allWorkspaceLinks = moved.length > 0 && moved.every((x) => / -> link:/.test(x))

  console.log('')
  if (pkgAdded.length || pkgRemoved.length) {
    console.log('VERDICT: the installed package set changed — ' +
      `${pkgAdded.length} added, ${pkgRemoved.length} removed.`)
  } else if (!versionsStrippedEqual && allWorkspaceLinks) {
    console.log(`VERDICT: no package added or removed. ${moved.length} workspace link(s) changed —`)
    console.log('         a dependency edge between projects in this repo, not a download.')
  } else if (!versionsStrippedEqual) {
    console.log(`VERDICT: no package added or removed, but ${moved.length} project resolution(s)`)
    console.log('         moved. Read the list above — this is a real change.')
  } else if (!versionsLiterallyEqual || a.snapshots.size !== b.snapshots.size) {
    console.log('VERDICT: representation only. Same packages at the same versions; only the')
    console.log('         recorded peer wiring changed. Large line counts here are expected.')
  } else {
    console.log('VERDICT: no change.')
  }
  return versionMoved
}

// Self-test: the tool must report a version change, ignore a peer-only change, and refuse a
// lockfile it cannot parse.
function selfTest() {
  const base = [
    '---', "lockfileVersion: '9.0'", '', 'importers:', '', '  .:', '    devDependencies:',
    "      lib:", '        specifier: ^1.0.0', '        version: 1.0.0(peer@1)', '',
    'packages:', '', "  lib@1.0.0:", '    resolution: {integrity: sha512-x}', '',
    'snapshots:', '', '  lib@1.0.0(peer@1): {}', '',
  ].join('\n')
  // pnpm 12 shape: a packageManagerDependencies document first, with its own importers:.
  const multiDoc = ['---', "lockfileVersion: '9.0'", '', 'importers:', '', '  .:',
    '    packageManagerDependencies:', '      pnpm:', '        specifier: 12.3.4',
    '        version: 12.3.4', '', 'packages:', '', "  '@pnpm/exe.win32-x64@12.3.4':",
    '    resolution: {integrity: sha512-y}', ''].join('\n') + '\n' + base

  const peerOnly = base.replace('1.0.0(peer@1)', '1.0.0(peer@2)').replace('lib@1.0.0(peer@1): {}', 'lib@1.0.0(peer@2): {}')
  const versionMove = base.replace(/1\.0\.0/g, '1.1.0')

  const run = (x, y) => {
    const log = console.log
    console.log = () => {}
    try { return compare({ text: x, label: 'a' }, { text: y, label: 'b' }) } finally { console.log = log }
  }

  const cases = [
    ['detects a moved version', () => run(base, versionMove) === true],
    ['ignores peer-only churn', () => run(base, peerOnly) === false],
    ['reads the LAST document of a multi-document lockfile',
      () => parse(multiDoc, 'm').specifiers.length === 1 && parse(multiDoc, 'm').specifiers[0].includes('lib')],
    ['refuses input it cannot parse', () => {
      try { parse('nothing here\n', 'junk'); return false } catch { return true }
    }],
  ]

  let ok = true
  for (const [name, fn] of cases) {
    let pass = false
    try { pass = fn() } catch (e) { pass = false }
    console.log(`  ${pass ? 'pass' : 'FAIL'}  ${name}`)
    ok = ok && pass
  }
  console.log(ok ? '\nself-test passed' : '\nSELF-TEST FAILED')
  process.exit(ok ? 0 : 1)
}

if (argv.includes('--self-test')) selfTest()

let moved = false
if (args.length >= 2) moved = compare(read(args[0]), read(args[1]))
else if (args.length === 1) moved = compare(read(args[0]), read(null, true))
else moved = compare(read('HEAD'), read(null, true))

process.exit(strict && moved ? 1 : 0)
