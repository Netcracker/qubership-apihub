// Merges the repository issue lists and the board items into one list without duplicates, then scores each issue
// for relevance to the feature under test by the keyword lists of the config.
// Usage: node merge-issues.js <work-dir> --config <qa-folder>/config/backlog.config.json
// Reads the output of collect-issues.js; writes <work-dir>/merged.json (every issue) and <work-dir>/candidates.json
// (score `minScore` or more, best first), and prints the candidates.
const fs = require('fs')
const path = require('path')
const { issueId, parseArgs, requireConfig, usage } = require('./lib')

const { args, config: maybeConfig } = parseArgs()
const config = requireConfig(maybeConfig, 'node merge-issues.js <work-dir>')
const [dir] = args
if (!dir) usage('node merge-issues.js <work-dir> --config <file>')

const byUrl = new Map()
const reposDir = path.join(dir, 'repos')
for (const file of fs.readdirSync(reposDir).filter(f => f.endsWith('.json'))) {
  for (const i of JSON.parse(fs.readFileSync(path.join(reposDir, file), 'utf8'))) {
    byUrl.set(i.url, {
      url: i.url,
      repo: i.repo,
      system: i.system,
      number: i.number,
      title: i.title,
      state: i.state,
      stateReason: i.stateReason,
      labels: i.labels.map(l => l.name),
      body: i.body || '',
      createdAt: i.createdAt,
      closedAt: i.closedAt,
    })
  }
}

// Board items add the status, team, and priority fields, and issues that the repository lists no longer return.
for (const project of config.github?.projects ?? []) {
  const projectFile = path.join(dir, `project-${project}.json`)
  if (!fs.existsSync(projectFile)) {
    console.error(`${projectFile} does not exist: the board fields are left empty`)
    continue
  }
  for (const item of JSON.parse(fs.readFileSync(projectFile, 'utf8')).items) {
    const c = item.content || {}
    if (c.type !== 'Issue') continue
    const issue = byUrl.get(c.url) || {
      url: c.url, repo: c.repository, system: 'github', number: c.number, title: c.title || item.title,
      state: undefined, labels: item.labels || [], body: c.body || '',
    }
    Object.assign(issue, { status: item.status, team: item.team, priority: item.priority })
    byUrl.set(c.url, issue)
  }
}
const all = [...byUrl.values()]

// The keyword lists of the config, as case-insensitive regular expressions (each entry is a regex fragment).
const words = name => new RegExp((config.keywords?.[name] ?? ['^\\b$']).join('|'), 'i')
// Words of the changed components and of rendering or comparing.
const STRONG = words('strong')
// Words of the document content that the changed components show.
const DOMAIN = words('domain')
// Words of areas that the change does not touch.
const EXCLUDE = words('exclude')

for (const i of all) {
  const text = i.title + '\n' + i.body
  i.score = (STRONG.test(i.title) ? 3 : 0) + (DOMAIN.test(i.title) ? 2 : 0) +
    (STRONG.test(text) ? 1 : 0) + (DOMAIN.test(text) ? 1 : 0)
  if (EXCLUDE.test(i.title)) i.score -= 3
  if (config.unrelatedTeam && i.team === config.unrelatedTeam && !STRONG.test(i.title)) i.score -= 2
}

fs.writeFileSync(path.join(dir, 'merged.json'), JSON.stringify(all, null, 1))
const candidates = all.filter(i => i.score >= config.minScore).sort((a, b) => b.score - a.score)
fs.writeFileSync(path.join(dir, 'candidates.json'), JSON.stringify(candidates, null, 1))
console.log(`issues: ${all.length}, candidates: ${candidates.length}`)
for (const i of candidates) {
  console.log([i.score, issueId(config, i), i.state || '-', i.status || '-', i.team || '-', i.labels.join(','), i.title]
    .join(' | '))
}
