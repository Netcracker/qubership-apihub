// Lists the file attachments (not images) of the selected issues, from the body and from the downloaded comments.
// Usage: node list-attachments.js <work-dir> --config <file> <repo#number> [<repo#number> ...] > attachments.tsv
// Prints one line per attachment: "<repo#number>\t<file name>\t<url>". GitHub attachments are
// https://github.com/user-attachments/files/… links; GitLab ones are "/uploads/<secret>/<file>" links of the
// project, listed as API URLs (GitLab 17.4 or later) that download-attachments.js fetches with the token.
const fs = require('fs')
const { commentsFile, gitlabProjectId, loadMergedIssues, parseArgs, parseIssueId, requireConfig, usage } =
  require('./lib')

const { args, config: maybeConfig } = parseArgs()
const config = requireConfig(maybeConfig, 'node list-attachments.js <work-dir> <repo#number> ...')
const [dir, ...ids] = args
if (!dir || !ids.length) usage('node list-attachments.js <work-dir> --config <file> <repo#number> [<repo#number> ...]')

const GITHUB_LINK = /\[([^\]]+)\]\((https:\/\/github\.com\/user-attachments\/files\/[^)\s]+)\)/g
const GITLAB_LINK = /\[([^\]]+)\]\((\/uploads\/([0-9a-f]+)\/([^)\s]+))\)/g

const issues = loadMergedIssues(config, dir)
for (const id of ids) {
  if (!issues.has(id)) console.error(`${id}: not in merged.json`)
  let text = (issues.get(id) || {}).body || ''
  const comments = commentsFile(dir, id)
  if (fs.existsSync(comments)) text += '\n' + fs.readFileSync(comments, 'utf8')
  const issue = parseIssueId(config, id)
  const seen = new Set()
  const print = (name, url) => {
    if (seen.has(url) || /\.(png|jpe?g|gif|svg|webp)$/i.test(url)) return
    seen.add(url)
    console.log([id, name, url].join('\t'))
  }
  if (issue.system === 'github') {
    for (const [, name, url] of text.matchAll(GITHUB_LINK)) print(name, url)
  } else {
    const host = config.gitlab.host.replace(/\/$/, '')
    for (const [, name, , secret, file] of text.matchAll(GITLAB_LINK)) {
      print(name, `${host}/api/v4/projects/${gitlabProjectId(issue.project)}/uploads/${secret}/${file}`)
    }
  }
}
