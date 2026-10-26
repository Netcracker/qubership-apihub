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
 * The api-processor version that a build reports: `<package.json version>+<build id>`.
 *
 * The build id is a hash of the sources of this package and of every workspace package it depends on. It is the
 * semver build metadata, so a release bump still reads as a new version, and two builds of the same sources
 * report the same string wherever they run. Without it, a branch that changes the processor but not its version
 * reports the same version as the release, and the UI cannot tell that a published package version was built by a
 * different processor.
 *
 * Both consumers read the stamped value from this package's build output: the build-task-consumer reports it into
 * every package version it builds, and the UI reads it into `version.json`. They agree because they read one file.
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
])
const IGNORED_FILE = /(\.md|\.map|\.tsbuildinfo|\.log)$|(^|\.)(unit-)?test\.[cm]?[jt]sx?$|^LICENSE$/

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

/** The package and the workspace packages it depends on, transitively, sorted by name. */
function sourcePackages(root, packageDir) {
  const known = workspacePackages(root)
  const result = new Map()
  const visit = dir => {
    const manifest = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf-8'))
    if (result.has(manifest.name)) {
      return
    }
    result.set(manifest.name, dir)
    for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
      if (String(range).startsWith('workspace:')) {
        if (!known.has(name)) {
          throw new Error(`${manifest.name} depends on ${name}, which is not a workspace package`)
        }
        visit(known.get(name))
      }
    }
  }
  visit(packageDir)
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

export function computeBuildId(packageDir = PACKAGE_DIR) {
  const hash = createHash('sha256')
  for (const [name, dir] of sourcePackages(findWorkspaceRoot(packageDir), packageDir)) {
    hash.update(`package ${name}\0`)
    for (const file of listFiles(dir)) {
      // Line endings differ between a Windows checkout and a Linux one; the build output does not.
      const content = readFileSync(path.join(dir, file), 'latin1').replace(/\r\n/g, '\n')
      hash.update(`${file}\0${content}\0`)
    }
  }
  return hash.digest('hex').slice(0, BUILD_ID_LENGTH)
}

export function stampedVersion(packageDir = PACKAGE_DIR) {
  const { version } = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf-8'))
  return `${version}+${computeBuildId(packageDir)}`
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(stampedVersion())
}
