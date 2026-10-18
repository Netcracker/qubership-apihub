import { DiffAction } from "@netcracker/qubership-apihub-api-diff"
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { applyLevelReduction } from "./applyLevelReduction"

describe("applyLevelReduction", () => {
  it("returns baseLevel unchanged on both sides when reductionAction is undefined", () => {
    expect(applyLevelReduction(3, ORIGIN_LAYOUT_SIDE, undefined)).toBe(3)
    expect(applyLevelReduction(3, CHANGED_LAYOUT_SIDE, undefined)).toBe(3)
  })

  it("reduces only the origin side for DiffAction.add", () => {
    expect(applyLevelReduction(3, ORIGIN_LAYOUT_SIDE, DiffAction.add)).toBe(2)
    expect(applyLevelReduction(3, CHANGED_LAYOUT_SIDE, DiffAction.add)).toBe(3)
  })

  it("reduces only the changed side for DiffAction.remove", () => {
    expect(applyLevelReduction(3, CHANGED_LAYOUT_SIDE, DiffAction.remove)).toBe(2)
    expect(applyLevelReduction(3, ORIGIN_LAYOUT_SIDE, DiffAction.remove)).toBe(3)
  })

  it("clamps at 0 instead of going negative", () => {
    expect(applyLevelReduction(0, ORIGIN_LAYOUT_SIDE, DiffAction.add)).toBe(0)
    expect(applyLevelReduction(0, CHANGED_LAYOUT_SIDE, DiffAction.remove)).toBe(0)
  })
})
