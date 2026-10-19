/**
 * MINIMAL release notes, a stopgap. Steps 4 and 5 of the migration plan replace this generator with the
 * ports of be-repo-rns-generator.py (module notes: pull requests, linked issues by type, dependency
 * diffs) and app-apihub-rns-generator.py (product notes: Project 9 work items of the sprint). Until then:
 *
 *   module   the commit titles since the previous tag that touch the module's directories, grouped by
 *            Conventional Commits type, the artifacts, and a compare link;
 *   product  the components released with it, the sprint, and a compare link.
 *
 * Pure functions; tools/release/artifacts.js collects the commits and writes the files.
 */
const { HEADER, isBreaking } = require('../conventional')

const MARKER =
  '<!-- Minimal notes from tools/release/notes/minimal.js; replaced by steps 4-5 of the migration plan. -->'

const SECTIONS = [
  ['breaking', 'Breaking changes'],
  ['feat', 'Features'],
  ['fix', 'Bug fixes'],
  ['perf', 'Performance'],
  ['other', 'Other changes'],
]

/** `{ breaking: [...], feat: [...], ... }`; a commit goes to one section only, breaking first. */
function groupCommits(commits) {
  const groups = Object.fromEntries(SECTIONS.map(([key]) => [key, []]))
  for (const c of commits) {
    const header = c.subject.match(HEADER)
    const type = header?.groups.type
    if (isBreaking(c.subject, c.body)) groups.breaking.push(c)
    else if (['feat', 'fix', 'perf'].includes(type)) groups[type].push(c)
    else groups.other.push(c)
  }
  return groups
}

const compareLine = (repoUrl, previousTag, tag) =>
  previousTag
    ? `**Full changelog:** [${previousTag}...${tag}](${repoUrl}/compare/${previousTag}...${tag})`
    : `**First release** of this component in the monorepo: [${tag}](${repoUrl}/tree/${tag})`

function renderCommits(commits, repoUrl) {
  if (!commits.length) {
    return ['No changes of its own: released because an in-repo dependency was released.', '']
  }
  const out = []
  const groups = groupCommits(commits)
  for (const [key, title] of SECTIONS) {
    if (!groups[key].length) continue
    out.push(`### ${title}`, '')
    for (const c of groups[key]) out.push(`- ${c.subject} ([${c.hash}](${repoUrl}/commit/${c.hash}))`)
    out.push('')
  }
  return out
}

/** artifacts: `{ image?: 'ghcr.io/...:1.2.3', packages?: ['@netcracker/x@1.2.3'] }` */
function moduleNotes({ component, version, tag, previousTag, commits, artifacts, repoUrl }) {
  const out = [MARKER, '', `## ${component} ${version}`, '']
  const lines = []
  if (artifacts.image) lines.push(`- Docker image: \`${artifacts.image}\``)
  for (const p of artifacts.packages ?? []) lines.push(`- npm package: \`${p}\``)
  if (lines.length) out.push('### Artifacts', '', ...lines, '')
  out.push(...renderCommits(commits, repoUrl))
  out.push(compareLine(repoUrl, previousTag, tag), '')
  return out.join('\n')
}

/** components: `[{ component, version, previousTag }]`, the modules released with the product. */
function productNotes({ version, tag, previousTag, sprint, components, repoUrl }) {
  const out = [MARKER, '', `## APIHUB ${version}`, '']
  if (sprint) out.push(`Sprint: ${sprint}`, '')
  if (components.length) {
    out.push('### Components released with it', '', '| Component | Version | Previous |', '|---|---|---|')
    for (const c of components) {
      const previous = c.previousTag ? c.previousTag.slice(c.component.length + 1) : 'none'
      out.push(`| ${c.component} | [${c.version}](${repoUrl}/releases/tag/${c.component}/${c.version}) | ${previous} |`)
    }
    out.push('')
  } else {
    out.push('Only `deploy/` changed; no component was released with it.', '')
  }
  out.push(compareLine(repoUrl, previousTag, tag), '')
  return out.join('\n')
}

module.exports = { MARKER, groupCommits, moduleNotes, productNotes }
