import { printImplementedInterfaces } from "../../src/print-graph-api/definition-parts.printer"

describe('printImplementedInterfaces', () => {
  it('empty array', () => {
    const actual = printImplementedInterfaces([])
    expect(actual).toBe('')
  })

  it('one item', () => {
    const actual = printImplementedInterfaces([
      { $ref: '#/path/to/InterfaceA'}
    ])
    expect(actual).toBe(' implements InterfaceA')
  })

  it('two items', () => {
    const actual = printImplementedInterfaces([
      { $ref: '#/path/to/InterfaceA'},
      { $ref: '#/path/to/InterfaceB'},
    ])
    expect(actual).toBe(' implements InterfaceA & InterfaceB')
  })
})