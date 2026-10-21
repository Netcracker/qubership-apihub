/**
 * Finds the pull request of each commit, with the issues it closes:
 *
 *   1. a commit of this repository: the merged pull request associated with it (a squash merge has one);
 *   2. otherwise a trailing `(<owner>/<repo>#N)` or `(#N)` in the subject: imported polyrepo history,
 *      whose squash references the import rewrote to name the old repository;
 *   3. otherwise none: the notes list the commit itself.
 *
 * A resolver caches what it read, so components that share commits cost one lookup.
 */
const COMMIT_BATCH = 50
const PULL_BATCH = 20
const REFERENCE = /\((?:(?<owner>[\w.-]+)\/(?<repo>[\w.-]+))?#(?<number>\d+)\)\s*$/

/** `{ owner, repo, number }` of the trailing pull request reference in a subject, or null. */
function subjectReference(subject, owner, repo) {
  const m = subject.match(REFERENCE)
  if (!m) return null
  return { owner: m.groups.owner ?? owner, repo: m.groups.repo ?? repo, number: Number(m.groups.number) }
}

const pullKey = ({ owner, repo, number }) => `${owner}/${repo}#${number}`.toLowerCase()

function chunks(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

function commitQuery(owner, repo, shas) {
  const fields = shas.map(
    (sha, i) => `c${i}: object(oid: ${JSON.stringify(sha)}) { ... on Commit { author { user { login } } ` +
      'associatedPullRequests(first: 5) { nodes { number mergedAt baseRepository { nameWithOwner } } } } }',
  )
  return `query { repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(repo)}) { ${fields.join(' ')} } }`
}

function pullQuery(refs) {
  const byRepo = new Map()
  for (const ref of refs) {
    const name = `${ref.owner}/${ref.repo}`
    if (!byRepo.has(name)) byRepo.set(name, [])
    byRepo.get(name).push(ref)
  }
  const aliases = []
  const repos = [...byRepo.values()].map((list, r) => {
    const pulls = list.map((ref, p) => {
      aliases.push({ ref, path: `r${r}.p${p}` })
      return `p${p}: pullRequest(number: ${ref.number}) { number title url author { login } ` +
        'closingIssuesReferences(first: 10) { nodes { title url issueType { name } labels(first: 10) { nodes { name } } } } }'
    })
    return `r${r}: repository(owner: ${JSON.stringify(list[0].owner)}, name: ${JSON.stringify(list[0].repo)}) { ${pulls.join(' ')} }`
  })
  return { query: `query { ${repos.join(' ')} }`, aliases }
}

function toPull(node) {
  return {
    number: node.number,
    title: node.title.split(/\r?\n/)[0],
    url: node.url,
    author: node.author?.login ?? null,
    issues: (node.closingIssuesReferences?.nodes ?? []).map((i) => ({
      title: i.title,
      url: i.url,
      type: i.issueType?.name ?? null,
      labels: (i.labels?.nodes ?? []).map((l) => l.name),
    })),
  }
}

function createResolver(client, { owner, repo }) {
  const self = `${owner}/${repo}`.toLowerCase()
  const commitCache = new Map() // sha -> { login, pull: ref | null }
  const pullCache = new Map() // key -> pull | null

  async function readCommits(shas) {
    for (const batch of chunks(shas, COMMIT_BATCH)) {
      const { data } = await client.graphql(commitQuery(owner, repo, batch))
      if (!data?.repository) throw new Error(`cannot read the repository ${owner}/${repo}`)
      batch.forEach((sha, i) => {
        const node = data.repository?.[`c${i}`]
        const merged = (node?.associatedPullRequests?.nodes ?? [])
          .filter((p) => p.mergedAt && p.baseRepository?.nameWithOwner.toLowerCase() === self)
          .sort((a, b) => a.mergedAt.localeCompare(b.mergedAt))
        commitCache.set(sha, {
          login: node?.author?.user?.login ?? null,
          pull: merged.length ? { owner, repo, number: merged[0].number } : null,
        })
      })
    }
  }

  async function readPulls(refs) {
    for (const batch of chunks(refs, PULL_BATCH)) {
      const { query, aliases } = pullQuery(batch)
      // Only a single pull request may be missing (the number is an issue); an unreadable repository
      // would turn every reference into a bare commit line, so it fails the query.
      const { data, notFound } = await client.graphql(query, {}, { tolerateNotFound: (path) => path.includes('.') })
      for (const { ref, path } of aliases) {
        const [r, p] = path.split('.')
        if (!data?.[r]) throw new Error(`cannot read the repository ${ref.owner}/${ref.repo}`)
        const node = notFound.includes(path) ? null : data[r][p]
        pullCache.set(pullKey(ref), node ? toPull(node) : null)
      }
    }
  }

  /** `[{ commit, login, pull }]` in the order of `commits` (`{ sha, subject, ... }`); `pull` may be null. */
  async function resolve(commits) {
    const external = (c) => {
      const ref = subjectReference(c.subject, owner, repo)
      return ref && `${ref.owner}/${ref.repo}`.toLowerCase() !== self
    }
    await readCommits([...new Set(commits.filter((c) => !external(c) && !commitCache.has(c.sha)).map((c) => c.sha))])

    const refOf = (c) => commitCache.get(c.sha)?.pull ?? subjectReference(c.subject, owner, repo)
    const wanted = new Map()
    for (const c of commits) {
      const ref = refOf(c)
      if (ref && !pullCache.has(pullKey(ref))) wanted.set(pullKey(ref), ref)
    }
    await readPulls([...wanted.values()])

    return commits.map((c) => {
      const ref = refOf(c)
      return { commit: c, login: commitCache.get(c.sha)?.login ?? null, pull: ref ? pullCache.get(pullKey(ref)) : null }
    })
  }

  return { resolve }
}

module.exports = { createResolver, subjectReference }
