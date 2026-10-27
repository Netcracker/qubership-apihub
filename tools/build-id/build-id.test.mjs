import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, test } from 'node:test'
import { computeBuildId, stampedVersion } from './build-id.mts'

const roots = []

function write(file, content) {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, content)
}

function manifest(name, dependencies = {}, devDependencies = {}) {
  return JSON.stringify({ name, version: '1.2.3', dependencies, devDependencies })
}

/** app -> lib -> leaf, and a tool that only the app has as a devDependency. */
function makeWorkspace() {
  const root = mkdtempSync(path.join(tmpdir(), 'build-id-'))
  roots.push(root)
  write(path.join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'frontend/*'\n")
  write(path.join(root, 'frontend/app/package.json'), manifest('@t/app', { '@t/lib': 'workspace:^' }, { '@t/tool': 'workspace:*' }))
  write(path.join(root, 'frontend/app/src/main.ts'), 'export const app = 1\n')
  write(path.join(root, 'frontend/lib/package.json'), manifest('@t/lib', { '@t/leaf': 'workspace:^' }, { '@t/lib-tool': 'workspace:*' }))
  write(path.join(root, 'frontend/lib/src/index.ts'), 'export const lib = 1\n')
  write(path.join(root, 'frontend/leaf/package.json'), manifest('@t/leaf'))
  write(path.join(root, 'frontend/leaf/src/index.ts'), 'export const leaf = 1\n')
  write(path.join(root, 'frontend/tool/package.json'), manifest('@t/tool'))
  write(path.join(root, 'frontend/tool/src/index.ts'), 'export const tool = 1\n')
  write(path.join(root, 'frontend/lib-tool/package.json'), manifest('@t/lib-tool'))
  write(path.join(root, 'frontend/lib-tool/src/index.ts'), 'export const libTool = 1\n')
  return { root, app: path.join(root, 'frontend/app'), lib: path.join(root, 'frontend/lib'), leaf: path.join(root, 'frontend/leaf') }
}

after(() => {
  for (const root of roots) {
    rmSync(root, { recursive: true, force: true })
  }
})

test('the same sources give the same id, wherever they are', () => {
  const first = makeWorkspace()
  const second = makeWorkspace()
  assert.equal(computeBuildId(first.lib), computeBuildId(first.lib))
  assert.equal(computeBuildId(first.lib), computeBuildId(second.lib))
})

test('a change in a source of the package or of a dependency changes the id', () => {
  const workspace = makeWorkspace()
  const before = computeBuildId(workspace.lib)

  write(path.join(workspace.leaf, 'src/index.ts'), 'export const leaf = 2\n')
  const afterLeaf = computeBuildId(workspace.lib)
  assert.notEqual(afterLeaf, before)

  write(path.join(workspace.lib, 'src/index.ts'), 'export const lib = 2\n')
  assert.notEqual(computeBuildId(workspace.lib), afterLeaf)
})

test('what no build reads does not change the id', () => {
  const workspace = makeWorkspace()
  const before = computeBuildId(workspace.lib)

  write(path.join(workspace.lib, 'README.md'), '# docs\n')
  write(path.join(workspace.lib, 'test/index.test.ts'), 'it()\n')
  write(path.join(workspace.lib, 'src/index.unit-test.ts'), 'it()\n')
  write(path.join(workspace.lib, 'src/Button.stories.tsx'), 'export default {}\n')
  write(path.join(workspace.lib, 'node_modules/x/index.js'), 'x\n')
  write(path.join(workspace.lib, 'dist/index.js'), 'built\n')
  write(path.join(workspace.leaf, 'docs/guide.txt'), 'guide\n')

  assert.equal(computeBuildId(workspace.lib), before)
})

test('line endings do not change the id', () => {
  const unix = makeWorkspace()
  const windows = makeWorkspace()
  write(path.join(unix.lib, 'src/index.ts'), 'a\nb\nc\n')
  write(path.join(windows.lib, 'src/index.ts'), 'a\r\nb\r\nc\r\n')
  assert.equal(computeBuildId(unix.lib), computeBuildId(windows.lib))
})

test('the order of the files does not depend on how they were created', () => {
  const first = makeWorkspace()
  const second = makeWorkspace()
  for (const name of ['b.ts', 'a.ts', 'Z.ts', 'ä.ts', 'a-1.ts', 'a_1.ts']) {
    write(path.join(first.lib, 'src', name), `export const x = '${name}'\n`)
  }
  for (const name of ['ä.ts', 'a_1.ts', 'a-1.ts', 'Z.ts', 'a.ts', 'b.ts']) {
    write(path.join(second.lib, 'src', name), `export const x = '${name}'\n`)
  }
  assert.equal(computeBuildId(first.lib), computeBuildId(second.lib))
})

test('only an app follows its own workspace devDependencies, and only with the option', () => {
  const workspace = makeWorkspace()
  const library = computeBuildId(workspace.app)
  const app = computeBuildId(workspace.app, { includeDevDependencies: true })
  assert.notEqual(app, library)

  // The tool is bundled by the app, so a change in it changes the id of the app only when the app asks for it.
  write(path.join(workspace.root, 'frontend/tool/src/index.ts'), 'export const tool = 2\n')
  assert.equal(computeBuildId(workspace.app), library)
  assert.notEqual(computeBuildId(workspace.app, { includeDevDependencies: true }), app)

  // A library's own tools never reach the app: they are not in the bundle.
  const withLibraryTool = computeBuildId(workspace.app, { includeDevDependencies: true })
  write(path.join(workspace.root, 'frontend/lib-tool/src/index.ts'), 'export const libTool = 2\n')
  assert.equal(computeBuildId(workspace.app, { includeDevDependencies: true }), withLibraryTool)
})

test('stampedVersion is the version of the package and the build id', () => {
  const workspace = makeWorkspace()
  assert.match(stampedVersion(workspace.lib), /^1\.2\.3\+[0-9a-f]{10}$/)
  assert.equal(stampedVersion(workspace.lib), `1.2.3+${computeBuildId(workspace.lib)}`)
})

test('a workspace dependency that does not exist is an error, not a silent gap', () => {
  const workspace = makeWorkspace()
  write(path.join(workspace.lib, 'package.json'), manifest('@t/lib', { '@t/missing': 'workspace:^' }))
  assert.throws(() => computeBuildId(workspace.lib), /@t\/missing.*not a workspace package/)
})

test('a package outside a workspace is an error', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'build-id-'))
  roots.push(root)
  write(path.join(root, 'lone/package.json'), manifest('@t/lone'))
  assert.throws(() => computeBuildId(path.join(root, 'lone')), /pnpm-workspace\.yaml not found/)
})

test('copying a workspace keeps the ids', () => {
  const original = makeWorkspace()
  const copy = mkdtempSync(path.join(tmpdir(), 'build-id-'))
  roots.push(copy)
  cpSync(original.root, copy, { recursive: true })
  assert.equal(computeBuildId(path.join(copy, 'frontend/lib')), computeBuildId(original.lib))
})
