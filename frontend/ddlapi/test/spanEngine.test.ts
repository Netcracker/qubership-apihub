import { parseStatements } from '../src/parser/pgParser'
import { resolveSpans, detectNewline, assembleSlice } from '../src/parser/spanEngine'

// The span engine itself is parser-agnostic (Buffer + StmtBoundary[]); these
// tests feed it realistic byte boundaries from the real parser rather than
// hand-computing offsets (which is error-prone for multibyte fixtures).
async function prep(src: string) {
  const buf = Buffer.from(src, 'utf8')
  const stmts = await parseStatements(src)
  const boundaries = stmts.map(s => ({ location: s.stmt_location ?? 0, len: s.stmt_len }))
  const spans = resolveSpans(buf, boundaries)
  const newline = detectNewline(buf)
  return {
    buf,
    spans,
    newline,
    extract: (selected: number[]) => assembleSlice(buf, spans, selected, newline),
  }
}

describe('spanEngine', () => {
  describe('verbatim single-statement fidelity', () => {
    test('plain statement equals input byte-for-byte', async () => {
      const src = 'CREATE TABLE x (id int);'
      const { extract } = await prep(src)
      expect(extract([0])).toBe(src)
    })

    test('leading line comment is preserved (file-first keeps comments)', async () => {
      const src = '-- hello\nCREATE TABLE x (id int);'
      const { extract } = await prep(src)
      expect(extract([0])).toBe(src)
    })

    test('leading block comment is preserved', async () => {
      const src = '/* a block\n   comment */\nCREATE TABLE x (id int);'
      const { extract } = await prep(src)
      expect(extract([0])).toBe(src)
    })

    test('multibyte identifiers and string literals slice exactly', async () => {
      const src = "CREATE TABLE \"café\" (note text DEFAULT 'ünïcödé');"
      const { extract } = await prep(src)
      expect(extract([0])).toBe(src)
    })

    test('statement with no leading trivia', async () => {
      const src = 'CREATE TABLE x (id int);'
      const { spans } = await prep(src)
      expect(spans[0]!.firstTokenStart).toBe(spans[0]!.start)
    })
  })

  describe('trailing semicolon handling', () => {
    test('last statement without ; gets one re-attached', async () => {
      const src = 'CREATE TABLE a (id int);\nCREATE TABLE b (id int)'
      const { extract } = await prep(src)
      expect(extract([1])).toBe('CREATE TABLE b (id int);')
    })

    test('source ; spelling (with space) is preserved', async () => {
      const src = 'CREATE TABLE x (id int) ;'
      const { extract } = await prep(src)
      expect(extract([0])).toBe('CREATE TABLE x (id int) ;')
    })
  })

  describe('empty selection', () => {
    test('no selected indices yields empty string', async () => {
      const { extract } = await prep('CREATE TABLE x (id int);')
      expect(extract([])).toBe('')
    })

    test('empty buffer assembles to empty string', () => {
      // parseStatements rejects empty input, so exercise the assembler directly.
      expect(assembleSlice(Buffer.from('', 'utf8'), [], [], '\n')).toBe('')
    })
  })

  describe('newline-aware seams', () => {
    test('LF source separates non-adjacent runs with a blank LF line', async () => {
      const src = 'CREATE TABLE a (id int);\nCREATE SEQUENCE s;\nCREATE TABLE b (id int);'
      const { extract, newline } = await prep(src)
      expect(newline).toBe('\n')
      // select stmt 0 and stmt 2, dropping the sequence in the middle
      expect(extract([0, 2])).toBe('CREATE TABLE a (id int);\n\nCREATE TABLE b (id int);')
    })

    test('CRLF source uses CRLF seams (no mixed line endings)', async () => {
      const src = 'CREATE TABLE a (id int);\r\nCREATE SEQUENCE s;\r\nCREATE TABLE b (id int);'
      const { extract, newline } = await prep(src)
      expect(newline).toBe('\r\n')
      const out = extract([0, 2])
      expect(out).toBe('CREATE TABLE a (id int);\r\n\r\nCREATE TABLE b (id int);')
      expect(out).not.toMatch(/[^\r]\n/) // every LF is preceded by CR
    })

    test('selection is sorted before assembly (adjacent → one verbatim run)', async () => {
      const src = 'CREATE TABLE a (id int);\nCREATE TABLE b (id int);'
      const { extract } = await prep(src)
      // indices 0 and 1 are adjacent → a single contiguous run copied verbatim,
      // regardless of the order they are passed in.
      expect(extract([1, 0])).toBe(src)
    })
  })

  describe('run-head comment trimming', () => {
    test('comment directly above a run head (dropped predecessor) is kept', async () => {
      const src = 'CREATE SEQUENCE s;\n-- the table\nCREATE TABLE x (id int);'
      const { extract } = await prep(src)
      expect(extract([1])).toBe('-- the table\nCREATE TABLE x (id int);')
    })

    test('comment separated from the run head by a blank line is trimmed', async () => {
      const src = 'CREATE SEQUENCE s;\n-- belongs to seq\n\nCREATE TABLE x (id int);'
      const { extract } = await prep(src)
      expect(extract([1])).toBe('CREATE TABLE x (id int);')
    })

    test('inside a contiguous run nothing is trimmed (interstitial comment kept verbatim)', async () => {
      const src = 'CREATE TABLE a (id int);\n-- between\nCREATE INDEX i ON a (id);'
      const { extract } = await prep(src)
      expect(extract([0, 1])).toBe(src)
    })
  })
})
