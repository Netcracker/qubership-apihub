// Downloads the comments of the selected issues, which often hold the specification that reproduces a defect.
// Usage: node fetch-comments.js <work-dir> --config <file> <repo#number> [<repo#number> ...]
// Issue IDs use the short repository names of the config: apihub#627, apihub-ui#205, gl-apihub#12.
// Writes <work-dir>/comments/<repo>-<number>.txt: the comment bodies, separated by "---" lines.
const fs = require('fs')
const path = require('path')
const { commentsFile, gh, gitlabGet, gitlabProjectId, parseArgs, parseIssueId, requireConfig, usage } = require('./lib')

const { args, config: maybeConfig } = parseArgs()
const config = requireConfig(maybeConfig, 'node fetch-comments.js <work-dir> <repo#number> ...')
const [dir, ...ids] = args
if (!dir || !ids.length) usage('node fetch-comments.js <work-dir> --config <file> <repo#number> [<repo#number> ...]')

async function comments(id) {
  const issue = parseIssueId(config, id)
  if (issue.system === 'github') {
    return gh(['issue', 'view', issue.number, '--repo', issue.repo, '--json', 'comments',
      '--jq', '[.comments[].body] | join("\n\n---\n\n")'])
  }
  const notes = await gitlabGet(config,
    `projects/${gitlabProjectId(issue.project)}/issues/${issue.number}/notes?sort=asc`, { all: true })
  // System notes ("changed the label", "mentioned in") carry no content.
  return notes.filter(note => !note.system).map(note => note.body).join('\n\n---\n\n')
}

async function main() {
  fs.mkdirSync(path.join(dir, 'comments'), { recursive: true })
  let failed = 0
  for (const id of ids) {
    try {
      const bodies = await comments(id)
      fs.writeFileSync(commentsFile(dir, id), bodies)
      console.log(`${id}: ${bodies.length} characters`)
    } catch (error) {
      failed++
      console.error(`${id}: failed: ${String(error.stderr || error.message).trim()}`)
    }
  }
  process.exit(failed ? 1 : 0)
}

main()
