#!/usr/bin/env node
/*
 * Validate the artifact, not the exit code.
 *
 * Two silent no-ops sit directly under the Go job, and this project has already paid for both:
 *
 *   `nx run-many` over an empty project list exits 0 having run nothing.
 *   `go build ./...` over a path that matches no package exits 0 having built nothing.
 *
 * A green `go` job therefore proves less than it appears to. This asserts that every project
 * the job claimed to build actually left something behind at the path it declared.
 *
 * The library exemption is NOT a name in this file. commons-go declares `outputs: []` because
 * it emits no binary, and this reads that declaration back out of the project graph — which is
 * also where targetDefaults' `{projectRoot}/dist` comes from for the five applications that do
 * not declare one. A seventh Go module is covered without editing this file; a seventh Go
 * module added to a hardcoded list is not.
 *
 * It reads the graph nx already writes rather than shelling out per project, so it is one file
 * read and no subprocesses, and it can be run against a saved graph while debugging.
 *
 * Usage:  node tools/ci/go-artifacts-check.js <graph.json> <comma-separated project names>
 */
const fs = require('node:fs')
const path = require('node:path')

const [graphPath, namesRaw] = process.argv.slice(2)

const names = (namesRaw || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// An empty argument is the exact failure this file exists to catch, so it is an error and
// never a quiet success.
if (!graphPath || names.length === 0) {
  console.error('usage: go-artifacts-check.js <graph.json> <projects>')
  console.error('an empty project list is not a passing check')
  process.exit(1)
}

const graph = JSON.parse(fs.readFileSync(path.resolve(graphPath), 'utf8')).graph

let status = 0
let binaries = 0

for (const name of names) {
  const node = graph.nodes[name]
  if (!node) {
    console.error(`  ${name}: not in the project graph`)
    status = 1
    continue
  }

  // @nx-go/nx-go gives a build target only to a project it recognises as an application, by
  // finding `package main` in one of a few conventional file names. An application it does not
  // recognise gets NO build target, and `nx run-many -t build` skips a project without the
  // target silently. So a missing target is a failure for an application and expected for a
  // library.
  const build = node.data.targets && node.data.targets.build
  if (!build) {
    if (node.data.projectType === 'library') {
      console.log(`  ${name}: library, no build target, nothing to find`)
    } else {
      console.error(`  ${name}: ${node.data.projectType || 'untyped'} project with no build target — nothing was built`)
      status = 1
    }
    continue
  }

  const outputs = build.outputs || []
  if (outputs.length === 0) {
    console.log(`  ${name}: declares no build output, nothing to find`)
    continue
  }

  // Two output shapes. A directory (`{projectRoot}/dist`) holds binaries. nx-go's executor
  // writes one FILE at `dist/<projectRoot>`, with `.exe` appended when building for Windows,
  // declared as that path, its `.exe` twin, or the plugin's own `dist/{projectRoot}*` glob.
  //
  // A file's name must match EXACTLY, extension aside. Matching the glob as a prefix credited
  // `agent` with `dist/backend/agents-backend.exe`, so agent would have passed with its own
  // binary missing. And the matches are collected as a set across all of a project's outputs:
  // the path and its `.exe` twin name the same binary, which must count once.
  const found = new Set()
  const looked = []
  for (const spec of outputs) {
    const resolved = spec.replace('{projectRoot}', node.data.root).replace('{workspaceRoot}', '.')
    const stem = resolved.replace(/\*$/, '')
    const isDir = !resolved.endsWith('*') && fs.existsSync(stem) && fs.statSync(stem).isDirectory()
    const dir = isDir ? stem : path.dirname(stem)
    const binary = isDir ? null : path.basename(stem).replace(/\.exe$/, '')
    looked.push(isDir ? `${dir}/` : path.join(dir, `${binary}[.exe]`))
    if (!fs.existsSync(dir)) continue

    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (d.isFile() && (binary === null || d.name === binary || d.name === `${binary}.exe`)) {
        found.add(path.join(dir, d.name))
      }
    }
  }

  const files = [...found].sort()
  if (files.length === 0) {
    console.error(`  ${name}: nothing at ${[...new Set(looked)].join(' or ')}`)
    status = 1
    continue
  }

  // A zero-byte file is a plausible way for a partial build to look finished.
  const empty = files.filter((f) => fs.statSync(f).size === 0)
  if (empty.length > 0) {
    console.error(`  ${name}: ${empty.join(', ')} is zero bytes`)
    status = 1
    continue
  }

  binaries += files.length
  console.log(
    `  ${name}: ` + files.map((f) => `${path.basename(f)} ${(fs.statSync(f).size / 1e6).toFixed(1)} MB`).join(', '),
  )
}

if (status === 0) {
  console.log(`${binaries} binaries across ${names.length} projects`)
}
process.exit(status)
