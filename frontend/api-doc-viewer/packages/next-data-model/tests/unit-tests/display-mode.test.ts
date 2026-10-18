import {
  DETAILED_DISPLAY_MODE,
  SIMPLE_DISPLAY_MODE,
} from "@apihub/next-data-model/model/abstract/display-mode"
import {
  isDetailedDisplayMode,
  isSimpleDisplayMode,
} from "@apihub/next-data-model/model/abstract/guards/display-mode"

describe("display mode guards", () => {
  it("identifies simple display mode", () => {
    expect(isSimpleDisplayMode(SIMPLE_DISPLAY_MODE)).toBe(true)
    expect(isDetailedDisplayMode(SIMPLE_DISPLAY_MODE)).toBe(false)
  })

  it("identifies detailed display mode", () => {
    expect(isDetailedDisplayMode(DETAILED_DISPLAY_MODE)).toBe(true)
    expect(isSimpleDisplayMode(DETAILED_DISPLAY_MODE)).toBe(false)
  })
})
