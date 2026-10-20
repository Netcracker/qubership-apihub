/**
 * Sorts the changes of a component into the sections of the release notes, the way
 * be-repo-rns-generator.py did: a pull request's closing issues decide by issue type, then by label;
 * without issues, the Conventional Commits type of the title decides. Breaking changes (`!` or a
 * `BREAKING CHANGE:` footer) get a section of their own and appear only there.
 *
 * Input: the output of pull-requests.js `resolve()`. One entry per pull request, however many of its
 * commits touched the component.
 */
const { isBreaking } = require('../conventional')

const SECTIONS = ['breaking', 'features', 'bugfixes', 'other']
// The commit release-finish.yml creates; it is the release itself, not a change.
const RELEASE_COMMIT = /^chore\(release\): publish\b/

function issueCategory(type, labels) {
  const t = type?.trim().toLowerCase()
  if (t) return t === 'feature' || t === 'feat' ? 'features' : t === 'bug' ? 'bugfixes' : 'other'
  for (const label of labels.map((l) => l.toLowerCase())) {
    if (label === 'feature' || label === 'feat') return 'features'
    if (label === 'bug') return 'bugfixes'
  }
  return 'other'
}

function titleCategory(title) {
  const t = title.trim().toLowerCase()
  if (t.startsWith('feat')) return 'features'
  if (t.startsWith('fix') || t.startsWith('bug')) return 'bugfixes'
  return 'other'
}

const by = (login) => (login ? ` by @${login}` : '')

/** `{ breaking: [lines], features: [...], bugfixes: [...], other: [...] }` of Markdown list items. */
function groupChanges(resolved, repoUrl) {
  const groups = Object.fromEntries(SECTIONS.map((s) => [s, []]))
  const entries = new Map()
  for (const { commit, login, pull } of resolved) {
    if (RELEASE_COMMIT.test(commit.subject)) continue
    const key = pull ? pull.url : commit.sha
    if (!entries.has(key)) entries.set(key, { pull, login, commits: [] })
    entries.get(key).commits.push(commit)
  }

  for (const { pull, login, commits } of entries.values()) {
    const breaking = commits.some((c) => isBreaking(c.subject, c.body))
    if (!pull) {
      const c = commits[0]
      const author = login ? by(login) : ` by ${c.author}`
      const section = breaking ? 'breaking' : titleCategory(c.subject)
      groups[section].push(`- ${c.subject}${author} in [${c.hash}](${repoUrl}/commit/${c.sha})`)
      continue
    }
    const head = `- ${pull.title}${by(pull.author)} in ${pull.url}`
    if (!pull.issues.length) {
      groups[breaking ? 'breaking' : titleCategory(pull.title)].push(head)
      continue
    }
    const link = (issue) => `[${issue.title}](${issue.url})`
    if (breaking) {
      const noun = pull.issues.length > 1 ? 'issues' : 'issue'
      groups.breaking.push(`${head} for ${noun} (${pull.issues.map(link).join(', ')})`)
      continue
    }
    for (const issue of pull.issues) groups[issueCategory(issue.type, issue.labels)].push(`${head} for issue (${link(issue)})`)
  }
  return groups
}

module.exports = { SECTIONS, groupChanges, issueCategory, titleCategory }
