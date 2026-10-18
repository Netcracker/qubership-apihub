import { DiffAction } from "@netcracker/qubership-apihub-api-diff"
import {
  ChangedPropertyMetaData,
  DIFF_HIGHLIGHTING_MODES_DEFAULT,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaNestingLevel } from "./resolve-nesting-level"

function buildColorizingDiff(
  beforeIncreaseLevel: boolean,
  afterIncreaseLevel: boolean,
): ChangedPropertyMetaData {
  return {
    data: {
      type: "annotation",
      action: DiffAction.replace,
      scope: "root",
      description: "",
      beforeValue: undefined,
      afterValue: undefined,
      beforeDeclarationPaths: [],
      afterDeclarationPaths: [],
    },
    styles: {
      before: { isContentVisible: true, isHeaderVisible: true },
      after: { isContentVisible: true, isHeaderVisible: true },
    },
    flags: {
      before: { increaseLevel: beforeIncreaseLevel },
      after: { increaseLevel: afterIncreaseLevel },
    },
    highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
  }
}

describe("resolveNextLevelPair", () => {
  it("increments both sides when no colorizing diff is provided (today's default depth behaviour)", () => {
    expect(JsonSchemaNestingLevel.resolveNextLevelPair(0, 0, undefined)).toEqual({ beforeLevel: 1, afterLevel: 1 })
    expect(JsonSchemaNestingLevel.resolveNextLevelPair(2, 3, undefined)).toEqual({ beforeLevel: 3, afterLevel: 4 })
  })

  it("increments both sides when both flags are true", () => {
    const diff = buildColorizingDiff(true, true)
    expect(JsonSchemaNestingLevel.resolveNextLevelPair(1, 1, diff)).toEqual({ beforeLevel: 2, afterLevel: 2 })
  })

  it("freezes the origin side and increments the changed side (add: content absent on origin)", () => {
    const diff = buildColorizingDiff(false, true)
    expect(JsonSchemaNestingLevel.resolveNextLevelPair(2, 2, diff)).toEqual({ beforeLevel: 2, afterLevel: 3 })
  })

  it("freezes the changed side and increments the origin side (remove: content absent on changed)", () => {
    const diff = buildColorizingDiff(true, false)
    expect(JsonSchemaNestingLevel.resolveNextLevelPair(2, 2, diff)).toEqual({ beforeLevel: 3, afterLevel: 2 })
  })

  it("freezes both sides when both flags are false", () => {
    const diff = buildColorizingDiff(false, false)
    expect(JsonSchemaNestingLevel.resolveNextLevelPair(4, 4, diff)).toEqual({ beforeLevel: 4, afterLevel: 4 })
  })

  it("stays pinned across repeated applications at depth (idempotent flattening through a wholly-added subtree)", () => {
    const diff = buildColorizingDiff(false, true)
    const depth1 = JsonSchemaNestingLevel.resolveNextLevelPair(0, 0, diff)
    expect(depth1).toEqual({ beforeLevel: 0, afterLevel: 1 })
    const depth2 = JsonSchemaNestingLevel.resolveNextLevelPair(depth1.beforeLevel, depth1.afterLevel, diff)
    expect(depth2).toEqual({ beforeLevel: 0, afterLevel: 2 })
    const depth3 = JsonSchemaNestingLevel.resolveNextLevelPair(depth2.beforeLevel, depth2.afterLevel, diff)
    expect(depth3).toEqual({ beforeLevel: 0, afterLevel: 3 })
  })

  it("clamps a negative current level to 0 instead of going lower when frozen", () => {
    const diff = buildColorizingDiff(false, true)
    expect(JsonSchemaNestingLevel.resolveNextLevelPair(-1, -1, diff)).toEqual({ beforeLevel: 0, afterLevel: 0 })
  })
})
