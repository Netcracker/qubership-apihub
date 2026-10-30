const { test } = require('node:test')
const assert = require('node:assert/strict')
const { productNotes } = require('./product')

const REPO = 'https://github.com/Netcracker/qubership-apihub'
const base = {
  version: '2.16.0',
  tag: '2.16.0',
  previousTag: '2.15.0',
  sprint: 'APIHUB-26.3.5',
  images: [
    { component: 'portal-backend', image: 'ghcr.io/netcracker/qubership-apihub-backend', version: '1.22.0' },
    { component: 'java-task-consumer', image: 'ghcr.io/netcracker/qubership-apihub-java-task-consumer', version: null },
  ],
  components: [
    { component: 'portal-backend', version: '1.22.0', previous: '1.21.0', released: true },
    { component: 'api-visitor', version: '1.0.4', previous: '1.0.4', released: false },
    { component: 'test-service', version: null, previous: null, released: false },
  ],
  chart: { ref: 'oci://ghcr.io/netcracker/charts/qubership-apihub', version: '2.16.0', dir: 'deploy/helm-templates/qubership-apihub' },
  agent: {
    image: 'ghcr.io/netcracker/qubership-apihub-agent',
    version: '2.1.5',
    chart: { ref: 'oci://ghcr.io/netcracker/charts/qubership-apihub-agent', version: '2.1.5', dir: 'backend/agent/helm' },
  },
  workItems: { features: ['| Issue: <u> | Name | @a | |'], bugfixes: [], other: [] },
  breaking: [
    { component: 'portal-backend', version: '1.22.0', lines: ['- feat!: drop v1 by @a in u'] },
    { component: 'ui', version: '3.11.0', lines: [] },
  ],
  repoUrl: REPO,
}

test('product notes: artifacts, installation, breaking changes, work items, components, agent, changelog', () => {
  const notes = productNotes(base)
  for (const expected of [
    '🎉 **Release Notes: 2.16.0** 🎉',
    'Sprint: APIHUB-26.3.5',
    `[ghcr.io/netcracker/qubership-apihub-backend:1.22.0](${REPO}/releases/tag/portal-backend/1.22.0)`,
    'ghcr.io/netcracker/qubership-apihub-java-task-consumer: not released yet',
    `🔹 \`oci://ghcr.io/netcracker/charts/qubership-apihub\` version \`2.16.0\` ([sources](${REPO}/tree/2.16.0/deploy/helm-templates/qubership-apihub)), also attached to this release`,
    '🔹 **Helm chart:** `helm install apihub oci://ghcr.io/netcracker/charts/qubership-apihub --version 2.16.0`',
    `### 📖 [Documentation](${REPO}/tree/2.16.0/docs)`,
    `🔹 **docker-compose:** ${REPO}/tree/2.16.0/deploy/docker-compose/apihub-generic`,
    '## ⚠️ Breaking changes\n\n- **portal-backend 1.22.0**: feat!: drop v1 by @a in u\n',
    '## ✨ Features and Improvements\n\n| Work item | Name | Author | Epic |\n|---|---|---|---|\n| Issue: <u> | Name | @a | |',
    '## 🐛 Bugfixes\n\nNo bugfixes.',
    '| Component | Version | 2.15.0 |',
    `| portal-backend | [1.22.0](${REPO}/releases/tag/portal-backend/1.22.0) | 1.21.0 |`,
    '| api-visitor | 1.0.4 | unchanged |',
    '| test-service | none | none |',
    `[ghcr.io/netcracker/qubership-apihub-agent:2.1.5](${REPO}/releases/tag/agent/2.1.5)`,
    `🔹 **Helm chart:** \`oci://ghcr.io/netcracker/charts/qubership-apihub-agent\` version \`2.1.5\` ([sources](${REPO}/tree/agent/2.1.5/backend/agent/helm))`,
    `**Full Changelog**: ${REPO}/compare/2.15.0...2.16.0`,
  ]) {
    assert.ok(notes.includes(expected), `missing: ${expected}\n---\n${notes}`)
  }
  assert.doesNotMatch(notes, /Autotests/)
})

test('product notes: no breaking section without breaking changes; missing work items are explained', () => {
  const notes = productNotes({
    ...base,
    breaking: [],
    workItems: null,
    workItemsNote: 'PROJECT_READ_TOKEN is not set.',
    previousTag: null,
  })
  assert.doesNotMatch(notes, /Breaking changes/)
  assert.match(notes, /## ✨ Work items\n\nPROJECT_READ_TOKEN is not set\./)
  assert.match(notes, /\| Component \| Version \| Previous \|/)
  assert.match(notes, /\*\*First release\*\*/)
})
