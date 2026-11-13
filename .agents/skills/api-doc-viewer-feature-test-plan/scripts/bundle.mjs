// Bundles a QA plan for its one-time hand-over to QA: a copy of the plan folder without what only rebuilds it
// (config/, tools/, earlier bundles), with every screenshot baseline that test-plan/results.csv names copied into
// baselines/ and the sheet pointing at those copies, packed into a zip. QA needs nothing else from the repository.
// Usage, from the repository root, after results-sheet.mjs:
//
//   node .agents/skills/api-doc-viewer-feature-test-plan/scripts/bundle.mjs --qa qa-<feature> [--out <dir>]
//
// Writes <out>/qa-<feature>.zip (<out> defaults to the parent folder of the plan) and prints its size. The zip is
// made with `tar -a` (bsdtar: Windows, macOS) or, where tar cannot write zip, with `zip`.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { QA_ROOT, REPO_ROOT, toPosix } from './packing/lib.mjs'

const outIndex = process.argv.indexOf('--out')
const OUT = path.resolve(outIndex >= 0 ? process.argv[outIndex + 1] : path.dirname(QA_ROOT))
const NAME = path.basename(QA_ROOT)
const EXCLUDED = new Set(['config', 'tools'])
const SHEET = path.join('test-plan', 'results.csv')

const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-bundle-'))
const target = path.join(stage, NAME)

// The plan folder, without config/, tools/, and zip files.
fs.cpSync(QA_ROOT, target, {
  recursive: true,
  filter: source => {
    const relative = toPosix(path.relative(QA_ROOT, source))
    return !EXCLUDED.has(relative.split('/')[0]) && !relative.endsWith('.zip')
  },
})

// Every baseline the sheet names, copied to baselines/<suite>/<file>; the sheet then names the copies.
let sheet = fs.readFileSync(path.join(QA_ROOT, SHEET), 'utf8')
const baselines = new Set(sheet.match(/frontend\/api-doc-viewer\/[^\s",]+\.png/g) ?? [])
for (const baseline of baselines) {
  const parts = baseline.split('/')
  const copy = `baselines/${parts.at(-3)}/${parts.at(-1)}`
  fs.mkdirSync(path.join(target, path.dirname(copy)), { recursive: true })
  fs.copyFileSync(path.join(REPO_ROOT, baseline), path.join(target, copy))
  sheet = sheet.split(baseline).join(copy)
}
fs.writeFileSync(path.join(target, SHEET), sheet)
fs.writeFileSync(path.join(target, 'baselines', 'README.md'),
  '# Baselines\n\nThe screenshot baselines that `test-plan/results.csv` names, copied from\n' +
  '`frontend/api-doc-viewer/packages/api-doc-viewer/src/it/<suite>/__image_snapshots__/` when the plan was bundled.\n')

fs.mkdirSync(OUT, { recursive: true })
const zip = path.join(OUT, `${NAME}.zip`)

// bsdtar writes zip with -a; GNU tar (first on the PATH of Git Bash) does not, and reads "C:" as a remote host.
// Each candidate runs in the stage folder; the first that writes a real zip wins.
const candidates = [
  ...(process.platform === 'win32'
    ? [[path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'), ['-a', '-c', '-f', zip, NAME]]]
    : []),
  ['bsdtar', ['-a', '-c', '-f', zip, NAME]],
  ['tar', ['-a', '-c', '-f', zip, NAME]],
  ['zip', ['-qr', zip, NAME]],
]
const written = candidates.some(([command, args]) => {
  fs.rmSync(zip, { force: true })
  try {
    execFileSync(command, args, { cwd: stage, stdio: 'pipe' })
    return fs.readFileSync(zip).subarray(0, 2).toString() === 'PK'
  } catch {
    return false
  }
})
fs.rmSync(stage, { recursive: true, force: true })
if (!written) {
  console.error('No zip tool found: install zip (Linux) or bsdtar')
  process.exit(1)
}
console.log(`${zip}: ${(fs.statSync(zip).size / 1048576).toFixed(1)} MB, ${baselines.size} baselines`)
