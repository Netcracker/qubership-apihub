#!/usr/bin/env node
/**
 * Render `nx release`'s output as a GitHub job summary.
 *
 * WHY THIS IS NOT `grep`
 *
 * The first version piped the log through grep straight into the summary and it was
 * unreadable: Nx colours its output even when stdout is not a terminal, so the summary showed
 * `ESC[1mESC[31mapi-doc-viewer` where a component name belonged.
 *
 * Stripping colour makes it legible but not useful. The raw log prints each manifest write
 * TWICE for a component that is both versioned and bumped as a dependent, and interleaves the
 * components that did nothing with the ones that did.
 *
 * HOW "dependency only" IS DECIDED, AND WHY NOT THE OBVIOUS WAY
 *
 * Nx says it outright in the version phase:
 *
 *   apispec-view ❓ Applied semver relative bump "patch", because a dependency was bumped, …
 *
 * Tempting, and wrong as a primary signal. Nx runs the version logic twice for a dependent and
 * the SECOND line reports the same bump as "derived from conventional commits data", so both
 * reasons appear for one component. Worse, a component that has its own fix AND a bumped
 * dependency would also carry the dependency line, and calling that "dependency only" would be
 * false.
 *
 * So the decision is read from the release notes Nx generated, which assert it directly. A
 * dependency-only release has exactly one section and it is Updated Dependencies:
 *
 *   + ## 3.4.5 (2026-09-11)
 *   +
 *   + ### 🧱 Updated Dependencies
 *   +
 *   + - Updated api-diff to 4.0.0
 *
 * against a real change, which carries Features, Fixes or Breaking Changes. The "because a
 * dependency was bumped" line is kept only as a fallback for when no notes were emitted.
 *
 * Colour is stripped here rather than suppressed with NO_COLOR: the live Actions log renders it
 * fine and it helps there.
 *
 * Usage:  nx release … | tee log ; node tools/ci/release-summary.js <log> <mode> >> $GITHUB_STEP_SUMMARY
 *         <mode> is `dry run` or `real`, reported rather than inferred.
 *
 *   --self-test   run the assertions at the bottom and exit
 */
const fs = require('fs')

const stripAnsi = (s) => s.replace(/[[0-9;]*[A-Za-z]/g, '')

function parse(raw) {
  const lines = stripAnsi(raw).split(/\r?\n/)
  const current = new Map()
  const next = new Map()
  const dependencyBumpSeen = new Set()
  const unchanged = []
  const releases = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    let m = line.match(/^(\S+)\s+\S*\s*Resolved the current version as (\S+)\s+from/u)
    if (m) {
      current.set(m[1], m[2])
      continue
    }
    m = line.match(/^(\S+)\s+\S*\s*New version (\S+)\s+written to manifest/u)
    if (m) {
      next.set(m[1], m[2])
      continue
    }
    if (/because a dependency was bumped/.test(line)) {
      const who = line.match(/^(\S+)\s/u)
      if (who) dependencyBumpSeen.add(who[1])
      continue
    }
    m = line.match(/^(\S+)\s+\S*\s*No changes were detected/u)
    if (m) {
      unchanged.push(m[1])
      continue
    }
    m = line.match(/^CREATE (https:\/\/\S+\/releases\/tag\/(\S+?))(\s+\[dry-run\])?$/)
    if (m) {
      // The notes follow, each line prefixed with `+`, after a blank line. Collect until a
      // line that is neither blank nor a body line.
      const body = []
      for (let j = i + 1; j < lines.length; j++) {
        const b = lines[j]
        if (/^\+/.test(b)) {
          body.push(b.replace(/^\+\s?/, ''))
          continue
        }
        if (b.trim() === '' && body.length === 0) continue // the gap before the body
        break
      }
      releases.push({ url: m[1], tag: m[2], dryRun: Boolean(m[3]), body, sections: sectionsOf(body) })
    }
  }
  return { current, next, unchanged, releases, dependencyBumpSeen }
}

/** The `### …` headings in a release body, trimmed of emoji and spacing. */
const sectionsOf = (body) =>
  body
    .filter((l) => /^#{2,4}\s/.test(l) && !/^##\s/.test(l))
    .map((l) => l.replace(/^#{3,4}\s*/, '').replace(/[^\w\s]/gu, '').trim())
    .filter(Boolean)

/** tag is `{projectName}/{version}`; component names contain no slash, so split on the last. */
const componentOf = (tag) => tag.slice(0, tag.lastIndexOf('/')) || tag

/**
 * The notes, nested under the per-component `###` heading this summary already prints.
 *
 * Nx's body opens with its own version heading, `## 3.4.5 (date)` or `# 4.0.0 (date)`, which
 * repeats the heading above it, so that line goes. The section headings inside are `###`, which
 * would render as siblings of the component rather than children, so they are demoted one
 * level. Everything else is passed through untouched: it is Nx's markdown and mangling it is
 * how a summary starts disagreeing with the release it describes.
 */
function renderNotes(body) {
  const out = []
  let seenContent = false
  for (const line of body) {
    if (!seenContent && /^#{1,2}\s/.test(line)) continue // Nx's own version heading
    if (!seenContent && line.trim() === '') continue // and the blank after it
    seenContent = true
    out.push(line.replace(/^###(#*)\s/, '####$1 '))
  }
  while (out.length && out[out.length - 1].trim() === '') out.pop()
  return out
}

function bumpKind(from, to) {
  const a = String(from).split('.').map(Number)
  const b = String(to).split('.').map(Number)
  if (a.length < 3 || b.length < 3 || a.some(isNaN) || b.some(isNaN)) return 'unknown'
  if (b[0] !== a[0]) return 'major'
  if (b[1] !== a[1]) return 'minor'
  if (b[2] !== a[2]) return 'patch'
  return 'none'
}

function render({ current, next, unchanged, releases, dependencyBumpSeen }, mode) {
  const out = []
  const say = (s = '') => out.push(s)

  const byComponent = new Map()
  for (const r of releases) byComponent.set(componentOf(r.tag), r)

  say('## Release finish')
  say()
  say(`Mode: ${mode}`)
  say()

  if (!next.size) {
    say('**Nothing to release.** No component had a conventional commit that resolves a bump')
    say(`since its last \`component/version\` tag. ${unchanged.length} checked.`)
    return out.join('\n') + '\n'
  }

  say('| component | from | to | bump |')
  say('|---|---|---|---|')
  for (const [component, to] of [...next].sort()) {
    const from = current.get(component) ?? 'unknown'
    let bump = bumpKind(from, to)
    const release = byComponent.get(component)
    const depOnly = release
      ? release.sections.length > 0 && release.sections.every((s) => /Updated Dependencies/i.test(s))
      : dependencyBumpSeen.has(component)
    if (depOnly) bump += ' (dependency only)'
    say(`| ${component} | ${from} | ${to} | ${bump} |`)
  }

  if (releases.length) {
    say()
    say(`## Release notes${releases.some((r) => r.dryRun) ? ' (not published — dry run)' : ''}`)
    for (const r of [...releases].sort((a, b) => a.tag.localeCompare(b.tag))) {
      say()
      say(`### [${r.tag}](${r.url})`)
      say()
      const notes = renderNotes(r.body)
      if (notes.length) out.push(...notes)
      else say('_No notes were generated._')
    }
  }
  return out.join('\n') + '\n'
}

if (process.argv[2] === '--self-test') {
  const assert = require('node:assert')
  const E = String.fromCharCode(27)
  const log = [
    `${E}[1m${E}[31mapi-doc-viewer${E}[39m${E}[22m 🏷️  Resolved the current version as 3.4.4 from git tag "x", based on y`,
    `api-doc-viewer 📄 Resolved the specifier as "patch" using git history and the conventional commits standard`,
    `api-doc-viewer ❓ Applied semver relative bump "patch", because a dependency was bumped, to get new version 3.4.5`,
    `api-doc-viewer ✍️  New version 3.4.5 written to manifest: a/package.json`,
    `api-doc-viewer ❓ Applied semver relative bump "patch", derived from conventional commits data, to get new version 3.4.5`,
    `api-doc-viewer ✍️  New version 3.4.5 written to manifest: a/package.json`,
    `api-diff 🏷️  Resolved the current version as 3.5.0 from git tag "x", based on y`,
    `api-diff ❓ Applied semver relative bump "major", derived from conventional commits data, to get new version 4.0.0`,
    `api-diff ✍️  New version 4.0.0 written to manifest: b/package.json`,
    `ddlapi 🚫 No changes were detected using git history and the conventional commits standard`,
    `CREATE https://github.com/o/r/releases/tag/api-doc-viewer/3.4.5 [dry-run]`,
    ``,
    `+ ## 3.4.5 (2026-09-11)`,
    `+`,
    `+ ### 🧱 Updated Dependencies`,
    `+`,
    `+ - Updated api-diff to 4.0.0`,
    ``,
    `CREATE https://github.com/o/r/releases/tag/api-diff/4.0.0 [dry-run]`,
    ``,
    `+ # 4.0.0 (2026-09-11)`,
    `+`,
    `+ ### 🚀 Features`,
    `+`,
    `+ - **api-diff:** something ([abc](url))`,
    `+`,
    `+ ### ⚠️  Breaking Changes`,
    `+`,
    `+ - **api-diff:** something ([abc](url))`,
  ].join('\n')

  const p = parse(log)
  assert.strictEqual(p.next.get('api-doc-viewer'), '3.4.5', 'colour must not defeat the match')
  assert.strictEqual(p.next.size, 2, 'the repeated manifest write must collapse to one row')
  assert.strictEqual(p.releases.length, 2, 'both release blocks must be found')
  assert.strictEqual(componentOf('api-doc-viewer/3.4.5'), 'api-doc-viewer', 'a slash in the tag must split correctly')

  const md = render(p, 'dry run')
  assert.ok(!md.includes(E), 'no escape sequence may reach the summary')
  assert.ok(md.includes('| component | from | to | bump |'), 'header must say component')
  assert.ok(
    md.includes('| api-diff | 3.5.0 | 4.0.0 | major |'),
    'a real change is not marked dependency only:\n' + md,
  )
  assert.ok(
    md.includes('| api-doc-viewer | 3.4.4 | 3.4.5 | patch (dependency only) |'),
    'a dependents-only release is marked:\n' + md,
  )
  assert.ok(!/\| [^|]*`/.test(md), 'no backticks in table cells')
  assert.ok(!md.includes('unchanged.'), 'unchanged components are not listed')

  // api-diff carries no "because a dependency was bumped" line, so the fallback must agree
  // with the notes rather than contradict them.
  assert.strictEqual(p.dependencyBumpSeen.has('api-diff'), false)
  assert.strictEqual(p.dependencyBumpSeen.has('api-doc-viewer'), true)

  // Fallback path: same data with the release blocks removed.
  const noNotes = parse(log.split('CREATE')[0])
  const md2 = render(noNotes, 'real')
  assert.ok(md2.includes('| api-doc-viewer | 3.4.4 | 3.4.5 | patch (dependency only) |'), 'fallback must still mark it')
  assert.ok(md2.includes('| api-diff | 3.5.0 | 4.0.0 | major |'), 'fallback must not over-mark')

  assert.ok(render(parse('x 🚫 No changes were detected using git'), 'real').includes('Nothing to release'))
  console.log('release-summary self-test: all assertions passed')
  process.exit(0)
}

const [logPath, mode] = process.argv.slice(2)
if (!logPath) {
  console.error('usage: release-summary.js <log> <mode>')
  process.exit(2)
}
process.stdout.write(render(parse(fs.readFileSync(logPath, 'utf8')), mode || 'real'))
