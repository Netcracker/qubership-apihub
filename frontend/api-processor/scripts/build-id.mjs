/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * The version that a build reports: `<package.json version>+<build id>`. Used for api-processor and for the UI apps.
 *
 * The build id is a hash of the sources of the package and of every workspace package it depends on. It is the
 * semver build metadata, so a release bump still reads as a new version, and two builds of the same sources
 * report the same string wherever they run. Without it, a branch that changes the processor but not its version
 * reports the same version as the release, and the UI cannot tell that a published package version was built by a
 * different processor.
 *
 * api-processor: the build-task-consumer reports the stamped value into every package version it builds, and the UI
 * reads it into `version.json`. They agree because they read one build output. A UI app: its bundle and its
 * `version.json` get the value from one build, and the page reloads when the two differ.
 */

import { createHash } from 'crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BUILD_ID_LENGTH = 10

// Directories and files that cannot change what the package builds or does at runtime.
const IGNORED_DIRECTORIES = new Set([
  'node_modules', 'dist', 'coverage', 'test', 'tests', 'docs', 'agent-packages', '.git', '.idea', 'temp', 'storybook-static',
  'stories', '.storybook', '.jest', '.vite', '.nx', 'dist-showcase',
  // Screenshot and integration tests of the viewer libraries: tens of megabytes that no build reads.
  'it', '__image_snapshots__', '__snapshots__',
])
const IGNORED_FILE = /(\.md|\.map|\.tsbuildinfo|\.log)$|(^|\.)(unit-)?test\.[cm]?[jt]sx?$|\.stories\.[jt]sx?$|^LICENSE$/

function findWorkspaceRoot(from) {
  let dir = from
  while (!existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(dir)
    if (parent === dir) {
      throw new Error(`pnpm-workspace.yaml not found above ${from}`)
    }
    dir = parent
  }
  return dir
}

/** Package name -> directory, for the packages of `frontend/*` and `frontend/*` + `/packages/*`. */
function workspacePackages(root) {
  const packages = new Map()
  const frontend = path.join(root, 'frontend')
  for (const group of readdirSync(frontend, { withFileTypes: true })) {
    if (!group.isDirectory()) {
      continue
    }
    const candidates = [path.join(frontend, group.name)]
    const nested = path.join(frontend, group.name, 'packages')
    if (existsSync(nested)) {
      candidates.push(...readdirSync(nested, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => path.join(nested, e.name)))
    }
    for (const dir of candidates) {
      const manifest = path.join(dir, 'package.json')
      if (existsSync(manifest)) {
        packages.set(JSON.parse(readFileSync(manifest, 'utf-8')).name, dir)
      }
    }
  }
  return packages
}

/**
 * The package and the workspace packages it depends on, transitively, sorted by name. Only the package itself
 * contributes its devDependencies: a library reaches the bundle through its build output, not through its own tools.
 */
function sourcePackages(root, packageDir, includeDevDependencies) {
  const known = workspacePackages(root)
  const result = new Map()
  const visit = (dir, isRoot) => {
    const manifest = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf-8'))
    if (result.has(manifest.name)) {
      return
    }
    result.set(manifest.name, dir)
    const workspaceNames = kind => Object.entries(manifest[kind] ?? {})
      .filter(([, range]) => String(range).startsWith('workspace:'))
      .map(([name]) => name)
    for (const name of workspaceNames('dependencies')) {
      if (!known.has(name)) {
        throw new Error(`${manifest.name} depends on ${name}, which is not a workspace package`)
      }
      visit(known.get(name), false)
    }
    // A development tool outside frontend/ (a test environment, for example) is not part of the bundle.
    for (const name of isRoot && includeDevDependencies ? workspaceNames('devDependencies') : []) {
      if (known.has(name)) {
        visit(known.get(name), false)
      }
    }
  }
  visit(packageDir, true)
  return [...result.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function listFiles(dir, base = dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        files.push(...listFiles(full, base))
      }
    } else if (statSync(full).isFile() && !IGNORED_FILE.test(entry.name)) {
      files.push(path.relative(base, full).split(path.sep).join('/'))
    }
  }
  return files
}

/** `includeDevDependencies`: an app bundles its workspace devDependencies, a library does not. */
export function computeBuildId(packageDir = PACKAGE_DIR, { includeDevDependencies = false } = {}) {
  const hash = createHash('sha256')
  for (const [name, dir] of sourcePackages(findWorkspaceRoot(packageDir), packageDir, includeDevDependencies)) {
    hash.update(`package ${name}\0`)
    for (const file of listFiles(dir)) {
      // Line endings differ between a Windows checkout and a Linux one; the build output does not.
      const content = readFileSync(path.join(dir, file), 'latin1').replace(/\r\n/g, '\n')
      hash.update(`${file}\0${content}\0`)
    }
  }
  return hash.digest('hex').slice(0, BUILD_ID_LENGTH)
}

export function stampedVersion(packageDir = PACKAGE_DIR, options = {}) {
  const { version } = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf-8'))
  return `${version}+${computeBuildId(packageDir, options)}`
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(stampedVersion())
}
