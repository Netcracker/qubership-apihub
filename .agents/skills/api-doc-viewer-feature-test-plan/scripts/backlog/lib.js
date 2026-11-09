// Shared code of the backlog collection scripts: the config, issue IDs, and the GitHub and GitLab clients.
//
// Every script that talks to a tracker or reads the merged list takes `--config <file>`: the plan's
// config/backlog.config.json (see references/backlog.md of the skill for its fields). GitHub is read with the GitHub
// CLI (`gh`, signed in, `read:project` for boards). GitLab is read through its REST API with a token from the
// environment variable the config names (`tokenEnv`, GITLAB_TOKEN by default).
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

function usage(text) {
  console.error(`Usage: ${text}`)
  process.exit(2)
}

// The arguments without `--config <file>`, and the config itself (undefined when the option is absent).
function parseArgs() {
  const args = process.argv.slice(2)
  const at = args.indexOf('--config')
  if (at < 0) return { args, config: undefined }
  const file = args[at + 1]
  if (!file || !fs.existsSync(file)) usage(`--config <file>: ${file} does not exist`)
  const config = JSON.parse(fs.readFileSync(file, 'utf8'))
  args.splice(at, 2)
  return { args, config: { shortNamePrefix: '', minScore: 4, github: undefined, gitlab: undefined, ...config } }
}

function requireConfig(config, text) {
  if (!config) usage(`${text} --config <qa-folder>/config/backlog.config.json`)
  return config
}

// The short name of a repository in issue IDs and sample folders: the last path segment without the configured
// prefix. GitLab names start with "gl-", so that they do not clash with GitHub ones.
function shortName(config, repo) {
  const gitlab = repo.startsWith('gitlab:')
  const last = repo.replace(/^gitlab:/, '').split('/').pop().replace(new RegExp(`^${config.shortNamePrefix}`), '')
  return gitlab ? `gl-${last}` : last
}

// Short issue ID used by every script and by the test plan: "apihub#627", "apihub-ui#205", "gl-apihub#12".
function issueId(config, issue) {
  return `${shortName(config, issue.repo)}#${issue.number}`
}

// "apihub-ui#205" -> { system, repo, number } by the repositories of the config.
function parseIssueId(config, id) {
  const [short, number] = id.split('#')
  if (!short || !number) throw new Error(`Invalid issue id "${id}": expected <repo>#<number>, such as apihub#627`)
  for (const repo of config.github?.repos ?? []) {
    const full = `${config.github.owner}/${repo}`
    if (shortName(config, full) === short) return { system: 'github', repo: full, number }
  }
  for (const project of config.gitlab?.projects ?? []) {
    if (shortName(config, `gitlab:${project}`) === short) {
      return { system: 'gitlab', repo: `gitlab:${project}`, project, number }
    }
  }
  throw new Error(`Issue id "${id}": no repository of the config has the short name "${short}"`)
}

// Folder or file name of an issue: "apihub-ui#205" -> "apihub-ui-205".
function issueFolder(id) {
  return id.replace('#', '-')
}

function loadMergedIssues(config, dir) {
  const file = path.join(dir, 'merged.json')
  if (!fs.existsSync(file)) throw new Error(`${file} does not exist: run merge-issues.js first`)
  const all = JSON.parse(fs.readFileSync(file, 'utf8'))
  return new Map(all.map(issue => [issueId(config, issue), issue]))
}

function commentsFile(dir, id) {
  return path.join(dir, 'comments', issueFolder(id) + '.txt')
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 })
}

// A GET of the GitLab REST API; follows the pages of a list ("x-next-page").
async function gitlabGet(config, apiPath, { all = false } = {}) {
  const { host, tokenEnv = 'GITLAB_TOKEN' } = config.gitlab
  const token = process.env[tokenEnv]
  if (!token) throw new Error(`Set ${tokenEnv} to a GitLab token with the read_api scope`)
  const results = []
  for (let page = 1; ; page++) {
    const separator = apiPath.includes('?') ? '&' : '?'
    const url = `${host.replace(/\/$/, '')}/api/v4/${apiPath}${all ? `${separator}per_page=100&page=${page}` : ''}`
    const response = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } })
    if (!response.ok) throw new Error(`GET ${url}: HTTP ${response.status}`)
    const body = await response.json()
    if (!all) return body
    results.push(...body)
    if (!response.headers.get('x-next-page')) return results
  }
}

const gitlabProjectId = project => encodeURIComponent(project)

module.exports = {
  usage,
  parseArgs,
  requireConfig,
  shortName,
  issueId,
  parseIssueId,
  issueFolder,
  loadMergedIssues,
  commentsFile,
  gh,
  gitlabGet,
  gitlabProjectId,
}
