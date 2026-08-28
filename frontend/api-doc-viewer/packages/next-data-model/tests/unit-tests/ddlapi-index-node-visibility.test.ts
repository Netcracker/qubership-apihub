import {
  DETAILED_DISPLAY_MODE,
  SIMPLE_DISPLAY_MODE,
  resolvePlainIndexListLastRowFlags,
  resolvePlainIndexNodeVisibility,
} from "@apihub/next-data-model/model/ddlapi/tree/node-visibility/kind-index"
import {
  resolveIndexListLastRowFlags,
  resolveIndexNodeVisibility,
} from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/node-visibility/kind-index"
import { DdlApiTreeNodeKinds } from "@apihub/next-data-model/model/ddlapi/types/node-kind"
import { DiffAction, nonBreaking } from "@netcracker/qubership-apihub-api-diff"

function makePlainIndexNode(value: Record<string, unknown> | null) {
  return {
    kind: DdlApiTreeNodeKinds.INDEX,
    value: () => value,
  }
}

function makeIndexNodeWithDiffs(
  value: Record<string, unknown> | null,
  diffs: Record<string, unknown> = {},
) {
  return {
    kind: DdlApiTreeNodeKinds.INDEX,
    value: () => value,
    diffs,
  }
}

describe("plain index node visibility", () => {
  it("shows only the title row in simple display mode", () => {
    const node = makePlainIndexNode({
      indexName: "idx_code",
      partNames: ["code"],
      isUnique: false,
      description: "note",
    })

    expect(resolvePlainIndexNodeVisibility(node as never, SIMPLE_DISPLAY_MODE)).toEqual({
      showDescription: false,
      showSubheader: true,
    })
  })

  it("shows description in detailed display mode when merged value has description", () => {
    const node = makePlainIndexNode({
      indexName: "idx_code",
      partNames: [],
      isUnique: true,
      description: "note",
    })

    expect(resolvePlainIndexNodeVisibility(node as never, DETAILED_DISPLAY_MODE)).toEqual({
      showDescription: true,
      showSubheader: true,
    })
  })

  it("hides subheader when index has no part names and is not unique", () => {
    const node = makePlainIndexNode({
      indexName: "idx_code",
      partNames: [],
      isUnique: false,
    })

    expect(resolvePlainIndexNodeVisibility(node as never, DETAILED_DISPLAY_MODE)).toEqual({
      showDescription: false,
      showSubheader: false,
    })
  })
})

describe("index node visibility with diffs", () => {
  it("shows description when only the description diff is present", () => {
    const node = makeIndexNodeWithDiffs(
      { indexName: "idx_code", partNames: ["code"], isUnique: false },
      {
        description: {
          data: {
            type: nonBreaking,
            action: DiffAction.add,
            scope: "root",
            afterValue: "note",
            afterDeclarationPaths: [["indexes", "idx_code", "description"]],
          },
        },
      },
    )

    expect(resolveIndexNodeVisibility(node as never, DETAILED_DISPLAY_MODE)).toEqual({
      showDescription: true,
      showSubheader: true,
    })
  })

  it("shows subheader when only the unique flag diff is present", () => {
    const node = makeIndexNodeWithDiffs(
      { indexName: "idx_code", partNames: [], isUnique: false },
      {
        isUnique: {
          data: {
            type: nonBreaking,
            action: DiffAction.add,
            scope: "root",
            afterValue: true,
            afterDeclarationPaths: [["indexes", "idx_code", "isUnique"]],
          },
        },
      },
    )

    expect(resolveIndexNodeVisibility(node as never, SIMPLE_DISPLAY_MODE)).toEqual({
      showDescription: false,
      showSubheader: true,
    })
  })
})

describe("index list-last-row flags", () => {
  it("marks the description row as the list tail when it is shown", () => {
    const visibility = {
      showDescription: true,
      showSubheader: true,
    }

    expect(resolveIndexListLastRowFlags(true, visibility)).toEqual({
      isTitleListLastRow: false,
      isDescriptionListLastRow: true,
    })
    expect(resolvePlainIndexListLastRowFlags(true, visibility)).toEqual(
      resolveIndexListLastRowFlags(true, visibility),
    )
  })

  it("marks the title row as the list tail when description is hidden", () => {
    const visibility = {
      showDescription: false,
      showSubheader: true,
    }

    expect(resolveIndexListLastRowFlags(true, visibility)).toEqual({
      isTitleListLastRow: true,
      isDescriptionListLastRow: false,
    })
  })
})
