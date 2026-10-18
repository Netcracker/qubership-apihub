import { printProvidedArgValue } from '../../src/print-graph-api/definition-parts.printer'

describe('printProvidedArgValue', () => {
  it('no arg', () => {
    const actual = printProvidedArgValue(undefined)
    expect(actual).toBe('')
  })

  it('null', () => {
    const actual = printProvidedArgValue(null)
    expect(actual).toBe('null')
  })

  it('number', () => {
    const actual = printProvidedArgValue(1234)
    expect(actual).toBe('1234')
  })

  it('boolean', () => {
    const actual = printProvidedArgValue(false)
    expect(actual).toBe('false')
  })

  it('string', () => {
    const actual = printProvidedArgValue("test")
    expect(actual).toBe('"test"')
  })
})