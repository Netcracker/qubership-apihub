import { printString } from "../../src/print-graph-api/atomics.printer"

describe('printString', () => {
  it('should handle simple string without special characters', () => {
    const result = printString('Hello World')
    expect(result).toBe('"Hello World"')
  })

  it('should escape quotes in string', () => {
    const result = printString('Text with "quotes" inside')
    expect(result).toBe('"Text with \\"quotes\\" inside"')
  })

  it('should escape backslashes in string', () => {
    const result = printString('Path\\to\\file')
    expect(result).toBe('"Path\\\\to\\\\file"')
  })

  it('should escape newlines in string', () => {
    const result = printString('Line 1\nLine 2')
    expect(result).toBe('"Line 1\\nLine 2"')
  })

  it('should escape carriage returns in string', () => {
    const result = printString('Line 1\rLine 2')
    expect(result).toBe('"Line 1\\rLine 2"')
  })

  it('should escape tabs in string', () => {
    const result = printString('Text\twith\ttabs')
    expect(result).toBe('"Text\\twith\\ttabs"')
  })

  it('should escape backspace in string', () => {
    const result = printString('Text with\bbackspace')
    expect(result).toBe('"Text with\\bbackspace"')
  })

  it('should escape form feed in string', () => {
    const result = printString('Text with\fform feed')
    expect(result).toBe('"Text with\\fform feed"')
  })

  it('should handle multiple escape sequences', () => {
    const result = printString('Complex "string" with\nbackslashes\\and\ttabs')
    expect(result).toBe('"Complex \\"string\\" with\\nbackslashes\\\\and\\ttabs"')
  })

  it('should handle all control characters', () => {
    const result = printString('All: "quote" \\backslash \nnewline \rcarriage \ttab \bbackspace \fform')
    expect(result).toBe('"All: \\"quote\\" \\\\backslash \\nnewline \\rcarriage \\ttab \\bbackspace \\fform"')
  })

  
  it('should handle empty string', () => {
    const result = printString('')
    expect(result).toBe('""')
  })

  it('should handle string with only quotes', () => {
    const result = printString('"""')
    expect(result).toBe('"\\"\\"\\""')
  })
})
