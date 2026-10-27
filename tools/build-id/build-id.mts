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
 *
 * This package knows the layout of the workspace (`frontend/*` and `frontend/*` + `/packages/*`) and nothing about
 * any one consumer. Usage from the command line: `node build-id.mts <package dir>`.
 *
 * It is TypeScript that Node runs as it is (type stripping), so it uses no syntax that needs a transform.
 */

import { createHash } from 'node:crypto'
import type { Dirent } from 'node:fs'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

export type BuildIdOptions = {
  /** Follow the workspace packages in `devDependencies` of the package itself too. An app bundles them. */
  includeDevDependencies?: boolean
}

type PackageManifest = {
  name: string
  version: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const BUILD_ID_LENGTH = 10

// Directories and files that cannot change what the package builds or does at runtime.
const IGNORED_DIRECTORIES = new Set([
  'node_modules', 'dist', 'coverage', 'test', 'tests', 'docs', 'agent-packages', '.git', '.idea', 'temp', 'storybook-static',
  'stories', '.storybook', '.jest', '.vite', '.nx', 'dist-showcase',
  // Screenshot and integration tests of the viewer libraries: tens of megabytes that no build reads.
  'it', '__image_snapshots__', '__snapshots__',
])
const IGNORED_FILE = /(\.md|\.map|\.tsbuildinfo|\.log)$|(^|\.)(unit-)?test\.[cm]?[jt]sx?$|\.stories\.[jt]sx?$|^LICENSE$/

function readManifest(dir: string): PackageManifest {
  return JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf-8'))
}

// The names are fed into the hash in sorted order, so the order must not depend on the locale or the ICU data of the
// machine that builds: `localeCompare` would give two hosts two ids for the same sources.
function compareNames(a: string, b: string): number {
  if (a === b) {
    return 0
  }
  return a < b ? -1 : 1
}

function findWorkspaceRoot(from: string): string {
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
function workspacePackages(root: string): Map<string, string> {
  const packages = new Map<string, string>()
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
      if (existsSync(path.join(dir, 'package.json'))) {
        packages.set(readManifest(dir).name, dir)
      }
    }
  }
  return packages
}

/**
 * The package and the workspace packages it depends on, transitively, sorted by name. Only the package itself
 * contributes its devDependencies: a library reaches the bundle through its build output, not through its own tools.
 */
function sourcePackages(root: string, packageDir: string, includeDevDependencies: boolean): Array<[string, string]> {
  const known = workspacePackages(root)
  const result = new Map<string, string>()
  const visit = (dir: string, isRoot: boolean): void => {
    const manifest = readManifest(dir)
    if (result.has(manifest.name)) {
      return
    }
    result.set(manifest.name, dir)
    const workspaceNames = (kind: 'dependencies' | 'devDependencies'): string[] => Object.entries(manifest[kind] ?? {})
      .filter(([, range]) => String(range).startsWith('workspace:'))
      .map(([name]) => name)
    for (const name of workspaceNames('dependencies')) {
      const dependencyDir = known.get(name)
      if (!dependencyDir) {
        throw new Error(`${manifest.name} depends on ${name}, which is not a workspace package`)
      }
      visit(dependencyDir, false)
    }
    // A development tool outside frontend/ (a test environment, for example) is not part of the bundle.
    for (const name of isRoot && includeDevDependencies ? workspaceNames('devDependencies') : []) {
      const toolDir = known.get(name)
      if (toolDir) {
        visit(toolDir, false)
      }
    }
  }
  visit(packageDir, true)
  return [...result.entries()].sort(([a], [b]) => compareNames(a, b))
}

function listFiles(dir: string, base: string = dir): string[] {
  const files: string[] = []
  const entries: Dirent[] = readdirSync(dir, { withFileTypes: true }).sort((a, b) => compareNames(a.name, b.name))
  for (const entry of entries) {
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

/** A hash of the sources of the package and of the workspace packages it depends on. */
export function computeBuildId(packageDir: string, { includeDevDependencies = false }: BuildIdOptions = {}): string {
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

/** `<version from package.json>+<build id>` */
export function stampedVersion(packageDir: string, options: BuildIdOptions = {}): string {
  return `${readManifest(packageDir).version}+${computeBuildId(packageDir, options)}`
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const packageDir = process.argv[2]
  if (!packageDir) {
    console.error('usage: node build-id.mts <package dir>')
    process.exit(1)
  }
  console.log(stampedVersion(path.resolve(packageDir)))
}
