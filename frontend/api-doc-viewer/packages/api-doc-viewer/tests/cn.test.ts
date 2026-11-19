import { cn } from "../src/utils/common/cn"

describe("cn", () => {
  it("prefixes every whitespace-separated token", () => {
    expect(cn("flex  px-4\nselected")).toBe("api-doc-viewer-flex api-doc-viewer-px-4 api-doc-viewer-selected")
  })

  it("prefixes Tailwind variants, negatives, important modifiers and arbitrary values as whole tokens", () => {
    expect(cn("hover:bg-gray-100 -mt-1 !mt-0 min-w-[16px] text-gray-400/[.8]")).toBe(
      "api-doc-viewer-hover:bg-gray-100 api-doc-viewer--mt-1 api-doc-viewer-!mt-0 " +
      "api-doc-viewer-min-w-[16px] api-doc-viewer-text-gray-400/[.8]",
    )
  })

  it("skips falsy and non-string values and flattens arrays", () => {
    expect(cn("a", false, null, undefined, 0, true, "", ["b", ["c", false]])).toBe(
      "api-doc-viewer-a api-doc-viewer-b api-doc-viewer-c",
    )
  })

  it("is idempotent, so a forwarded className can pass through cn() again", () => {
    const once = cn("flex", "selected")
    expect(cn(once)).toBe(once)
    expect(cn(once, "w-full")).toBe(`${once} api-doc-viewer-w-full`)
  })

  it("returns an empty string for no classes", () => {
    expect(cn()).toBe("")
    expect(cn(undefined, false)).toBe("")
  })
})
