import {
  isExpandable,
  OVERFLOW_CHARACTERS_AMOUNT,
  OVERFLOW_LINES_AMOUNT,
  shortenValue,
} from "../src/components/shared-components/TextValue/shorten-text-value"

describe("shorten-text-value", () => {
  describe("isExpandable", () => {
    it("returns false for undefined/empty values", () => {
      expect(isExpandable(undefined)).toBe(false)
      expect(isExpandable("")).toBe(false)
    })

    it("returns false for a short, few-line value", () => {
      expect(isExpandable("short value")).toBe(false)
    })

    it("returns true when the value exceeds the character threshold, even on a single line", () => {
      const longSingleLine = "a".repeat(OVERFLOW_CHARACTERS_AMOUNT + 1)
      expect(isExpandable(longSingleLine)).toBe(true)
    })

    it("returns true when the value exceeds the line threshold, even if short in characters", () => {
      const manyShortLines = Array.from({ length: OVERFLOW_LINES_AMOUNT + 1 }, (_, i) => `l${i}`).join("\n")
      expect(isExpandable(manyShortLines)).toBe(true)
    })
  })

  describe("shortenValue", () => {
    it("returns undefined for undefined/empty values", () => {
      expect(shortenValue(undefined)).toBeUndefined()
      expect(shortenValue("")).toBeUndefined()
    })

    it("returns the value unchanged when it does not overflow", () => {
      expect(shortenValue("short value")).toBe("short value")
    })

    it("truncates by character count and appends an ellipsis, even on a single line", () => {
      const longSingleLine = "a".repeat(OVERFLOW_CHARACTERS_AMOUNT + 50)
      const shortened = shortenValue(longSingleLine)
      expect(shortened).toBe("a".repeat(OVERFLOW_CHARACTERS_AMOUNT) + "...")
    })

    it("truncates by line count and appends an ellipsis when within the character limit", () => {
      const manyShortLines = Array.from({ length: OVERFLOW_LINES_AMOUNT + 2 }, (_, i) => `l${i}`).join("\n")
      const shortened = shortenValue(manyShortLines)
      const expectedLines = Array.from({ length: OVERFLOW_LINES_AMOUNT }, (_, i) => `l${i}`)
      expect(shortened).toBe(expectedLines.join("\n") + "...")
    })
  })
})
