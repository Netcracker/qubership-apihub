'use strict'

/**
 * A small GitHub REST and GraphQL client for the AI Autonomous agent.
 *
 * `createClient({ token, repo, fetchImpl, apiUrl, sleep, now })` returns an object of async methods that all speak
 * JSON. `repo` is `owner/name`; every `{repo}` in a request path is replaced with it. `fetchImpl`, `sleep`, and `now`
 * are injectable so that tests never touch the network or wait for real time.
 *
 * Transient failures are retried up to MAX_RETRIES times: 502, 503, and 504, and 403 or 429 when GitHub signals a rate
 * limit (a `retry-after` header, or `x-ratelimit-remaining: 0`). Any other non-2xx response throws `GitHubError`.
 *
 * Environment: none. The caller passes the token.
 */

const API_VERSION = '2022-11-28'
const USER_AGENT = 'ai-autonomous-agent'
const MAX_RETRIES = 3
const MAX_WAIT_SECONDS = 60
const PAGE_SIZE = 100
const RETRYABLE_SERVER_STATUSES = new Set([502, 503, 504])
const WRITE_PERMISSIONS = new Set(['admin', 'maintain', 'write'])

/** A non-2xx response (or a GraphQL `errors` payload). `status` is the HTTP status, `body` the parsed payload. */
class GitHubError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
    this.body = body
  }
}

/** True for the permissions that may run agent commands: admin, maintain, write. */
function hasWriteAccess(permission) {
  return WRITE_PERMISSIONS.has(permission)
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Seconds to wait before a retry, or `null` when the response is not retryable. */
function retryDelaySeconds(response, attempt, nowMs) {
  const status = response.status
  const retryAfter = Number(response.headers.get('retry-after'))
  const hasRetryAfter = response.headers.has('retry-after') && Number.isFinite(retryAfter) && retryAfter >= 0
  const exhausted = response.headers.get('x-ratelimit-remaining') === '0'

  if (RETRYABLE_SERVER_STATUSES.has(status)) {
    // Exponential backoff (1, 2, 4 s) unless the server says how long to wait.
    return Math.min(hasRetryAfter ? retryAfter : 2 ** attempt, MAX_WAIT_SECONDS)
  }
  if (status === 403 || status === 429) {
    if (hasRetryAfter) {
      return Math.min(retryAfter, MAX_WAIT_SECONDS)
    }
    if (exhausted) {
      const reset = Number(response.headers.get('x-ratelimit-reset'))
      const untilReset = Number.isFinite(reset) && reset > 0 ? Math.ceil(reset - nowMs / 1000) : MAX_WAIT_SECONDS
      return Math.min(Math.max(untilReset, 1), MAX_WAIT_SECONDS)
    }
  }
  return null
}

/** The response body: parsed JSON, the raw text when it is not JSON, or `null` when empty. */
async function readBody(response) {
  const text = await response.text()
  if (text === '') {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function errorMessage(method, path, status, body) {
  const detail = body && typeof body === 'object' ? body.message : body
  return `GitHub ${method} ${path} failed with ${status}${detail ? `: ${String(detail).slice(0, 300)}` : ''}`
}

function createClient({
  token,
  repo,
  fetchImpl = fetch,
  apiUrl = 'https://api.github.com',
  sleep = defaultSleep,
  now = Date.now,
}) {
  const expand = (path) => path.replaceAll('{repo}', repo)

  /** `text: true` returns the body as text, also when it looks like JSON (a job log, for example). */
  async function request(method, path, { body, query, accept, text = false } = {}) {
    let url = apiUrl + expand(path)
    if (query) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      }
      const qs = params.toString()
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs
      }
    }
    const init = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept || 'application/vnd.github+json',
        'X-GitHub-Api-Version': API_VERSION,
        'User-Agent': USER_AGENT,
      },
    }
    if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }

    for (let attempt = 0; ; attempt += 1) {
      const response = await fetchImpl(url, init)
      if (response.ok) {
        if (response.status === 204) return null
        return text ? response.text() : readBody(response)
      }
      const delay = attempt < MAX_RETRIES ? retryDelaySeconds(response, attempt, now()) : null
      if (delay !== null) {
        await sleep(delay * 1000)
        continue
      }
      const errorBody = await readBody(response)
      throw new GitHubError(errorMessage(method, expand(path), response.status, errorBody), {
        status: response.status,
        body: errorBody,
      })
    }
  }

  /** All items of a list endpoint, fetched `per_page=100` at a time. */
  async function paginate(path, query = {}) {
    const items = []
    for (let page = 1; ; page += 1) {
      const batch = await request('GET', path, { query: { ...query, per_page: PAGE_SIZE, page } })
      if (!Array.isArray(batch)) {
        throw new GitHubError(`GitHub GET ${expand(path)} did not return a list`, { status: 200, body: batch })
      }
      items.push(...batch)
      if (batch.length < PAGE_SIZE) {
        return items
      }
    }
  }

  async function graphql(query, variables = {}) {
    const result = await request('POST', '/graphql', { body: { query, variables } })
    if (result && Array.isArray(result.errors) && result.errors.length > 0) {
      const messages = result.errors.map((e) => e.message).join('; ')
      throw new GitHubError(`GitHub GraphQL failed: ${messages}`, { status: 200, body: result })
    }
    return result
  }

  const getPull = (n) => request('GET', `/repos/{repo}/pulls/${n}`)
  const listPullFiles = (n) => paginate(`/repos/{repo}/pulls/${n}/files`)
  const listPullCommits = (n) => paginate(`/repos/{repo}/pulls/${n}/commits`)
  const getIssue = (n) => request('GET', `/repos/{repo}/issues/${n}`)
  const listIssueComments = (n) => paginate(`/repos/{repo}/issues/${n}/comments`)
  const createIssueComment = (n, body) => request('POST', `/repos/{repo}/issues/${n}/comments`, { body: { body } })
  const updateIssueComment = (id, body) => request('PATCH', `/repos/{repo}/issues/comments/${id}`, { body: { body } })
  const addLabels = (n, labels) => request('POST', `/repos/{repo}/issues/${n}/labels`, { body: { labels } })

  /** A label that is not on the issue is already the wanted state, so 404 is not an error. */
  async function removeLabel(n, label) {
    try {
      await request('DELETE', `/repos/{repo}/issues/${n}/labels/${encodeURIComponent(label)}`)
    } catch (error) {
      if (!(error instanceof GitHubError) || error.status !== 404) {
        throw error
      }
    }
  }

  /** The event is always COMMENT: the agent never approves or requests changes. */
  const createReview = (n, { commitId, body, comments = [] }) =>
    request('POST', `/repos/{repo}/pulls/${n}/reviews`, {
      body: {
        ...(commitId ? { commit_id: commitId } : {}),
        body,
        event: 'COMMENT',
        comments: comments.map((c) => ({ path: c.path, line: c.line, side: 'RIGHT', body: c.body })),
      },
    })

  /** `admin`, `maintain`, `write`, `triage`, `read`, or `none` (not a collaborator). */
  async function getPermission(login) {
    try {
      const result = await request('GET', `/repos/{repo}/collaborators/${encodeURIComponent(login)}/permission`)
      return result.role_name || result.permission || 'none'
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) {
        return 'none'
      }
      throw error
    }
  }

  /** The user the token belongs to: `login` and `id` give the Git identity of the agent's commits. */
  const getAuthenticatedUser = () => request('GET', '/user')

  /** Opens a pull request. The author is the owner of the client's token, so the caller picks which client to use. */
  const createPull = ({ title, head, base, body, draft = false }) =>
    request('POST', '/repos/{repo}/pulls', { body: { title, head, base, body, draft } })

  /** Changes the title and the description of a pull request. */
  const updatePull = (n, { title, body }) => request('PATCH', `/repos/{repo}/pulls/${n}`, { body: { title, body } })

  /** Open or closed pull requests of a branch: `head` is `owner:branch`. */
  const listPulls = ({ head, state = 'open' }) => paginate('/repos/{repo}/pulls', { head, state })

  /** Marks a draft pull request ready for review. Only GraphQL can do it; `nodeId` is `node_id` of the pull request. */
  const markPullReady = (nodeId) =>
    graphql(
      'mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { pullRequest { isDraft } } }',
      { id: nodeId },
    )

  /** Turns a ready pull request back into a draft. `nodeId` is `node_id` of the pull request. */
  const convertPullToDraft = (nodeId) =>
    graphql(
      'mutation($id: ID!) { convertPullRequestToDraft(input: { pullRequestId: $id }) { pullRequest { isDraft } } }',
      { id: nodeId },
    )

  /** The latest check run of every name on a commit; the endpoint wraps its list, so `paginate` does not fit. */
  async function listCheckRuns(sha) {
    const runs = []
    for (let page = 1; ; page += 1) {
      const result = await request('GET', `/repos/{repo}/commits/${sha}/check-runs`, {
        query: { filter: 'latest', per_page: PAGE_SIZE, page },
      })
      if (!Array.isArray(result?.check_runs)) {
        throw new GitHubError(`GitHub GET check-runs of ${sha} did not return a list`, { status: 200, body: result })
      }
      runs.push(...result.check_runs)
      if (result.check_runs.length < PAGE_SIZE) return runs
    }
  }

  /**
   * The commit statuses of a commit (the CLA check reports here), newest per context. `state` is the combined state of
   * GitHub, which is `pending` also when there are no statuses at all: judge `statuses`, not `state`.
   */
  async function getCombinedStatus(sha) {
    const statuses = []
    let combined = 'pending'
    for (let page = 1; ; page += 1) {
      const result = await request('GET', `/repos/{repo}/commits/${sha}/status`, {
        query: { per_page: PAGE_SIZE, page },
      })
      if (!Array.isArray(result?.statuses)) {
        throw new GitHubError(`GitHub GET status of ${sha} did not return a list`, { status: 200, body: result })
      }
      combined = result.state
      statuses.push(...result.statuses)
      if (result.statuses.length < PAGE_SIZE) return { state: combined, statuses }
    }
  }

  /** The log of one Actions job as text. GitHub answers with a redirect; `fetch` follows it. */
  const getJobLog = (jobId) => request('GET', `/repos/{repo}/actions/jobs/${jobId}/logs`, { text: true })

  /** Reruns the failed jobs of a workflow run (and the jobs that depend on them). Needs `actions: write`. */
  const rerunFailedJobs = (runId) => request('POST', `/repos/{repo}/actions/runs/${runId}/rerun-failed-jobs`)

  const addReaction = (commentId, content) =>
    request('POST', `/repos/{repo}/issues/comments/${commentId}/reactions`, { body: { content } })

  /**
   * Cancels a workflow run. Returns `true` when GitHub accepted the request and `false` for 409: the run has finished,
   * which is the state the caller wants. Needs `actions: write`.
   */
  async function cancelRun(runId) {
    try {
      await request('POST', `/repos/{repo}/actions/runs/${runId}/cancel`)
      return true
    } catch (error) {
      if (error instanceof GitHubError && error.status === 409) return false
      throw error
    }
  }

  /** Replies in the thread of a review comment; `commentId` is the `databaseId` of the first comment of the thread. */
  const replyToReviewComment = (n, commentId, body) =>
    request('POST', `/repos/{repo}/pulls/${n}/comments/${commentId}/replies`, { body: { body } })

  /**
   * The first 100 review threads of a pull request, each with its first 20 comments:
   * `{ id, isResolved, path, line, comments: [{ author, body, databaseId }] }`.
   */
  async function listReviewThreads(n) {
    const [owner, name] = repo.split('/')
    const result = await graphql(
      'query($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { ' +
        'pullRequest(number: $number) { reviewThreads(first: 100) { nodes { id isResolved path line ' +
        'comments(first: 20) { nodes { author { login } body databaseId } } } } } } }',
      { owner, name, number: Number(n) },
    )
    const nodes = result?.data?.repository?.pullRequest?.reviewThreads?.nodes
    if (!Array.isArray(nodes)) {
      throw new GitHubError(`GitHub GraphQL did not return the review threads of #${n}`, { status: 200, body: result })
    }
    return nodes.map((thread) => ({
      id: thread.id,
      isResolved: Boolean(thread.isResolved),
      path: thread.path ?? '',
      line: thread.line ?? null,
      comments: (thread.comments?.nodes ?? []).map((c) => ({
        author: c.author?.login ?? 'unknown',
        body: c.body ?? '',
        databaseId: c.databaseId ?? null,
      })),
    }))
  }

  return {
    request,
    paginate,
    graphql,
    getPull,
    listPullFiles,
    listPullCommits,
    getIssue,
    listIssueComments,
    createIssueComment,
    updateIssueComment,
    addLabels,
    removeLabel,
    createReview,
    getPermission,
    getAuthenticatedUser,
    createPull,
    updatePull,
    listPulls,
    convertPullToDraft,
    markPullReady,
    listCheckRuns,
    getCombinedStatus,
    getJobLog,
    rerunFailedJobs,
    addReaction,
    cancelRun,
    replyToReviewComment,
    listReviewThreads,
  }
}

module.exports = { createClient, GitHubError, hasWriteAccess }
