import { NODE_LEVEL_DIFF_KEY } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import {
  DETAILED_DISPLAY_MODE,
  SIMPLE_DISPLAY_MODE,
  resolvePlainColumnAdditionalInfoRowUsesAfterRowPrecededBy,
  resolvePlainColumnListLastRowFlags,
  resolvePlainColumnNodeVisibility,
} from "@apihub/next-data-model/model/ddlapi/tree/node-visibility/kind-column"
import {
  resolveColumnAdditionalInfoRowUsesAfterRowPrecededBy,
  resolveColumnGeneratedExpressionSideDisplay,
  resolveColumnListLastRowFlags,
  resolveColumnNodeVisibility,
} from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/node-visibility/kind-column"
import { ORIGIN_LAYOUT_SIDE, CHANGED_LAYOUT_SIDE } from "@apihub/next-data-model/model/abstract/layout-side"
import { DdlApiTreeNodeKinds } from "@apihub/next-data-model/model/ddlapi/types/node-kind"
import { DiffAction, breaking, nonBreaking } from "@netcracker/qubership-apihub-api-diff"

function makePlainColumnNode(value: Record<string, unknown> | null) {
  return {
    kind: DdlApiTreeNodeKinds.COLUMN,
    value: () => value,
  }
}

function makeColumnNodeWithDiffs(
  value: Record<string, unknown> | null,
  diffs: Record<string, unknown> = {},
) {
  return {
    kind: DdlApiTreeNodeKinds.COLUMN,
    value: () => value,
    diffs,
  }
}

describe("plain column node visibility", () => {
  it("shows only the title row in simple display mode", () => {
    const node = makePlainColumnNode({
      columnName: "code",
      columnType: { label: "integer" },
      description: "note",
      enumValues: ["a"],
      defaultValue: "0",
      generatedExpression: "1 + 1",
    })

    expect(resolvePlainColumnNodeVisibility(node as never, SIMPLE_DISPLAY_MODE)).toEqual({
      showDescription: false,
      showEnumValuesRow: false,
      showDefaultRow: false,
      showGeneratedRow: false,
      showAnyAdditionalInfoRow: false,
    })
  })

  it("shows description and additional info rows in detailed display mode", () => {
    const node = makePlainColumnNode({
      columnName: "code",
      columnType: { label: "integer" },
      description: "note",
      enumValues: ["a"],
      defaultValue: "0",
    })

    expect(resolvePlainColumnNodeVisibility(node as never, DETAILED_DISPLAY_MODE)).toEqual({
      showDescription: true,
      showEnumValuesRow: true,
      showDefaultRow: true,
      showGeneratedRow: false,
      showAnyAdditionalInfoRow: true,
    })
  })
})

describe("column node visibility with diffs", () => {
  it("shows description when only the description diff is present", () => {
    const node = makeColumnNodeWithDiffs(
      { columnName: "code", columnType: { label: "integer" } },
      {
        description: {
          data: {
            type: nonBreaking,
            action: DiffAction.add,
            scope: "root",
            afterValue: "note",
            afterDeclarationPaths: [["columns", "code", "description"]],
          },
        },
      },
    )

    expect(resolveColumnNodeVisibility(node as never, DETAILED_DISPLAY_MODE).showDescription).toBe(true)
  })

  it("shows the default row when the whole column is added with a default", () => {
    const node = makeColumnNodeWithDiffs(
      {
        columnName: "code",
        columnType: { label: "integer" },
        defaultValue: "0",
      },
      {
        [NODE_LEVEL_DIFF_KEY]: {
          data: {
            type: nonBreaking,
            action: DiffAction.add,
            scope: "root",
            afterValue: { columnName: "code" },
            afterDeclarationPaths: [["columns", "code"]],
          },
        },
        defaultValue: {
          data: {
            type: nonBreaking,
            action: DiffAction.add,
            scope: "root",
            afterValue: "0",
            afterDeclarationPaths: [["columns", "code", "defaultValue"]],
          },
        },
      },
    )

    const visibility = resolveColumnNodeVisibility(node as never, DETAILED_DISPLAY_MODE)

    expect(visibility.showDefaultRow).toBe(true)
    expect(visibility.showGeneratedRow).toBe(false)
  })

  it("shows the generated row when only the generated expression diff is present", () => {
    const node = makeColumnNodeWithDiffs(
      { columnName: "code", columnType: { label: "integer" } },
      {
        generatedExpression: {
          data: {
            type: breaking,
            action: DiffAction.add,
            scope: "root",
            afterValue: "a + b",
            afterDeclarationPaths: [["columns", "code", "generatedExpression"]],
          },
        },
      },
    )

    expect(resolveColumnNodeVisibility(node as never, DETAILED_DISPLAY_MODE).showGeneratedRow).toBe(true)
  })
})

describe("column list-last-row flags", () => {
  it("marks the description row as the list tail when it is the only follow-on row", () => {
    const visibility = {
      showDescription: true,
      showEnumValuesRow: false,
      showDefaultRow: false,
      showGeneratedRow: false,
      showAnyAdditionalInfoRow: false,
    }

    expect(resolveColumnListLastRowFlags(true, visibility)).toEqual({
      isTitleListLastRow: false,
      isDescriptionListLastRow: true,
      isEnumAdditionalInfoListLastRow: false,
      isDefaultAdditionalInfoListLastRow: false,
      isGeneratedAdditionalInfoListLastRow: false,
    })
    expect(resolvePlainColumnListLastRowFlags(true, visibility)).toEqual(
      resolveColumnListLastRowFlags(true, visibility),
    )
  })
})

describe("column additional-info precededBy helper", () => {
  it("uses the after-row marker for default when enum values are visible", () => {
    const visibility = {
      showEnumValuesRow: true,
      showDefaultRow: true,
    }

    expect(resolveColumnAdditionalInfoRowUsesAfterRowPrecededBy(visibility, "default")).toBe(true)
    expect(resolvePlainColumnAdditionalInfoRowUsesAfterRowPrecededBy(visibility, "default")).toBe(true)
  })

  it("uses the after-row marker for generated when enum or default rows are visible", () => {
    expect(resolveColumnAdditionalInfoRowUsesAfterRowPrecededBy({
      showEnumValuesRow: false,
      showDefaultRow: true,
    }, "generated")).toBe(true)

    expect(resolveColumnAdditionalInfoRowUsesAfterRowPrecededBy({
      showEnumValuesRow: true,
      showDefaultRow: false,
    }, "generated")).toBe(true)
  })
})

describe("resolveColumnGeneratedExpressionSideDisplay", () => {
  it("returns side-specific generated expression text for add/remove/replace diffs", () => {
    const node = makeColumnNodeWithDiffs(
      { columnName: "summary", columnType: { label: "integer" }, generatedExpression: "b + c" },
      {
        generatedExpression: {
          data: {
            type: breaking,
            action: DiffAction.replace,
            scope: "root",
            beforeValue: "a + b",
            afterValue: "b + c",
            beforeDeclarationPaths: [["columns", "summary", "generatedExpression"]],
            afterDeclarationPaths: [["columns", "summary", "generatedExpression"]],
          },
        },
      },
    )

    expect(resolveColumnGeneratedExpressionSideDisplay(node as never, ORIGIN_LAYOUT_SIDE)).toBe("a + b")
    expect(resolveColumnGeneratedExpressionSideDisplay(node as never, CHANGED_LAYOUT_SIDE)).toBe("b + c")
  })
})
