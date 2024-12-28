import { printBlock } from "../../src/print-graph-api/atomics.printer"

describe('printBlock', () => {
  it('empty array', () => {
    const actual = printBlock([])
    expect(actual).toBe('')
  })

  it('one item', () => {
    const source = ['first']
    const actual = printBlock(source)
    expect(actual).toBe(' {\n' + source.join('\n') + '\n}')
  })

  it('two items', () => {
    const source = ['first', 'second']
    const actual = printBlock(source)
    expect(actual).toBe(' {\n' + source.join('\n') + '\n}')
  })
})