#!/usr/bin/env node
// Tells the issues that a merged pull request closes in which versions the change is available.
//
// It runs after CI succeeds on a push to `develop`. The pull request is the one whose merge commit is the pushed
// commit. For every issue it closes, the script posts one comment with the version that System Information shows
// for each component: the backends and the build-task-consumer report the version of their `dev` image, the UI and
// api-processor the stamped version of their package (frontend/api-processor/scripts/build-id.mjs).
//
// A SECOND BUILD. CI publishes `dev` again on the next push. If that already happened when this runs, the image
// reports a newer commit than the merge; the comment says so, because the change is then in that version or later.
//
// ONCE PER COMMIT. The comment carries a marker with the short commit, so a rerun of CI posts nothing twice.
//
// Environment: GH_TOKEN, GITHUB_REPOSITORY, HEAD_SHA (the pushed commit), OWNER (the ghcr namespace),
// DRY_RUN=true to print the comments and post nothing, GITHUB_STEP_SUMMARY (optional).
'use strict'

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')

const SHORT_SHA_LENGTH = 7
const ROOT = path.resolve(__dirname, '..', '..')
const BUILD_ID_SCRIPT = path.join(ROOT, 'frontend', 'api-processor', 'scripts', 'build-id.mjs')
const UI_APP = 'portal'

// What System Information lists, in its order, plus the build-task-consumer. `image` is the ghcr package.
const IMAGE_COMPONENTS = [
  { name: 'Backend', image: 'qubership-apihub-backend' },
  { name: 'API Linter', image: 'qubership-api-linter-service' },
  { name: 'Agents Backend', image: 'qubership-apihub-agents-backend' },
  { name: 'Build task consumer', image: 'qubership-apihub-build-task-consumer' },
]
const UI_IMAGE = 'qubership-apihub-ui'

const MARKER_PREFIX = '<!-- available-in:'

// ---- pure ---------------------------------------------------------------------------------------------------

function markerFor(sha) {
  return `${MARKER_PREFIX}${sha.slice(0, SHORT_SHA_LENGTH)} -->`
}

// `docker buildx imagetools inspect --format '{{json .Image}}'` prints the config of a single-platform image, or an
// object keyed by platform. The environment is the same on every platform, so any config will do.
function pickImageConfig(inspected) {
  if (inspected && inspected.config) {
    return inspected.config
  }
  const first = Object.values(inspected || {}).find(value => value && value.config)
  return first ? first.config : undefined
}

function parseImageEnv(config) {
  const env = {}
  for (const entry of (config && config.Env) || []) {
    const separator = entry.indexOf('=')
    if (separator > 0) {
      env[entry.slice(0, separator)] = entry.slice(separator + 1)
    }
  }
  return env
}

// The same string the service reports: <branch>.<commit>.<build time>, or null when the image has no build info.
function imageVersion(env) {
  if (!env.GIT_BRANCH && !env.GIT_HASH) {
    return null
  }
  const version = `${env.GIT_BRANCH}.${env.GIT_HASH}`
  return env.BUILD_TIME ? `${version}.${env.BUILD_TIME}` : version
}

function closingIssueNumbers(closingIssuesReferences, repository) {
  return closingIssuesReferences
    .filter(issue => `${issue.repository.owner.login}/${issue.repository.name}`.toLowerCase() === repository.toLowerCase())
    .map(issue => issue.number)
}

/**
 * @param {{ sha: string, pull: number, components: Array<{ name: string, version: string | null, hash?: string | null,
 *   build?: string | null }> }} input `hash` is the commit that the image reports; `build` is the version of the
 *   image under a UI row.
 */
function renderComment({ sha, pull, components }) {
  const short = sha.slice(0, SHORT_SHA_LENGTH)
  const newer = components.filter(component => component.hash && component.hash !== short)
  const rows = components.map(component => {
    const version = component.version ? `\`${component.version}\`` : 'unknown'
    const build = component.build ? ` (image \`${component.build}\`)` : ''
    const later = newer.includes(component) ? ' *' : ''
    return `| ${component.name} | ${version}${build}${later} |`
  })
  const lines = [
    `Available in the following versions, built from the merge of #${pull} (\`${short}\`) into \`develop\`:`,
    '',
    '| Component | Version |',
    '|---|---|',
    ...rows,
  ]
  if (newer.length > 0) {
    lines.push('', '\\* A newer build of `develop` was already published, so this version includes the change and more.')
  }
  lines.push('', markerFor(sha))
  return lines.join('\n')
}

// ---- side effects -------------------------------------------------------------------------------------------

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...options })
}

function gh(args) {
  return JSON.parse(run('gh', args))
}

function mergedPullOf(repository, sha) {
  const pulls = gh(['api', `repos/${repository}/commits/${sha}/pulls`])
  return pulls.find(pull => pull.merged_at && pull.merge_commit_sha === sha && pull.base.ref === 'develop')
}

function closingIssues(repository, pull) {
  const [owner, name] = repository.split('/')
  const query = 'query($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { '
    + 'pullRequest(number: $number) { closingIssuesReferences(first: 50) { nodes { number repository { name owner { login } } } } } } }'
  const result = gh(['api', 'graphql', '-f', `query=${query}`, '-F', `owner=${owner}`, '-F', `name=${name}`, '-F', `number=${pull}`])
  return closingIssueNumbers(result.data.repository.pullRequest.closingIssuesReferences.nodes, repository)
}

function inspectImage(reference) {
  return JSON.parse(run('docker', ['buildx', 'imagetools', 'inspect', '--format', '{{json .Image}}', reference]))
}

function developTag() {
  return run('bash', [path.join(ROOT, 'tools', 'ci', 'branch-tag.sh'), 'refs/heads/develop']).trim()
}

async function stampedVersions() {
  const { stampedVersion } = await import(pathToFileURL(BUILD_ID_SCRIPT).href)
  return {
    apiProcessor: stampedVersion(path.join(ROOT, 'frontend', 'api-processor')),
    ui: stampedVersion(path.join(ROOT, 'frontend', 'ui', 'packages', UI_APP), { includeDevDependencies: true }),
  }
}

function imageEnv(owner, image, tag) {
  return parseImageEnv(pickImageConfig(inspectImage(`ghcr.io/${owner}/${image}:${tag}`)))
}

async function collectComponents(owner, tag) {
  const components = IMAGE_COMPONENTS.map(({ name, image }) => {
    const env = imageEnv(owner, image, tag)
    return { name, version: imageVersion(env), hash: env.GIT_HASH || null }
  })
  const stamped = await stampedVersions()
  const uiEnv = imageEnv(owner, UI_IMAGE, tag)
  components.push(
    { name: 'Frontend', version: stamped.ui, hash: uiEnv.GIT_HASH || null, build: imageVersion(uiEnv) },
    { name: 'API Processor', version: stamped.apiProcessor },
  )
  return components
}

function hasComment(repository, issue, marker) {
  const comments = gh(['api', '--paginate', '--slurp', `repos/${repository}/issues/${issue}/comments`]).flat()
  return comments.some(comment => comment.body && comment.body.includes(marker))
}

function postComment(repository, issue, body) {
  run('gh', ['api', `repos/${repository}/issues/${issue}/comments`, '-f', `body=${body}`])
}

function summarize(text) {
  console.log(text)
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`)
  }
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY
  const sha = process.env.HEAD_SHA
  const owner = (process.env.OWNER || repository.split('/')[0]).toLowerCase()
  const dryRun = process.env.DRY_RUN === 'true'

  const pull = mergedPullOf(repository, sha)
  if (!pull) {
    summarize(`The commit ${sha} is not the merge of a pull request into develop: nothing to announce.`)
    return
  }
  const issues = closingIssues(repository, pull.number)
  if (issues.length === 0) {
    summarize(`#${pull.number} closes no issue: nothing to announce.`)
    return
  }

  const components = await collectComponents(owner, developTag())
  const body = renderComment({ sha, pull: pull.number, components })
  const marker = markerFor(sha)
  for (const issue of issues) {
    if (dryRun) {
      summarize(`Would comment on #${issue}:\n\n${body}`)
    } else if (hasComment(repository, issue, marker)) {
      summarize(`#${issue} already has the comment for ${sha.slice(0, SHORT_SHA_LENGTH)}.`)
    } else {
      postComment(repository, issue, body)
      summarize(`Commented on #${issue}.`)
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = { closingIssueNumbers, imageVersion, markerFor, parseImageEnv, pickImageConfig, renderComment }
