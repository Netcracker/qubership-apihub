'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const {
  closingIssueNumbers,
  imageVersion,
  markerFor,
  parseImageEnv,
  pickImageConfig,
  renderComment,
} = require('./announce-versions')

const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'

test('parseImageEnv splits on the first equals sign and skips malformed entries', () => {
  assert.deepEqual(
    parseImageEnv({ Env: ['PATH=/usr/bin:/bin', 'GIT_BRANCH=feature/a=b', 'BROKEN', '=x'] }),
    { PATH: '/usr/bin:/bin', GIT_BRANCH: 'feature/a=b' },
  )
  assert.deepEqual(parseImageEnv(undefined), {})
})

test('pickImageConfig takes the config of a single image or of the first platform', () => {
  const config = { Env: ['A=1'] }
  assert.equal(pickImageConfig({ config }), config)
  assert.equal(pickImageConfig({ 'linux/amd64': { config }, 'linux/arm64': { config: { Env: ['A=2'] } } }), config)
  assert.equal(pickImageConfig({}), undefined)
})

test('imageVersion matches the version the services report', () => {
  assert.equal(imageVersion({ GIT_BRANCH: 'develop', GIT_HASH: 'a1b2c3d', BUILD_TIME: '20261026104501' }), 'develop.a1b2c3d.20261026104501')
  assert.equal(imageVersion({ GIT_BRANCH: 'develop', GIT_HASH: 'a1b2c3d' }), 'develop.a1b2c3d')
  assert.equal(imageVersion({}), null)
})

test('closingIssueNumbers keeps the issues of this repository only', () => {
  const nodes = [
    { number: 1, repository: { name: 'qubership-apihub', owner: { login: 'Netcracker' } } },
    { number: 2, repository: { name: 'other', owner: { login: 'Netcracker' } } },
    { number: 3, repository: { name: 'Qubership-APIHUB', owner: { login: 'netcracker' } } },
  ]
  assert.deepEqual(closingIssueNumbers(nodes, 'Netcracker/qubership-apihub'), [1, 3])
})

test('renderComment lists every component and ends with the marker of the commit', () => {
  const body = renderComment({
    sha: SHA,
    pull: 956,
    components: [
      { name: 'Backend', version: 'develop.a1b2c3d.20261026104501', hash: 'a1b2c3d' },
      { name: 'Frontend', version: '3.10.2+3ed957bfd9', hash: 'a1b2c3d', build: 'develop.a1b2c3d.20261026104503' },
      { name: 'API Processor', version: '5.7.2+282fe2a072' },
      { name: 'API Linter', version: null, hash: null },
    ],
  })
  assert.match(body, /^Available in the following versions, built from the merge of #956 \(`a1b2c3d`\) into `develop`:/)
  assert.match(body, /\| Backend \| `develop\.a1b2c3d\.20261026104501` \|/)
  assert.match(body, /\| Frontend \| `3\.10\.2\+3ed957bfd9` \(image `develop\.a1b2c3d\.20261026104503`\) \|/)
  assert.match(body, /\| API Processor \| `5\.7\.2\+282fe2a072` \|/)
  assert.match(body, /\| API Linter \| unknown \|/)
  assert.doesNotMatch(body, /newer build/)
  assert.ok(body.endsWith(markerFor(SHA)))
})

test('renderComment flags the components that a newer build already replaced', () => {
  const body = renderComment({
    sha: SHA,
    pull: 956,
    components: [
      { name: 'Backend', version: 'develop.ffffffff.20261027090000', hash: 'ffffffff' },
      { name: 'Build task consumer', version: 'develop.a1b2c3d.20261026104501', hash: 'a1b2c3d' },
    ],
  })
  assert.match(body, /\| Backend \| `develop\.ffffffff\.20261027090000` \* \|/)
  assert.match(body, /\| Build task consumer \| `develop\.a1b2c3d\.20261026104501` \|/)
  assert.match(body, /A newer build of `develop` was already published/)
})

test('markerFor uses the short commit, so a rerun finds its own comment', () => {
  assert.equal(markerFor(SHA), '<!-- available-in:a1b2c3d -->')
})
