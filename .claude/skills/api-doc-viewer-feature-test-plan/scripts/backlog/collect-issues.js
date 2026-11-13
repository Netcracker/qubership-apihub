// Downloads every open and closed issue of the configured repositories (GitHub and GitLab) and the items of the
// configured GitHub Projects (boards), as JSON.
// Usage: node collect-issues.js <work-dir> --config <qa-folder>/config/backlog.config.json
// Writes <work-dir>/repos/<system>__<repository>.json (each issue with `repo` and `system`) and
// <work-dir>/project-<number>.json. Keep <work-dir> outside the repository: it holds the text of every issue.
const fs = require('fs')
const path = require('path')
const { gh, gitlabGet, gitlabProjectId, parseArgs, requireConfig, usage } = require('./lib')

const { args, config: maybeConfig } = parseArgs()
const config = requireConfig(maybeConfig, 'node collect-issues.js <work-dir>')
const [dir] = args
if (!dir) usage('node collect-issues.js <work-dir> --config <file>')

const ISSUE_FIELDS = 'number,title,state,stateReason,labels,body,url,createdAt,closedAt,author'
const LIMIT = '5000'

async function main() {
  fs.mkdirSync(path.join(dir, 'repos'), { recursive: true })
  const write = (name, issues) => fs.writeFileSync(path.join(dir, 'repos', `${name}.json`), JSON.stringify(issues))
  let failed = 0

  for (const name of config.github?.repos ?? []) {
    const repo = `${config.github.owner}/${name}`
    try {
      const issues = JSON.parse(gh(['issue', 'list', '--repo', repo, '--state', 'all', '--limit', LIMIT,
        '--json', ISSUE_FIELDS])).map(issue => ({ ...issue, repo, system: 'github' }))
      write(`github__${name}`, issues)
      console.log(`${repo}: ${issues.length} issues`)
    } catch (error) {
      failed++
      console.error(`${repo}: failed: ${String(error.stderr || error.message).trim()}`)
    }
  }

  for (const project of config.github?.projects ?? []) {
    try {
      const json = gh(['project', 'item-list', String(project), '--owner', config.github.owner, '--limit', LIMIT,
        '--format', 'json'])
      fs.writeFileSync(path.join(dir, `project-${project}.json`), json)
      console.log(`project ${project}: ${JSON.parse(json).items.length} items`)
    } catch (error) {
      failed++
      console.error(`project ${project}: failed (the token needs the read:project scope): ` +
        String(error.stderr || error.message).trim())
    }
  }

  // GitLab issues in the shape of `gh issue list --json`.
  for (const project of config.gitlab?.projects ?? []) {
    try {
      const raw = await gitlabGet(config, `projects/${gitlabProjectId(project)}/issues?state=all`, { all: true })
      const issues = raw.map(issue => ({
        url: issue.web_url,
        number: issue.iid,
        title: issue.title,
        state: issue.state === 'opened' ? 'OPEN' : 'CLOSED',
        stateReason: '',
        labels: (issue.labels ?? []).map(label => ({ name: label })),
        body: issue.description ?? '',
        createdAt: issue.created_at,
        closedAt: issue.closed_at,
        repo: `gitlab:${project}`,
        system: 'gitlab',
      }))
      write(`gitlab__${project.replace(/\//g, '__')}`, issues)
      console.log(`gitlab:${project}: ${issues.length} issues`)
    } catch (error) {
      failed++
      console.error(`gitlab:${project}: failed: ${error.message}`)
    }
  }
  process.exit(failed ? 1 : 0)
}

main()
