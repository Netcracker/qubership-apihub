// Builds test-plan/results.csv, the sheet QA records the results in: one row per case of every case list, with the
// operations to open and the screenshot baselines resolved from samples/packages/manifest.json. Usage, from the
// repository root, after packing/pack.mjs:
//
//   node .agents/skills/api-doc-viewer-feature-test-plan/scripts/results-sheet.mjs --qa qa-<feature>
//
// The case lists, the NF rule, and the lists whose references are checked come from the plan's config
// (`caseLists`, `nfCases`, `checkedCaseLists`). The Result, Tester, Date, and Note columns of an existing
// results.csv are kept, matched by the case ID, so the sheet can be rebuilt after the case lists change. A
// backticked case ID in a checked case list's "Open" column that is not in the manifest stops the build (a typo).
import fs from 'node:fs'
import path from 'node:path'
import { QA_ROOT, loadConfig } from './packing/lib.mjs'

const SHEET = path.join(QA_ROOT, 'test-plan', 'results.csv')
const MANIFEST = path.join(QA_ROOT, 'samples', 'packages', 'manifest.json')
const config = await loadConfig()

// The case lists, in the order of the config; a folder stands for its Markdown files, sorted by name.
const SOURCES = config.caseLists.flatMap(entry => {
  const full = path.join(QA_ROOT, entry)
  if (!fs.existsSync(full)) throw new Error(`Case list ${entry} does not exist`)
  if (!fs.statSync(full).isDirectory()) return [entry]
  return fs.readdirSync(full).filter(f => f.endsWith('.md') && f !== 'README.md').sort().map(f => `${entry}/${f}`)
})

const RESULT_COLUMNS = ['Result', 'Tester', 'Date', 'Note']
const COLUMNS = ['Id', 'Area', 'Case', 'Cells', 'NF', 'Open', 'Operations', 'Steps', 'Expected', 'Baselines', 'Source',
  ...RESULT_COLUMNS]

// Case IDs of a plan: HDR-P-01, ISS-07, JTY-D-12, STY-01.
const CASE_ID = /^[A-Z][A-Z0-9]{1,3}(?:-[A-Z])?-\d{2}$/
const NF_IDS = config.nfCases
const CHECKED_SOURCES = config.checkedCaseLists ?? /^test-plan\//

const manifest = new Map(JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).map(c => [c.id, c]))
const packageNames = new Set([...manifest.values()].map(c => c.package))

const splitRow = line => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(cell => cell.trim())
const plain = text => text.replace(/\\\|/g, '|').replace(/<br>/g, '; ')

function* caseRows(file) {
  const lines = fs.readFileSync(path.join(QA_ROOT, file), 'utf8').split(/\r?\n/)
  let heading = ''
  let header
  for (const line of lines) {
    if (/^#{1,4} /.test(line)) heading = line.replace(/^#+ /, '').replace(/`/g, '')
    if (!line.startsWith('|')) {
      header = undefined
      continue
    }
    const cells = splitRow(line)
    if (!header) {
      header = cells.map(cell => cell.toLowerCase())
      continue
    }
    if (cells[0].startsWith('---') || !CASE_ID.test(cells[0])) continue
    const column = (...names) => {
      const index = names.map(name => header.indexOf(name)).find(i => i >= 0)
      return index === undefined ? '' : cells[index] ?? ''
    }
    const caseColumn = ['case', 'issue', 'check'].find(name => header.includes(name))
    yield {
      id: cells[0],
      area: heading,
      case: column(caseColumn),
      cells: column('cells', 'layout'),
      open: column('open', 'operations', 'sample', 'host', 'package'),
      steps: column('steps', ...(caseColumn === 'check' ? [] : ['check'])),
      expected: column('expected', 'record'),
      source: file,
    }
  }
}

// Package case IDs named in the "Open" column, resolved through the manifest.
function resolve(row) {
  const tokens = [...row.open.matchAll(/`([^`]+)`/g)].map(match => match[1])
  const cases = []
  const unknown = []
  for (const token of tokens) {
    if (manifest.has(token)) cases.push(manifest.get(token))
    else if (!packageNames.has(token) && /^[a-z][a-z0-9]*-[\w.-]+$/.test(token) && CHECKED_SOURCES.test(row.source)) {
      unknown.push(token)
    }
  }
  return { cases, unknown }
}

// ----- CSV -----

const quote = value => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field || row.length) rows.push([...row, field])
  return rows
}

function previousResults() {
  if (!fs.existsSync(SHEET)) return new Map()
  const [header, ...rows] = parseCsv(fs.readFileSync(SHEET, 'utf8').replace(/^﻿/, ''))
  const at = name => header.indexOf(name)
  return new Map(rows.filter(r => r[at('Id')]).map(r =>
    [r[at('Id')], Object.fromEntries(RESULT_COLUMNS.map(name => [name, at(name) >= 0 ? r[at(name)] ?? '' : '']))]))
}

// ----- Build -----

const previous = previousResults()
const seen = new Set()
const problems = []
const lines = [COLUMNS.join(',')]
for (const file of SOURCES) {
  for (const row of caseRows(file)) {
    if (seen.has(row.id)) {
      problems.push(`${row.id} is listed twice (${file})`)
      continue
    }
    seen.add(row.id)
    const { cases, unknown } = resolve(row)
    for (const token of unknown) problems.push(`${row.id} (${file}): \`${token}\` is not a case of any package`)
    const kept = previous.get(row.id) ?? {}
    const values = {
      Id: row.id,
      Area: row.area,
      Case: plain(row.case),
      Cells: row.cells,
      NF: NF_IDS.test(row.id) || /\bNF\b/.test(row.expected) ? 'yes' : '',
      Open: plain(row.open),
      Operations: cases.map(c => `${c.package}: ${c.operations.join(' ') || c.document}`).join('\n'),
      Steps: plain(row.steps),
      Expected: plain(row.expected),
      // A composite case (builders/composite.mjs) has the baselines of its members.
      Baselines: [...new Set(cases.flatMap(c => (c.members ? c.members.map(m => m.baseline) : [c.baseline])))]
        .filter(Boolean).join('\n'),
      Source: row.source,
      Result: kept.Result || 'Not tested',
      Tester: kept.Tester ?? '',
      Date: kept.Date ?? '',
      Note: kept.Note ?? '',
    }
    lines.push(COLUMNS.map(name => quote(values[name])).join(','))
  }
}
const dropped = [...previous.entries()].filter(([id, r]) => !seen.has(id) && r.Result && r.Result !== 'Not tested')
for (const [id] of dropped) problems.push(`${id} has a result in results.csv but is no longer in any case list`)

if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
// The byte order mark makes Excel read the file as UTF-8.
fs.writeFileSync(SHEET, `﻿${lines.join('\r\n')}\r\n`)
console.log(`${SHEET}: ${lines.length - 1} cases`)
