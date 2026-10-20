/**
 * Release notes of one component, pure functions over collected data:
 *
 *   serviceNotes  components with an image (Go and Java services, ui, build-task-consumer), in the
 *                 layout of be-repo-rns-generator.py: artifacts, documentation, the change sections,
 *                 dependency changes, and the full changelog;
 *   libraryNotes  the npm libraries and commons-go: package, the change sections that have entries,
 *                 the in-repo dependencies released with it, and the full changelog.
 *
 * `changes` is the output of changes.js `groupChanges()`, `dependencies` that of dependencies.js
 * `dependencyChanges()`, and `released` lists the in-repo dependencies released in the same run as
 * `[{ component, from, to }]`.
 */

const NO_CHANGES = 'Released because an in-repo dependency was released; no changes of its own.'
const NO_OWN_CHANGES = 'No changes of its own since the previous release.'

const hasChanges = (changes) => Object.values(changes).some((lines) => lines.length)

function changelog(repoUrl, previousTag, tag) {
  return previousTag
    ? `**Full Changelog**: ${repoUrl}/compare/${previousTag}...${tag}`
    : `**First release** of this component: ${repoUrl}/tree/${tag}`
}

function dependencyTable(dependencies) {
  return [
    '| Module | Old Version | New Version |',
    '|---|---|---|',
    ...dependencies.map((d) =>
      d.more ? `| … and ${d.more} more | | |` : `| ${d.name} | ${d.from ?? 'added'} | ${d.to ?? 'removed'} |`,
    ),
  ]
}

function releasedList(released, repoUrl) {
  return released.map(
    (r) => `- ${r.component} ${r.from ?? 'none'} → [${r.to}](${repoUrl}/releases/tag/${r.component}/${r.to})`,
  )
}

function section(title, lines, empty) {
  if (!lines.length && empty === undefined) return []
  return [`## ${title}`, '', ...(lines.length ? lines : [empty]), '']
}

function serviceNotes({ component, version, tag, previousTag, root, artifacts, changes, dependencies, released, repoUrl }) {
  const out = [`# 🏷️ ${component} ${version}`, '', '---', '', '# 📦 Artifacts', '', '## 🚢 Docker image', '']
  out.push(artifacts.image, '')
  for (const p of artifacts.packages ?? []) out.push(`npm package: \`${p}\``, '')
  out.push('---', '', `# 📚 [Documentation](${repoUrl}/tree/${tag}/${root})`, '')
  if (artifacts.chart) out.push(`🔹 **Helm chart:** ${repoUrl}/tree/${tag}/${artifacts.chart}`, '')
  out.push('---', '', '# 📝 Release Notes', '')
  if (!hasChanges(changes)) out.push(released.length ? NO_CHANGES : NO_OWN_CHANGES, '')
  out.push(
    ...section('⚠️ Breaking changes', changes.breaking),
    ...section('🚀 Features and Improvements', changes.features, 'No new features or improvements.'),
    ...section('🐛 Bugfixes', changes.bugfixes, 'No bugfixes.'),
    ...section('⚙️ Tech Improvements & Tasks', changes.other, 'No tech improvements or tasks.'),
    '## 🔄 Dependency Changes',
    '',
  )
  if (dependencies.length) out.push(...dependencyTable(dependencies), '')
  if (released.length) out.push('Released in-repo dependencies:', '', ...releasedList(released, repoUrl), '')
  if (!dependencies.length && !released.length) out.push('No dependency changes.', '')
  out.push('---', '', '## 🔗 Full Changelog', '', changelog(repoUrl, previousTag, tag), '')
  return out.join('\n')
}

function libraryNotes({ component, version, tag, previousTag, root, artifacts, changes, dependencies, released, repoUrl }) {
  const packages = artifacts.packages?.length
    ? artifacts.packages.map((p) => `- \`${p}\``)
    : [`- Source only: [${root}](${repoUrl}/tree/${tag}/${root}); no package is published.`]
  const out = [`# 🏷️ ${component} ${version}`, '', '## 📦 Package', '', ...packages, '']
  if (!hasChanges(changes)) out.push(released.length ? NO_CHANGES : NO_OWN_CHANGES, '')
  out.push(
    ...section('⚠️ Breaking changes', changes.breaking),
    ...section('🚀 Features and Improvements', changes.features),
    ...section('🐛 Bugfixes', changes.bugfixes),
    ...section('⚙️ Other', changes.other),
    ...section('🔗 Updated dependencies', releasedList(released, repoUrl)),
  )
  if (dependencies.length) out.push('## 🔄 Dependency Changes', '', ...dependencyTable(dependencies), '')
  out.push('## 🔗 Full Changelog', '', changelog(repoUrl, previousTag, tag), '')
  return out.join('\n')
}

/** The notes of a component: the service layout when it ships an image, the library layout otherwise. */
const moduleNotes = (data) => (data.artifacts.image ? serviceNotes(data) : libraryNotes(data))

module.exports = { NO_CHANGES, NO_OWN_CHANGES, libraryNotes, moduleNotes, serviceNotes }
