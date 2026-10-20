/**
 * A minimal GitHub GraphQL client for the release notes: retries network failures, 5xx answers, and
 * secondary rate limits; anything else is an error for the caller. With `tolerateNotFound`, `NOT_FOUND`
 * errors of the given field paths (a `#N` that names an issue, not a pull request) come back in
 * `notFound` instead of failing the query.
 */
const ENDPOINT = 'https://api.github.com/graphql'
const TIMEOUT_MS = 60000

class GraphqlError extends Error {}

function createClient({ token, fetch = globalThis.fetch, retries = 4, delayMs = 2000, sleep } = {}) {
  if (!token) throw new GraphqlError('a GitHub token is required')
  const wait = sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))

  /**
   * `{ data, notFound }`. `tolerateNotFound(path)` decides which NOT_FOUND paths (`a.b`) are not errors;
   * by default none is.
   */
  async function graphql(query, variables = {}, { tolerateNotFound = () => false } = {}) {
    for (let attempt = 0; ; attempt++) {
      let response
      try {
        response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      } catch (e) {
        if (attempt < retries) {
          await wait(delayMs * 2 ** attempt)
          continue
        }
        throw new GraphqlError(`GitHub GraphQL request failed: ${e.message}`)
      }
      const retryAfter = Number(response.headers.get('retry-after'))
      const limited = response.status === 429 || (response.status === 403 && retryAfter > 0)
      if ((response.status >= 500 || limited) && attempt < retries) {
        await wait(limited ? Math.min(retryAfter, 60) * 1000 : delayMs * 2 ** attempt)
        continue
      }
      const text = await response.text()
      if (!response.ok) throw new GraphqlError(`GitHub GraphQL answered ${response.status}: ${text.slice(0, 500)}`)
      const body = JSON.parse(text)
      const errors = body.errors ?? []
      const tolerated = (e) => e.type === 'NOT_FOUND' && e.path?.length && tolerateNotFound(e.path.join('.'))
      const notFound = errors.filter(tolerated).map((e) => e.path.join('.'))
      const fatal = errors.filter((e) => !tolerated(e))
      if (fatal.length) {
        throw new GraphqlError(`GitHub GraphQL errors: ${fatal.map((e) => e.message).join('; ')}`)
      }
      return { data: body.data, notFound }
    }
  }

  return { graphql }
}

/** `{ owner, repo }` of `https://github.com/<owner>/<repo>`. */
function parseRepoUrl(url) {
  const m = String(url).match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/)
  if (!m) throw new GraphqlError(`not a GitHub repository URL: ${url}`)
  return { owner: m[1], repo: m[2] }
}

module.exports = { ENDPOINT, GraphqlError, createClient, parseRepoUrl }
