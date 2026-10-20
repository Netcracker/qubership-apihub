/**
 * The work items of a sprint on the organization's Project 9 board, the way app-apihub-rns-generator.py
 * read them: cards whose Sprint is the release's sprint and whose Status is Done or In Test. An issue
 * card goes to Features, Bugfixes, or Other by issue type and lists its pull requests (the board's
 * "Pull requests" field and the pull requests that close it); a pull request card goes to Other.
 */
const PROJECT = { org: 'Netcracker', number: 9 }
const STATUSES = ['Done', 'In Test']
const WORK_SECTIONS = ['features', 'bugfixes', 'other']
const PAGE = 100

const PULL_FIELDS = 'url title author { login }'
const ITEMS_QUERY = `query($org: String!, $number: Int!, $cursor: String) {
  organization(login: $org) {
    projectV2(number: $number) {
      items(first: ${PAGE}, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          status: fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
          sprint: fieldValueByName(name: "Sprint") { ... on ProjectV2ItemFieldIterationValue { title } }
          pulls: fieldValueByName(name: "Pull requests") {
            ... on ProjectV2ItemFieldPullRequestValue { pullRequests(first: 10) { nodes { ${PULL_FIELDS} } } }
          }
          content {
            __typename
            ... on Issue {
              title url issueType { name } parent { title url }
              closedByPullRequestsReferences(first: 10, includeClosedPrs: true) { nodes { ${PULL_FIELDS} } }
            }
            ... on PullRequest { ${PULL_FIELDS} }
          }
        }
      }
    }
  }
}`

/** Every card of the board; the sprint filter runs locally, because the API cannot filter by field. */
async function fetchItems(client, project = PROJECT) {
  const items = []
  let cursor = null
  for (;;) {
    const { data } = await client.graphql(ITEMS_QUERY, { org: project.org, number: project.number, cursor })
    const page = data.organization?.projectV2?.items
    if (!page) throw new Error(`cannot read project ${project.number} of ${project.org}`)
    items.push(...page.nodes)
    if (!page.pageInfo.hasNextPage) return items
    cursor = page.pageInfo.endCursor
  }
}

const cell = (lines) => lines.join('<br/><br/>')
const escapeCell = (text) => String(text).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|')

/**
 * `{ features: [rows], bugfixes: [...], other: [...], hidden }`: rows of the `| Work item | Name | Author | Epic |`
 * table, and the number of the sprint's cards whose content the token cannot read (GitHub returns it as null).
 */
function workItemRows(items, sprint, statuses = STATUSES) {
  const rows = { features: [], bugfixes: [], other: [], hidden: 0 }
  for (const item of items) {
    const content = item.content
    if (item.sprint?.title !== sprint || !statuses.includes(item.status?.name)) continue
    if (!content) {
      rows.hidden++
      continue
    }
    if (content.__typename === 'PullRequest') {
      const author = content.author?.login ? `@${content.author.login}` : ''
      rows.other.push(
        `| ${cell(['No issue', `PR: <${content.url}>`])} | ${cell(['No issue', escapeCell(content.title)])} | ${author} | |`,
      )
      continue
    }
    if (content.__typename !== 'Issue') continue
    const pulls = []
    for (const p of [...(item.pulls?.pullRequests?.nodes ?? []), ...(content.closedByPullRequestsReferences?.nodes ?? [])]) {
      if (!pulls.some((q) => q.url === p.url)) pulls.push(p)
    }
    const authors = [...new Set(pulls.map((p) => p.author?.login).filter(Boolean))].sort().map((l) => `@${l}`)
    const epic = content.parent ? `[${escapeCell(content.parent.title)}](${content.parent.url})` : ''
    const row =
      `| ${cell([`Issue: <${content.url}>`, ...pulls.map((p) => `PR: <${p.url}>`)])} ` +
      `| ${cell([content.title, ...pulls.map((p) => p.title)].map(escapeCell))} | ${cell(authors)} | ${epic} |`
    const type = content.issueType?.name?.toLowerCase()
    rows[type === 'feature' ? 'features' : type === 'bug' ? 'bugfixes' : 'other'].push(row)
  }
  return rows
}

module.exports = { PROJECT, STATUSES, WORK_SECTIONS, fetchItems, workItemRows }
