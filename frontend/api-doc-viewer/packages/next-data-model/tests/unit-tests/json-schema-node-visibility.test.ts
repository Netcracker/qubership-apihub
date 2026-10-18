import {
  DETAILED_DISPLAY_MODE,
  SIMPLE_DISPLAY_MODE,
} from "../../src/model/abstract/display-mode"
import {
  resolvePlainPropertyNodeVisibility,
  resolvePlainPropertyIsExpandable,
  resolvePlainPropertyInitiallyExpanded,
  resolvePlainPropertyExpanderExpanded,
} from "../../src/building-service/json-schema/tree/node-visibility-data/kind-property"
import {
  isPlainCombinerNodeKind,
  resolvePlainCombinerNodeVisibility,
} from "../../src/building-service/json-schema/tree/node-visibility-data/kind-combiner"
import { JsonSchemaTreeNodeKinds } from "../../src/model/json-schema/types/node-kind"
import { TreeNodeComplexityTypes } from "../../src/model/abstract/tree/tree-node.interface"

function makePropertyNode(value: Record<string, unknown> | null, children: unknown[] = []) {
  return {
    kind: JsonSchemaTreeNodeKinds.PROPERTY,
    isCycle: false,
    value: () => value,
    childrenNodes: () => children,
    meta: () => ({ _fragment: value }),
  }
}

function makeCombinerNode(kind: typeof JsonSchemaTreeNodeKinds.ONE_OF, nested: unknown[] = [], isCycle = false) {
  return {
    kind,
    isCycle,
    type: TreeNodeComplexityTypes.COMPLEX,
    nestedNodes: () => nested,
    childrenNodes: () => [],
  }
}

describe("plain JSON Schema property node visibility", () => {
  it("shows only the title row in simple display mode", () => {
    const node = makePropertyNode({
      type: "string",
      description: "note",
      default: "x",
      enum: ["a"],
      examples: [1],
    })

    expect(resolvePlainPropertyNodeVisibility(node.value(), SIMPLE_DISPLAY_MODE)).toEqual({
      showDescription: false,
      showDeprecationReasonRow: false,
      showDefaultRow: false,
      showExamplesRow: false,
      showEnumValuesRow: false,
      showValidationsSection: false,
      showExtensionsRow: false,
      showCustomAnnotationsRow: false,
      showContentSection: false,
      showAnyAdditionalInfoRow: false,
    })
  })

  it("shows description and additional info rows in detailed display mode", () => {
    const node = makePropertyNode({
      type: "string",
      description: "note",
      default: "x",
      enum: ["a"],
      minLength: 1,
    })

    expect(resolvePlainPropertyNodeVisibility(node.value(), DETAILED_DISPLAY_MODE)).toEqual({
      showDescription: true,
      showDeprecationReasonRow: false,
      showDefaultRow: true,
      showExamplesRow: false,
      showEnumValuesRow: true,
      showValidationsSection: true,
      showExtensionsRow: false,
      showCustomAnnotationsRow: false,
      showContentSection: true,
      showAnyAdditionalInfoRow: true,
    })
  })

  it("does not show validations section for enum-only schemas", () => {
    const node = makePropertyNode({
      type: "string",
      enum: ["a", "b"],
    })

    const visibility = resolvePlainPropertyNodeVisibility(node.value(), DETAILED_DISPLAY_MODE)
    expect(visibility.showEnumValuesRow).toBe(true)
    expect(visibility.showValidationsSection).toBe(false)
  })

  it("shows deprecation reason from x-deprecated-reason extension", () => {
    const node = makePropertyNode({
      type: "string",
      deprecated: true,
      extensions: {
        "x-deprecated-reason": "Use otherField instead",
      },
    })

    const visibility = resolvePlainPropertyNodeVisibility(node.value(), DETAILED_DISPLAY_MODE)
    expect(visibility.showDeprecationReasonRow).toBe(true)
    expect(visibility.deprecationReason).toBe("Use otherField instead")
  })

  it("marks empty leaf nodes as initially expanded and non-expandable", () => {
    const node = makePropertyNode({ type: "string" })

    expect(resolvePlainPropertyIsExpandable(node as never)).toBe(false)
    expect(resolvePlainPropertyInitiallyExpanded(node as never)).toBe(true)
  })

  it("marks nodes with children as expandable but not auto-expanded when children exist", () => {
    const child = { key: "child" }
    const node = makePropertyNode({ type: "object" }, [child])

    expect(resolvePlainPropertyIsExpandable(node as never)).toBe(true)
    expect(resolvePlainPropertyInitiallyExpanded(node as never)).toBe(false)
    expect(resolvePlainPropertyInitiallyExpanded(node as never, { expandedDepth: 2, level: 1 })).toBe(true)
    expect(resolvePlainPropertyInitiallyExpanded(node as never, { expandedDepth: 2, level: 2 })).toBe(false)
  })

  it("keeps expanded state false when structural children are deferred", () => {
    const deferredNode = makePropertyNode({
      type: "object",
      properties: {
        child: { type: "string" },
      },
    })

    expect(resolvePlainPropertyIsExpandable(deferredNode as never)).toBe(true)
    expect(resolvePlainPropertyExpanderExpanded(deferredNode as never, true)).toBe(false)
    expect(resolvePlainPropertyExpanderExpanded(deferredNode as never, false)).toBe(false)

    const materializedNode = makePropertyNode(
      { type: "object" },
      [{ key: "child" }],
    )

    expect(resolvePlainPropertyExpanderExpanded(materializedNode as never, true)).toBe(true)
    expect(resolvePlainPropertyExpanderExpanded(materializedNode as never, false)).toBe(false)
  })
})

describe("plain JSON Schema combiner node visibility", () => {
  it("shows selector when multiple nested options exist", () => {
    const node = makeCombinerNode(JsonSchemaTreeNodeKinds.ONE_OF, [{ id: "a" }, { id: "b" }])

    expect(resolvePlainCombinerNodeVisibility(node as never)).toEqual({
      showSelector: true,
      showSubheader: true,
      isExpandable: true,
      initiallyExpanded: true,
    })
  })

  it("shows selector even for a single nested option (matches legacy)", () => {
    const node = makeCombinerNode(JsonSchemaTreeNodeKinds.ANY_OF, [{ id: "a" }])

    expect(resolvePlainCombinerNodeVisibility(node as never).showSelector).toBe(true)
    expect(resolvePlainCombinerNodeVisibility(node as never).showSubheader).toBe(true)
  })

  it("hides selector when there are no nested options", () => {
    const node = makeCombinerNode(JsonSchemaTreeNodeKinds.ANY_OF, [])

    expect(resolvePlainCombinerNodeVisibility(node as never).showSelector).toBe(false)
    expect(resolvePlainCombinerNodeVisibility(node as never).showSubheader).toBe(false)
  })

  it("recognises combiner node kinds", () => {
    expect(isPlainCombinerNodeKind(JsonSchemaTreeNodeKinds.ONE_OF)).toBe(true)
    expect(isPlainCombinerNodeKind(JsonSchemaTreeNodeKinds.ALL_OF)).toBe(true)
    expect(isPlainCombinerNodeKind(JsonSchemaTreeNodeKinds.ANY_OF)).toBe(true)
    expect(isPlainCombinerNodeKind(JsonSchemaTreeNodeKinds.PROPERTY)).toBe(false)
  })
})
