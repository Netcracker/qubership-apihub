const { test } = require('node:test')
const assert = require('node:assert/strict')
const { NO_CHANGES, NO_OWN_CHANGES, moduleNotes } = require('./module')

const REPO = 'https://github.com/Netcracker/qubership-apihub'
const empty = { breaking: [], features: [], bugfixes: [], other: [] }

test('service notes: artifacts, documentation, every section with a placeholder, dependencies, changelog', () => {
  const notes = moduleNotes({
    component: 'agent',
    version: '2.2.0',
    tag: 'agent/2.2.0',
    previousTag: 'agent/2.1.5',
    root: 'backend/agent',
    artifacts: { image: 'ghcr.io/netcracker/qubership-apihub-agent:2.2.0', chart: 'backend/agent/helm-templates/x' },
    changes: { ...empty, features: ['- feat: discovery by @dev in u'] },
    dependencies: [{ name: 'github.com/sirupsen/logrus', from: 'v1.10.0', to: 'v1.10.2' }],
    released: [{ component: 'commons-go', from: '0.0.1', to: '0.0.2' }],
    repoUrl: REPO,
  })
  for (const expected of [
    '# 🏷️ agent 2.2.0',
    'ghcr.io/netcracker/qubership-apihub-agent:2.2.0',
    `# 📚 [Documentation](${REPO}/tree/agent/2.2.0/backend/agent)`,
    `🔹 **Helm chart:** ${REPO}/tree/agent/2.2.0/backend/agent/helm-templates/x`,
    '## 🚀 Features and Improvements\n\n- feat: discovery by @dev in u',
    '## 🐛 Bugfixes\n\nNo bugfixes.',
    '## ⚙️ Tech Improvements & Tasks\n\nNo tech improvements or tasks.',
    '| github.com/sirupsen/logrus | v1.10.0 | v1.10.2 |',
    `- commons-go 0.0.1 → [0.0.2](${REPO}/releases/tag/commons-go/0.0.2)`,
    `**Full Changelog**: ${REPO}/compare/agent/2.1.5...agent/2.2.0`,
  ]) {
    assert.ok(notes.includes(expected), `missing: ${expected}\n---\n${notes}`)
  }
  assert.doesNotMatch(notes, /Breaking changes|No dependency changes/)
})

test('service notes: breaking changes come first; a first release links the tree', () => {
  const notes = moduleNotes({
    component: 'java-task-consumer',
    version: '0.1.0',
    tag: 'java-task-consumer/0.1.0',
    previousTag: null,
    root: 'backend/java-task-consumer',
    artifacts: { image: 'img:0.1.0' },
    changes: { ...empty, breaking: ['- feat!: x'], features: ['- feat: y'] },
    dependencies: [],
    released: [],
    repoUrl: REPO,
  })
  assert.ok(notes.indexOf('## ⚠️ Breaking changes') < notes.indexOf('## 🚀 Features'))
  assert.match(notes, /No dependency changes\./)
  assert.match(notes, /\*\*First release\*\* of this component: .*\/tree\/java-task-consumer\/0\.1\.0/)
})

test('library notes: only sections with entries; a dependency-only release says so', () => {
  const notes = moduleNotes({
    component: 'api-diff',
    version: '4.0.1',
    tag: 'api-diff/4.0.1',
    previousTag: 'api-diff/4.0.0',
    root: 'frontend/api-diff',
    artifacts: { packages: ['@netcracker/qubership-apihub-api-diff@4.0.1'] },
    changes: empty,
    dependencies: [],
    released: [{ component: 'api-unifier', from: '2.9.5', to: '2.9.6' }],
    repoUrl: REPO,
  })
  assert.match(notes, /## 📦 Package\n\n- `@netcracker\/qubership-apihub-api-diff@4\.0\.1`/)
  assert.ok(notes.includes(NO_CHANGES))
  assert.match(notes, /## 🔗 Updated dependencies\n\n- api-unifier 2\.9\.5 → \[2\.9\.6\]/)
  assert.doesNotMatch(notes, /Features|Bugfixes|Other|Dependency Changes/)
})

test('library notes: commons-go publishes no package', () => {
  const notes = moduleNotes({
    component: 'commons-go',
    version: '0.0.2',
    tag: 'commons-go/0.0.2',
    previousTag: 'commons-go/0.0.1',
    root: 'backend/commons-go',
    artifacts: { packages: [] },
    changes: { ...empty, other: ['- chore: z'] },
    dependencies: [{ name: 'github.com/x', from: null, to: 'v1' }],
    released: [],
    repoUrl: REPO,
  })
  assert.match(notes, /Source only: \[backend\/commons-go\]\(.*\/tree\/commons-go\/0\.0\.2\/backend\/commons-go\)/)
  assert.match(notes, /## ⚙️ Other\n\n- chore: z/)
  assert.match(notes, /\| github\.com\/x \| added \| v1 \|/)
  assert.doesNotMatch(notes, /Released because/)
})

test('a release without changes or released dependencies does not blame a dependency', () => {
  const notes = moduleNotes({
    component: 'api-visitor',
    version: '1.0.24',
    tag: 'api-visitor/1.0.24',
    previousTag: 'api-visitor/1.0.23',
    root: 'frontend/api-visitor',
    artifacts: { packages: ['p@1.0.24'] },
    changes: empty,
    dependencies: [],
    released: [],
    repoUrl: REPO,
  })
  assert.ok(notes.includes(NO_OWN_CHANGES))
  assert.ok(!notes.includes(NO_CHANGES))
})
