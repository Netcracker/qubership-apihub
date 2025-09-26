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
  
  it('should handle empty string', () => {
    const result = printString('')
    expect(result).toBe('""')
  })

  it('should handle string with only quotes', () => {
    const result = printString('"""')
    expect(result).toBe('"\\"\\"\\""')
  })
})
