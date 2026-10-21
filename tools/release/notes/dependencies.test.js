const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  dependencyChanges,
  diffDependencies,
  goRequires,
  manifestsAt,
  mavenDependencies,
  npmDependencies,
} = require('./dependencies')

test('goRequires reads single requires and blocks, with and without comments', () => {
  const text = [
    'module github.com/Netcracker/qubership-apihub/backend/agent',
    'go 1.26',
    'require github.com/a/one v1.0.0',
    'require (',
    '\tgithub.com/b/two v2.1.0 // indirect',
    '\tgithub.com/c/three v0.3.0',
    ')',
    'replace github.com/x => ../x',
  ].join('\n')
  assert.deepEqual(
    [...goRequires(text)],
    [['github.com/a/one', 'v1.0.0'], ['github.com/b/two', 'v2.1.0'], ['github.com/c/three', 'v0.3.0']],
  )
})

test('npmDependencies skips devDependencies and in-repo packages', () => {
  const text = JSON.stringify({
    dependencies: { react: '^18.3.1', '@netcracker/qubership-apihub-api-diff': 'workspace:^', old: 'dev' },
    peerDependencies: { 'react-dom': '^18' },
    devDependencies: { vitest: '^3' },
  })
  assert.deepEqual([...npmDependencies(text, (n) => n === 'old')], [['react', '^18.3.1'], ['react-dom', '^18']])
})

test('mavenDependencies resolves properties and skips managed and in-repo versions', () => {
  const xml = `<project>
    <parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>3.5.0</version></parent>
    <properties><jackson.version>2.19.1</jackson.version></properties>
    <!-- <dependency><groupId>x</groupId><artifactId>commented</artifactId><version>1</version></dependency> -->
    <dependencies>
      <dependency><groupId>com.fasterxml.jackson.core</groupId><artifactId>jackson-databind</artifactId><version>\${jackson.version}</version></dependency>
      <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
      <dependency><groupId>com.netcracker.qubership.apihub</groupId><artifactId>jdiff-engine</artifactId><version>\${project.version}</version></dependency>
    </dependencies>
  </project>`
  assert.deepEqual([...mavenDependencies(xml)], [
    ['org.springframework.boot:spring-boot-starter-parent', '3.5.0'],
    ['com.fasterxml.jackson.core:jackson-databind', '2.19.1'],
  ])
})

test('diffDependencies lists added, removed, and moved dependencies by name', () => {
  const before = new Map([['a', '1'], ['b', '1'], ['c', '1']])
  const after = new Map([['a', '1'], ['b', '2'], ['d', '1']])
  assert.deepEqual(diffDependencies(before, after), [
    { name: 'b', from: '1', to: '2' },
    { name: 'c', from: '1', to: null },
    { name: 'd', from: null, to: '1' },
  ])
})

/** A fake git over `{ ref: { path: text } }`. */
const fakeGit = (trees) => (args) => {
  if (args[0] === 'ls-tree') {
    const [, , , ref, , root] = args
    return Object.keys(trees[ref]).filter((f) => f.startsWith(root + '/')).join('\n')
  }
  const [ref, file] = args[1].split(':')
  return trees[ref][file]
}

test('manifestsAt takes a nested go.mod only for a root without manifests of its own', () => {
  const git = fakeGit({
    old: {
      'backend/portal-backend/qubership-apihub-service/go.mod': 'require x v1',
      'backend/portal-backend/qubership-apihub-service/testdata/go.mod': 'require y v1',
      'frontend/api-processor/package.json': '{}',
      'frontend/api-processor/test/fixture/go.mod': 'require z v1',
    },
  })
  assert.deepEqual(manifestsAt(git, 'old', ['backend/portal-backend', 'frontend/api-processor']), [
    { kind: 'go.mod', text: 'require x v1' },
    { kind: 'package.json', text: '{}' },
  ])
})

test('dependencyChanges compares the two refs and needs a previous tag', () => {
  const git = fakeGit({
    old: { 'backend/agent/qubership-apihub-agent/go.mod': 'require (\n\tgithub.com/x v1.0.0\n)' },
    new: { 'backend/agent/go.mod': 'require (\n\tgithub.com/x v1.1.0\n)' },
  })
  assert.deepEqual(dependencyChanges({ git, from: 'old', to: 'new', roots: ['backend/agent'] }), [
    { name: 'github.com/x', from: 'v1.0.0', to: 'v1.1.0' },
  ])
  assert.deepEqual(dependencyChanges({ git, from: null, to: 'new', roots: ['backend/agent'] }), [])
})
