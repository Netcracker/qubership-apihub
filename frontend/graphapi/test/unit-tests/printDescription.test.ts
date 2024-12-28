import { printDescription } from "../../src/print-graph-api/atomics.printer"

describe('printDescription', () => {
  it('no input for function', () => {
    const result = printDescription()
    expect(result).toBe('')
  })

  it('simple description', () => {
    const result = printDescription('Test')
    expect(result).toBe('"Test"\n')
  })

  it('simple description with indent', () => {
    const result = printDescription('Test', '  ')
    expect(result).toBe('  "Test"\n')
  })

  it('simple description, not first', () => {
    const result = printDescription('Test', undefined, false)
    expect(result).toBe('"Test"\n')
  })

  it('simple description, with indent, not first', () => {
    const result = printDescription('Test', '  ', false)
    expect(result).toBe('\n  "Test"\n')
  })

  it('multiline description', () => {
    const source = (
      'My Description\n' +
      '\t\t- First\n' +
      '\t\t    - Second\n' +
      '\t\t    \t\t\t- Third\n' +
      '\t~`!@#$%^&*()_+1234567890\n' +
      'blablabla\n'
    )
    const result = printDescription(source)
    expect(result).toBe('"""\n' + source + '\n"""\n')
  })

  it('multiline description, with indent', () => {
    const source = (
      'My Description\n' +
      '\t\t- First\n' +
      '\t\t    - Second\n' +
      '\t\t    \t\t\t- Third\n' +
      '\t~`!@#$%^&*()_+1234567890\n' +
      'blablabla'
    )
    const indent = '  '
    const result = printDescription(source, indent)
    expect(result).toBe(
      indent + '"""\n' +
      indent + 'My Description\n' +
      indent + '\t\t- First\n' +
      indent + '\t\t    - Second\n' +
      indent + '\t\t    \t\t\t- Third\n' +
      indent + '\t~`!@#$%^&*()_+1234567890\n' +
      indent + 'blablabla\n' +
      indent + '"""\n'
    )
  })

  it('multiline description, not first', () => {
    const source = (
      'My Description\n' +
      '\t\t- First\n' +
      '\t\t    - Second\n' +
      '\t\t    \t\t\t- Third\n' +
      '\t~`!@#$%^&*()_+1234567890\n' +
      'blablabla'
    )
    const result = printDescription(source, undefined, false)
    expect(result).toBe(
      '"""\n' +
      'My Description\n' +
      '\t\t- First\n' +
      '\t\t    - Second\n' +
      '\t\t    \t\t\t- Third\n' +
      '\t~`!@#$%^&*()_+1234567890\n' +
      'blablabla\n' +
      '"""\n'
    )
  })

  it('multiline description, with indent, not first', () => {
    const source = (
      'My Description\n' +
      '\t\t- First\n' +
      '\t\t    - Second\n' +
      '\t\t    \t\t\t- Third\n' +
      '\t~`!@#$%^&*()_+1234567890\n' +
      'blablabla'
    )
    const indent = '  '
    const result = printDescription(source, indent)
    expect(result).toBe(
      indent + '"""\n' +
      indent + 'My Description\n' +
      indent + '\t\t- First\n' +
      indent + '\t\t    - Second\n' +
      indent + '\t\t    \t\t\t- Third\n' +
      indent + '\t~`!@#$%^&*()_+1234567890\n' +
      indent + 'blablabla\n' +
      indent + '"""\n'
    )
  })
})