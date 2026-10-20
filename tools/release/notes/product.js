/**
 * Release notes of the product, in the layout of app-apihub-rns-generator.py: images, documentation and
 * installation links, the breaking changes of the components released with it, the sprint's work items
 * from Project 9 (project.js), the version of every component, and the agent.
 *
 * The "Autotests tags" section of the old notes is gone: the E2E suites are in the same tag.
 */

const { chartLine } = require('./module')

const TABLE_HEAD = ['| Work item | Name | Author | Epic |', '|---|---|---|---|']

const releaseLink = (repoUrl, component, version) => `${repoUrl}/releases/tag/${component}/${version}`

function workItemSection(title, rows, empty) {
  return [`## ${title}`, '', ...(rows.length ? [...TABLE_HEAD, ...rows] : [empty]), '']
}

/**
 * images: `[{ component, image, version }]`, version null when the component has no tag yet;
 * components: `[{ component, version, previous, released }]`; chart: `{ ref, version, dir }` of the product
 * chart; agent: `{ image, version, chart }` or null, its chart `{ ref, version, dir }` or null;
 * workItems: project.js `workItemRows()`, or null with `workItemsNote` saying why they are missing;
 * breaking: `[{ component, version, lines }]` from the module notes of this release.
 */
function productNotes({
  version,
  tag,
  previousTag,
  sprint,
  images,
  components,
  chart,
  agent,
  workItems,
  workItemsNote,
  breaking,
  repoUrl,
}) {
  const tree = `${repoUrl}/tree/${tag}`
  const out = [`🎉 **Release Notes: ${version}** 🎉`, '']
  if (sprint) out.push(`Sprint: ${sprint}`, '')
  out.push('---', '', '### 📦 Artifacts', '', '#### 🐳 Docker images', '')
  for (const i of images) {
    out.push(i.version ? `[${i.image}:${i.version}](${releaseLink(repoUrl, i.component, i.version)})  ` : `${i.image}: not released yet  `)
  }
  out.push('', '#### ⎈ Helm chart', '', `🔹 ${chartLine(chart, repoUrl, tag)}, also attached to this release`, '')
  out.push('---', '', `### 📖 [Documentation](${tree}/docs)`, '', '---', '', '### ⚙️ Installation', '')
  out.push(
    `🔹 [Installation Notes](${repoUrl}/blob/${tag}/docs/installation-guide.md)  `,
    `🔹 **docker-compose:** ${tree}/deploy/docker-compose/apihub-generic  `,
    `🔹 **Helm chart:** \`helm install apihub ${chart.ref} --version ${chart.version}\``,
    '',
    '---',
    '',
  )

  if (breaking.some((b) => b.lines.length)) {
    out.push('## ⚠️ Breaking changes', '')
    for (const b of breaking) for (const line of b.lines) out.push(`- **${b.component} ${b.version}**: ${line.replace(/^- /, '')}`)
    out.push('', '---', '')
  }

  if (workItems) {
    out.push(
      ...workItemSection('✨ Features and Improvements', workItems.features, 'No features or improvements.'),
      '---',
      '',
      ...workItemSection('🐛 Bugfixes', workItems.bugfixes, 'No bugfixes.'),
      '---',
      '',
      ...workItemSection('🛠 Tech Improvements & Other Changes', workItems.other, 'No other changes.'),
    )
  } else {
    out.push('## ✨ Work items', '', workItemsNote, '')
  }

  out.push('## 🧩 Components', '', `| Component | Version | ${previousTag ?? 'Previous'} |`, '|---|---|---|')
  for (const c of components) {
    const current = !c.version ? 'none' : c.released ? `[${c.version}](${releaseLink(repoUrl, c.component, c.version)})` : c.version
    const previous = c.previous && c.previous === c.version ? 'unchanged' : c.previous ?? 'none'
    out.push(`| ${c.component} | ${current} | ${previous} |`)
  }
  out.push('', `The E2E suites are part of this tag: [tests](${tree}/tests).`, '')

  if (agent) {
    out.push('## 🤖 APIHUB Agent', '')
    out.push(
      agent.version
        ? `🔹 **Docker image:** [${agent.image}:${agent.version}](${releaseLink(repoUrl, 'agent', agent.version)})  `
        : `🔹 **Docker image:** ${agent.image}: not released yet  `,
    )
    if (agent.chart) out.push(`🔹 **Helm chart:** ${chartLine(agent.chart, repoUrl, `agent/${agent.chart.version}`)}`)
    out.push('')
  }

  out.push('---', '', previousTag ? `**Full Changelog**: ${repoUrl}/compare/${previousTag}...${tag}` : `**First release**: ${tree}`, '')
  return out.join('\n')
}

module.exports = { productNotes }
