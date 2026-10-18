import { printUsedDirectiveArgs } from "../../src/print-graph-api/definition-parts.printer"

describe('printUsedDirectiveArgs', () => {
  it('one arg', () => {
    const args = {
      first: 'Val',
    }
    const result = printUsedDirectiveArgs(args)
    const expected = '(first: "Val")'
    expect(result).toBe(expected)
  })

  it('several args', () => {
    const args = {
      first: 'Val',
      second: 123,
      third: true,
      fourth: null
    }
    const result = printUsedDirectiveArgs(args)
    const expected = '(first: "Val", second: 123, third: true, fourth: null)'
    expect(result).toBe(expected)
  })

  it('no args', () => {
    const args = {}
    const result = printUsedDirectiveArgs(args)
    expect(result).toBe('')
  })

  it('no input for function', () => {
    const args = {}
    const result = printUsedDirectiveArgs(args)
    expect(result).toBe('')
  })
})