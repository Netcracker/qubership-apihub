// Private module — pure, parser-agnostic source-span utilities for verbatim DDL
// extraction. Operates in UTF-8 *byte* space, matching libpg-query /
// libpg_query stmt_location / stmt_len offsets. Imports nothing from the parser.
//
// Responsibilities (no relevance logic lives here):
//   - resolve each statement's byte span (start / bodyEnd / semiEnd / firstTokenStart)
//   - detect the source's dominant newline style
//   - assemble a verbatim subset from a set of selected statement indices,
//     preserving contiguous runs byte-for-byte and normalizing the seams.

// ── byte constants ──────────────────────────────────────────────────────────────
const SPACE = 0x20
const TAB = 0x09
const LF = 0x0a
const CR = 0x0d
const FF = 0x0c
const VT = 0x0b
const DASH = 0x2d  // '-'
const SLASH = 0x2f // '/'
const STAR = 0x2a  // '*'
const SEMI = 0x3b  // ';'

function isWs(b: number): boolean {
  return b === SPACE || b === TAB || b === LF || b === CR || b === FF || b === VT
}

// ── public types ────────────────────────────────────────────────────────────────

/**
 * A statement's raw byte boundaries as reported by the parser.
 *   location — RawStmt.stmt_location (start of the leading-trivia region)
 *   len      — RawStmt.stmt_len, the body length excluding the trailing ';';
 *              undefined only for a final statement with no terminating ';'.
 */
export interface StmtBoundary {
  location: number
  len?: number
}

/** Resolved byte offsets for one statement (all in UTF-8 bytes). */
export interface ResolvedSpan {
  /** Start of the leading-trivia region (= boundary.location). */
  start: number
  /** End of the statement body, before any trailing ';'. */
  bodyEnd: number
  /** End including a directly-following ';' (and the whitespace up to it), else === bodyEnd. */
  semiEnd: number
  /** Offset of the first non-trivia byte in [start, bodyEnd). */
  firstTokenStart: number
}

// ── trivia scanning ──────────────────────────────────────────────────────────────

type TriviaItem = { kind: 'ws' | 'comment'; start: number; end: number }

/**
 * Scans whitespace and SQL comments from `from` up to `limit`, returning the
 * first non-trivia byte offset and the trivia items in order. Handles `--` line
 * comments and nested `/​* *​/` block comments.
 *
 * Only valid over a region known to hold no string literals — i.e. a statement's
 * leading-trivia region, before its first real token.
 */
function scanTrivia(buf: Buffer, from: number, limit: number): { firstTokenStart: number; items: TriviaItem[] } {
  const items: TriviaItem[] = []
  let i = from
  while (i < limit) {
    const b = buf[i]!
    if (isWs(b)) {
      const start = i
      while (i < limit && isWs(buf[i]!)) i++
      items.push({ kind: 'ws', start, end: i })
      continue
    }
    if (b === DASH && i + 1 < limit && buf[i + 1] === DASH) {
      const start = i
      i += 2
      while (i < limit && buf[i] !== LF) i++ // stop before the newline; ws item captures it
      items.push({ kind: 'comment', start, end: i })
      continue
    }
    if (b === SLASH && i + 1 < limit && buf[i + 1] === STAR) {
      const start = i
      i += 2
      let depth = 1 // PostgreSQL block comments nest
      while (i < limit && depth > 0) {
        if (buf[i] === SLASH && i + 1 < limit && buf[i + 1] === STAR) { depth++; i += 2; continue }
        if (buf[i] === STAR && i + 1 < limit && buf[i + 1] === SLASH) { depth--; i += 2; continue }
        i++
      }
      items.push({ kind: 'comment', start, end: i })
      continue
    }
    break // first non-trivia byte
  }
  return { firstTokenStart: i, items }
}

function countNewlines(buf: Buffer, start: number, end: number): number {
  let n = 0
  for (let i = start; i < end; i++) if (buf[i] === LF) n++
  return n
}

// ── span resolution ──────────────────────────────────────────────────────────────

/** Resolves the byte span of every statement from its parser boundary. */
export function resolveSpans(buf: Buffer, boundaries: readonly StmtBoundary[]): ResolvedSpan[] {
  return boundaries.map(b => {
    const start = b.location
    let bodyEnd: number
    if (b.len !== undefined) {
      bodyEnd = b.location + b.len
    } else {
      // Final statement with no trailing ';' — trim trailing whitespace.
      let e = buf.length
      while (e > start && isWs(buf[e - 1]!)) e--
      bodyEnd = e
    }
    const { firstTokenStart } = scanTrivia(buf, start, bodyEnd)
    const semiEnd = findTrailingSemicolon(buf, bodyEnd)
    return { start, bodyEnd, semiEnd, firstTokenStart }
  })
}

/** Returns the offset just past a `;` that immediately follows bodyEnd (over whitespace), else bodyEnd. */
function findTrailingSemicolon(buf: Buffer, bodyEnd: number): number {
  let i = bodyEnd
  while (i < buf.length && isWs(buf[i]!)) i++
  if (i < buf.length && buf[i] === SEMI) return i + 1
  return bodyEnd
}

// ── newline detection ────────────────────────────────────────────────────────────

/** Detects the source's dominant newline style; defaults to '\n'. */
export function detectNewline(buf: Buffer): '\n' | '\r\n' {
  let crlf = 0
  let lf = 0
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === LF) {
      if (i > 0 && buf[i - 1] === CR) crlf++
      else lf++
    }
  }
  return crlf > lf ? '\r\n' : '\n'
}

// ── leading-comment trimming ─────────────────────────────────────────────────────

/**
 * Computes where a run's emitted text should begin within the first statement's
 * leading-trivia region.
 *   - file-first statement: keep all comments, shed only the leading whitespace prefix.
 *   - run head after a dropped predecessor: keep only the comment block directly
 *     touching the statement (walk back, stop at the first blank line).
 */
function leadingStart(buf: Buffer, span: ResolvedSpan, isFileFirst: boolean): number {
  const { items, firstTokenStart } = scanTrivia(buf, span.start, span.bodyEnd)
  if (firstTokenStart === span.start) return span.start // no leading trivia

  if (isFileFirst) {
    const firstComment = items.find(it => it.kind === 'comment')
    return firstComment ? firstComment.start : firstTokenStart
  }

  // Dropped predecessor: keep the comment block directly touching the statement.
  let keptStart = firstTokenStart
  for (let k = items.length - 1; k >= 0; k--) {
    const it = items[k]!
    if (it.kind === 'ws') {
      if (countNewlines(buf, it.start, it.end) >= 2) break // blank line — boundary
    } else {
      keptStart = it.start
    }
  }
  return keptStart
}

// ── assembly ─────────────────────────────────────────────────────────────────────

/**
 * Assembles the verbatim DDL subset for the given selected statement indices.
 * Contiguous selected statements are copied byte-for-byte (preserving interstitial
 * comments and blank lines); non-adjacent runs are separated by one blank line in
 * the detected newline style. Each run's final statement is terminated with a ';'.
 */
export function assembleSlice(
  buf: Buffer,
  spans: readonly ResolvedSpan[],
  selected: readonly number[],
  newline: '\n' | '\r\n',
): string {
  if (selected.length === 0) return ''

  const sorted = [...selected].sort((a, b) => a - b)
  const runs: number[][] = []
  let cur: number[] = [sorted[0]!]
  for (let k = 1; k < sorted.length; k++) {
    if (sorted[k] === sorted[k - 1]! + 1) cur.push(sorted[k]!)
    else { runs.push(cur); cur = [sorted[k]!] }
  }
  runs.push(cur)

  const seam = newline + newline
  const parts: string[] = []
  for (const run of runs) {
    const first = spans[run[0]!]!
    const last = spans[run[run.length - 1]!]!
    const lead = leadingStart(buf, first, run[0] === 0)
    const core = buf.toString('utf8', lead, last.bodyEnd)
    const semi = last.semiEnd > last.bodyEnd ? buf.toString('utf8', last.bodyEnd, last.semiEnd) : ';'
    parts.push(core + semi)
  }
  return parts.join(seam)
}
