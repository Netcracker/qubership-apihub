import { isPrintableMultilineString, isPrintableString } from "../../src/print-graph-api/utils"

describe('isPrintableString', () => {
  it('returns false when any prohibited char is present', () => {
    const prohibited = [
      0x0000, 0x0001, 0x0002, 0x0003,
      0x0004, 0x0005, 0x0006, 0x0007,
      0x0008, 0x000b, 0x000c, 0x000d,
      0x000e, 0x000f
    ]
    prohibited.forEach(char => {
      const actual = isPrintableString('string with ' + String.fromCharCode(char) + ' char')
      expect(actual).toBe(false)
    })
  })

  it('returns true in other cases', () => {
    const actual = isPrintableString('Hello world')
    expect(actual).toBe(true)
  })

  it('string as simple if it does not have new line char', () => {
    const actual = isPrintableMultilineString('Hello world')
    expect(actual).toBe(false)
  })

  it('string as multiline if it has new line char', () => {
    const actual = isPrintableMultilineString('Hello\nworld')
    expect(actual).toBe(true)
  })
})
