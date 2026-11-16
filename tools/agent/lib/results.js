'use strict'
/**
 * One result comment per command family.
 *
 * The families are `analysis`, `implementation`, and `review`. `st.results` lists them as
 * `{ family, id, runs }`: `id` is a comment id, or `'state'` when the state comment itself holds the text. Each run is
 * listed in exactly one result comment, so the signature of a comment sums the runs it shows.
 */
const state = require('./state')
const signature = require('./signature')

const PLACEHOLDER = '### AI Autonomous agent'
const JSON_OPEN = '<!-- ai-autonomous-state-json'

/** The first line of a result comment that is not the state comment. It must not start with the state marker. */
const resultMarker = (family) => `<!-- ai-autonomous-result family=${family} -->`

const HEADINGS = [
  [/^### AI analysis\b/m, 'analysis'],
  [/^### AI (implementation|update)\b/m, 'implementation'],
  [/^### AI review\b/m, 'review'],
]

/** The family that owns the human part of a state comment, from its heading, or `null`. */
function legacyFamily(body) {
  const open = body.lastIndexOf(JSON_OPEN)
  const human = open === -1 ? body : body.slice(0, open)
  for (const [pattern, family] of HEADINGS) if (pattern.test(human)) return family
  return null
}

/**
 * The results of a state written before `results` existed: the owner of the state comment, with the runs of every
 * cost record except chat and CI-check replies. Empty without a state comment or an owner.
 */
function legacyResults(stateComment, st) {
  if (!stateComment) return []
  const family = legacyFamily(stateComment.body)
  if (!family) return []
  const runs = []
  for (const c of st.costs ?? []) {
    if (c?.flow === 'chat' || c?.flow === 'ci-check' || !c?.run || runs.includes(c.run)) continue
    runs.push(c.run)
  }
  return [{ family, id: 'state', runs }]
}

/**
 * Writes `human` as the result of `family` and writes the state. The comment of the family is reused, unless it is
 * gone or, for a new command (`newCommand`), is not the newest result comment of the agent. A result comment that is
 * not the state comment starts with `resultMarker`. Returns the state with the updated `results` and the numeric id
 * of the comment that holds the text.
 */
async function publishResult(gh, number, { family, human, st, run, newCommand = false, emptyState }) {
  const comments = await gh.listIssueComments(number)
  const stateComment = state.findStateComment(comments)
  const fresh = stateComment ? state.parse(stateComment.body) : null
  const base = state.mergeCosts(fresh, st ?? fresh ?? emptyState())
  // GitHub is the source of truth: a caller may hold a state loaded before another job of the same command wrote it.
  const stored = fresh?.results ?? base.results ?? legacyResults(stateComment, fresh ?? base)

  const positionOf = (entry) => {
    const id = entry.id === 'state' ? stateComment?.id : entry.id
    return comments.findIndex((c) => c.id === id)
  }
  const existing = stored.filter((e) => positionOf(e) !== -1)
  const newestPosition = Math.max(-1, ...existing.map(positionOf))
  let entry = existing.find((e) => e.family === family) ?? null
  if (entry && newCommand && positionOf(entry) < newestPosition) entry = null
  const others = existing.filter((e) => e.family !== family)

  // With no result comment at all, the state comment (or the first comment, when none exists) holds the text.
  if (!entry && others.length === 0) entry = { family, id: 'state', runs: [] }
  entry = entry ? { ...entry, runs: [...entry.runs] } : { family, id: null, runs: [] }
  if (run && !entry.runs.includes(run)) entry.runs.push(run)

  const records = signature.recordsOfRuns(base.costs, entry.runs)
  const text = signature.sign(human, records, { mainRole: signature.MAIN_ROLE[family] })

  if (entry.id === 'state') {
    const st2 = { ...base, results: [...others, entry] }
    const body = state.render(text, st2)
    if (stateComment) {
      await gh.updateIssueComment(stateComment.id, body)
      return { st: st2, commentId: stateComment.id }
    }
    return { st: st2, commentId: (await gh.createIssueComment(number, body)).id }
  }

  const resultBody = (t) => `${resultMarker(family)}\n${t}\n`
  let commentId = entry.id
  if (commentId !== null) {
    await gh.updateIssueComment(commentId, resultBody(text))
  } else {
    commentId = (await gh.createIssueComment(number, resultBody(text))).id
    entry.id = commentId
  }
  const st2 = { ...base, results: [...others, entry] }
  if (stateComment) {
    await gh.updateIssueComment(stateComment.id, state.replaceState(stateComment.body, st2))
  } else {
    await gh.createIssueComment(number, state.render(PLACEHOLDER, st2))
  }
  return { st: st2, commentId }
}

/** The text a dry run shows: `human` signed with the records of `run` only. */
function previewResult({ family, human, st, run }) {
  const records = signature.recordsOfRuns(st?.costs, [run])
  return signature.sign(human, records, { mainRole: signature.MAIN_ROLE[family] })
}

module.exports = { PLACEHOLDER, resultMarker, legacyResults, publishResult, previewResult }
