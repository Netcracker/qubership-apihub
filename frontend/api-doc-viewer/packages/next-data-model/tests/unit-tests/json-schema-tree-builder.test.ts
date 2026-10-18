import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY, apiDiff } from "@netcracker/qubership-apihub-api-diff"
import fs from "fs"
import path from "path"
import yaml from "yaml"
import { JsonSchemaTreeBuilder } from "../../src/building-service/json-schema/tree/builder"
import {
  resolvePlainPropertyInitiallyExpanded,
  resolvePlainPropertyIsExpandable,
} from "../../src/building-service/json-schema/tree/node-visibility-data/kind-property"
import { JsonSchemaTreeWithDiffsBuilder } from "../../src/building-service/json-schema/tree-with-diffs/builder"
import { JsonSchemaTreeNodeKinds } from "../../src/model/json-schema/types/node-kind"
import { TreeNodeComplexityTypes } from "../../src/model/abstract/tree/tree-node.interface"
import { jsonSchemaHasOwnChildren } from "../../src/shared/json-schema/has-own-children"
import { simplifyConsole } from "../helpers/simplify-console"

describe("JsonSchemaTreeBuilder", () => {
  simplifyConsole()

  it("builds a simple object schema with property nodes", () => {
    const schema = {
      type: "object",
      title: "Person",
      properties: {
        name: {
          type: "string",
          description: "Full name",
        },
        age: {
          type: "integer",
        },
      },
      required: ["name"],
    }

    const tree = new JsonSchemaTreeBuilder({ source: schema }).build()

    expect(tree.root).toBeDefined()
    expect(tree.root!.kind).toBe(JsonSchemaTreeNodeKinds.ROOT)
    expect(tree.root!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
    expect(tree.root!.value()?.type).toBe("object")
    expect(tree.root!.value()?.title).toBe("Person")

    const propertyNodes = tree.root!.childrenNodes()
    expect(propertyNodes).toHaveLength(2)

    const nameNode = propertyNodes.find((node: any) => node.key === "name")
    const ageNode = propertyNodes.find((node: any) => node.key === "age")

    expect(nameNode).toBeDefined()
    expect(nameNode!.kind).toBe(JsonSchemaTreeNodeKinds.PROPERTY)
    expect(nameNode!.value()?.type).toBe("string")
    expect(nameNode!.meta()?.required).toBe(true)
    expect(nameNode!.value()?.description).toBe("Full name")

    expect(ageNode).toBeDefined()
    expect(ageNode!.kind).toBe(JsonSchemaTreeNodeKinds.PROPERTY)
    expect(ageNode!.value()?.type).toBe("integer")
    expect(ageNode!.meta()?.required).toBeFalsy()
  })

  it("keeps the raw source property key even when a display title is present", () => {
    const schema = {
      type: "object",
      properties: {
        internalKey: {
          type: "string",
          title: "Display Title",
        },
      },
    }

    const tree = new JsonSchemaTreeBuilder({ source: schema }).build()
    const propertyNode = tree.root!.childrenNodes()[0]

    expect(propertyNode.key).toBe("internalKey")
    expect(propertyNode.value()?.title).toBe("Display Title")
  })

  it("keeps the raw source property key for a self-referencing (circular) $ref property", () => {
    // Mirrors what api-unifier's denormalize() produces for a schema like:
    //   SelfObject: { type: object, properties: { child: { $ref: "#/.../SelfObject" } } }
    // The resolved "child" value is the very same object again (real JS circularity), and,
    // since the referenced schema declares no title of its own, denormalize() synthesizes
    // `title` from the $ref target name ("SelfObject"). Regression: that synthesized title
    // must not leak into node identity - the cycled node must still be keyed "child" (the raw
    // source property key), not "SelfObject" (the $ref target name).
    const selfObject: { type: string; title?: string; properties: Record<string, unknown> } = {
      type: "object",
      properties: {
        label: { type: "string" },
      },
    }
    selfObject.properties.child = selfObject
    selfObject.title = "SelfObject"

    const tree = new JsonSchemaTreeBuilder({ source: selfObject }).build()
    const childNode = tree.root!.childrenNodes().find((node: any) => node.key === "child")

    expect(childNode).toBeDefined()
    expect(childNode!.key).toBe("child")
    expect(childNode!.isCycle).toBe(true)
  })

  it("lets a cycle two hops deep expand: the isCycle clone shares its matched ancestor's children array and is expandable but starts collapsed", () => {
    // Mirrors the real circular sample shape (root wraps a property that $refs a self-referencing
    // schema): the FIRST "child" is a real, non-cyclic materialization (own children: label,
    // child); the SECOND "child" (nested one hop deeper) re-resolves the same raw schema object
    // and becomes the isCycle clone - sharing the first child's `_childrenNodes` array by
    // reference (per `createCycledClone`), not lazily re-materialized.
    const selfObject: { type: string; properties: Record<string, unknown> } = {
      type: "object",
      properties: {
        label: { type: "string" },
      },
    }
    selfObject.properties.child = selfObject

    const rootSchema = {
      type: "object",
      properties: {
        child: selfObject,
      },
    }

    const tree = new JsonSchemaTreeBuilder({ source: rootSchema }).build()
    const firstChild = tree.root!.childrenNodes().find((node: any) => node.key === "child")!

    expect(firstChild).toBeDefined()
    expect(firstChild.isCycle).toBe(false)
    expect(firstChild.childrenNodes().map((node: any) => node.key)).toEqual(["label", "child"])

    const secondChild = firstChild.childrenNodes().find((node: any) => node.key === "child")!
    expect(secondChild).toBeDefined()
    expect(secondChild.isCycle).toBe(true)
    // Same array reference, not merely equal content - proves the shared-reference mechanism.
    expect(secondChild.childrenNodes()).toBe(firstChild.childrenNodes())

    expect(resolvePlainPropertyIsExpandable(secondChild)).toBe(true)
    expect(resolvePlainPropertyInitiallyExpanded(secondChild, { expandedDepth: 10, level: 0 })).toBe(false)
  })

  it("creates complex nodes for combiner schemas", () => {
    const schema = {
      oneOf: [
        { type: "string" },
        { type: "number" },
      ],
    }

    const tree = new JsonSchemaTreeBuilder({ source: schema }).build()

    expect(tree.root!.type).toBe(TreeNodeComplexityTypes.COMPLEX)
    expect(tree.root!.kind).toBe(JsonSchemaTreeNodeKinds.ROOT)
    expect(tree.root!.nestedNodes()).toHaveLength(2)
  })

  it("creates simple combiner branch nodes with typed value()", () => {
    const schema = {
      type: "object",
      properties: {
        value: {
          oneOf: [
            {
              type: "object",
              description: "Object variant",
              properties: {
                nestedChanged: { type: "string", description: "Changed" },
                nestedUnchanged: { type: "string", description: "Unchanged" },
              },
            },
            {
              type: "number",
              description: "Number variant",
            },
          ],
        },
      },
    }

    const tree = new JsonSchemaTreeBuilder({ source: schema }).build()
    const valueProperty = tree.root!.childrenNodes().find((node: any) => node.key === "value")!

    expect(valueProperty.type).toBe(TreeNodeComplexityTypes.COMPLEX)
    expect(valueProperty.nestedNodes()).toHaveLength(2)

    const objectBranch = valueProperty.nestedNodes()[0]
    const numberBranch = valueProperty.nestedNodes()[1]

    expect(objectBranch.type).toBe(TreeNodeComplexityTypes.SIMPLE)
    expect(objectBranch.kind).toBe(JsonSchemaTreeNodeKinds.ONE_OF)
    expect(objectBranch.value()?.type).toBe("object")
    expect(objectBranch.value()?.description).toBe("Object variant")
    expect(objectBranch.childrenNodes()).toHaveLength(2)
    expect(objectBranch.childrenNodes().map((node: any) => node.key)).toEqual([
      "nestedChanged",
      "nestedUnchanged",
    ])

    expect(numberBranch.type).toBe(TreeNodeComplexityTypes.SIMPLE)
    expect(numberBranch.kind).toBe(JsonSchemaTreeNodeKinds.ONE_OF)
    expect(numberBranch.value()?.type).toBe("number")
    expect(numberBranch.value()?.description).toBe("Number variant")
    expect(numberBranch.childrenNodes()).toHaveLength(0)
  })

  it("hasOwnChildren matches children after full materialization", () => {
    const cases: { fragment: Record<string, unknown>; expectChildren: boolean }[] = [
      { fragment: { type: "string", minLength: 1 }, expectChildren: false },
      { fragment: { type: "object" }, expectChildren: false },
      {
        fragment: {
          type: "object",
          properties: { name: { type: "string" } },
        },
        expectChildren: true,
      },
      {
        fragment: {
          type: "array",
          items: { type: "string" },
        },
        expectChildren: true,
      },
      {
        fragment: {
          oneOf: [{ type: "string" }, { type: "number" }],
        },
        expectChildren: true,
      },
    ]

    for (const { fragment, expectChildren } of cases) {
      expect(jsonSchemaHasOwnChildren(fragment, undefined)).toBe(expectChildren)

      const tree = new JsonSchemaTreeBuilder({ source: fragment }).build()
      const root = tree.root!
      const hasMaterializedChildren = root.childrenNodes().length > 0 || root.nestedNodes().length > 0
      expect(hasMaterializedChildren).toBe(expectChildren)
    }
  })

  it("defers nested properties when materializeDepth is exceeded", () => {
    const schema = {
      type: "object",
      properties: {
        outer: {
          type: "object",
          properties: {
            inner: { type: "string" },
          },
        },
      },
    }

    const builder = new JsonSchemaTreeBuilder({ source: schema, materializeDepth: 2 })
    const tree = builder.build()
    const outer = tree.root!.childrenNodes().find((node: any) => node.key === "outer")!

    expect(outer.childrenNodes()).toHaveLength(0)

    builder.materializeChildren(outer, 2)
    expect(outer.childrenNodes()).toHaveLength(1)
    expect(outer.childrenNodes()[0].key).toBe("inner")
  })

  it("creates an items node when items is a schema object", () => {
    const schema = {
      type: "array",
      items: { type: "string" },
    }

    const tree = new JsonSchemaTreeBuilder({ source: schema }).build()
    const rootChildren = tree.root!.childrenNodes()

    expect(rootChildren).toHaveLength(1)
    expect(rootChildren[0].kind).toBe(JsonSchemaTreeNodeKinds.ITEMS)
    expect(rootChildren[0].value()?.type).toBe("string")
  })

  it("creates indexed item nodes directly when items is a tuple array", () => {
    const schema = {
      type: "array",
      items: [
        { type: "string" },
      ],
      additionalItems: { type: "integer" },
    }

    const tree = new JsonSchemaTreeBuilder({ source: schema }).build()
    const rootChildren = tree.root!.childrenNodes()

    expect(rootChildren.some((node: any) => node.kind === JsonSchemaTreeNodeKinds.ITEMS)).toBe(false)

    const itemNode = rootChildren.find((node: any) => node.kind === JsonSchemaTreeNodeKinds.ITEM)
    expect(itemNode).toBeDefined()
    expect(itemNode!.key).toBe(0)
    expect(itemNode!.value()?.type).toBe("string")

    const additionalItemsNode = rootChildren.find((node: any) => node.kind === JsonSchemaTreeNodeKinds.ADDITIONAL_ITEMS)
    expect(additionalItemsNode).toBeDefined()
    expect(additionalItemsNode!.value()?.type).toBe("integer")
  })

  it("creates an additionalProperties node with primitive value false", () => {
    const schema = {
      type: "object",
      properties: {
        first: { type: "string" },
        second: { type: "string" },
      },
      additionalProperties: false,
    }

    const tree = new JsonSchemaTreeBuilder({ source: schema }).build()
    const additionalPropertiesNode = tree.root!.childrenNodes().find(
      (node: any) => node.kind === JsonSchemaTreeNodeKinds.ADDITIONAL_PROPERTIES,
    )

    expect(additionalPropertiesNode).toBeDefined()
    expect(additionalPropertiesNode!.value()).toBe(false)
    expect(additionalPropertiesNode!.meta()?._fragment).toBe(false)
    expect(additionalPropertiesNode!.childrenNodes()).toHaveLength(0)
  })

  it("creates an additionalProperties node with type any when value is true", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      additionalProperties: true,
    }

    const tree = new JsonSchemaTreeBuilder({ source: schema }).build()
    const additionalPropertiesNode = tree.root!.childrenNodes().find(
      (node: any) => node.kind === JsonSchemaTreeNodeKinds.ADDITIONAL_PROPERTIES,
    )

    expect(additionalPropertiesNode).toBeDefined()
    expect(additionalPropertiesNode!.value()).toEqual({ type: "any" })
    expect(additionalPropertiesNode!.meta()?._fragment).toBe(true)
  })
})

describe("JsonSchemaTreeBuilder circular combiner variants (with diffs)", () => {
  simplifyConsole()

  const DIFF_META_KEYS = {
    diffsMetaKey: DIFF_META_KEY,
    aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
  }

  function buildTreeFromCircularFixture(fixtureDirName: string) {
    const fixtureDir = path.resolve(
      __dirname,
      `../../../samples/json-schema-diffs/type-changes/circular/${fixtureDirName}`,
    )
    const before = yaml.parse(fs.readFileSync(path.join(fixtureDir, "before.yaml"), "utf8"))
    const after = yaml.parse(fs.readFileSync(path.join(fixtureDir, "after.yaml"), "utf8"))

    const beforeDocument = {
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      components: {
        schemas: {
          __Substitution__: before.beforeSchema,
          ...(before.beforeAdditionalComponents?.schemas ?? {}),
        },
      },
    }
    const afterDocument = {
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      components: {
        schemas: {
          __Substitution__: after.afterSchema,
          ...(after.afterAdditionalComponents?.schemas ?? {}),
        },
      },
    }

    const result = apiDiff(beforeDocument, afterDocument, {
      beforeSource: beforeDocument,
      afterSource: afterDocument,
      metaKey: DIFF_META_KEY,
    }) as { merged: { components: { schemas: { __Substitution__: object } } } }
    const merged = result.merged.components.schemas.__Substitution__

    return new JsonSchemaTreeWithDiffsBuilder({
      source: merged,
      diffsMetaKeys: DIFF_META_KEYS,
    }).build()
  }

  function findFirstCyclicNode(node: any, visited = new Set<unknown>()): any {
    if (visited.has(node)) {
      return undefined
    }
    visited.add(node)
    if (node.isCycle) {
      return node
    }
    for (const child of node.childrenNodes()) {
      const found = findFirstCyclicNode(child, visited)
      if (found) {
        return found
      }
    }
    for (const nested of node.nestedNodes()) {
      const found = findFirstCyclicNode(nested, visited)
      if (found) {
        return found
      }
    }
    return undefined
  }

  it("gives a cyclic combiner variant a populated, non-empty childrenNodes() (010-combiner-variant-cycle-description-updated)", () => {
    const tree = buildTreeFromCircularFixture("010-combiner-variant-cycle-description-updated")

    const valueProperty = tree.root!.childrenNodes().find((node: any) => node.key === "value")!
    expect(valueProperty).toBeDefined()
    expect(valueProperty.isCycle).toBe(false)
    expect(valueProperty.nestedNodes().length).toBeGreaterThan(0)

    // The cycle is detected one hop deeper than the combiner-owner property: it's the recurring
    // object *variant* (`oneOf` branch, not the `value`/`nested` property wrapping it) whose raw
    // fragment identity repeats - matching how `createCycledClone` shares `_childrenNodes` with
    // whichever ancestor node holds that same fragment.
    const cyclicNode = findFirstCyclicNode(tree.root!)
    expect(cyclicNode).toBeDefined()
    expect(cyclicNode.kind).toBe(JsonSchemaTreeNodeKinds.ONE_OF)

    // Shared-reference mechanism: the cyclic clone's own childrenNodes() is already populated
    // (same array reference as the ancestor object-variant node it matched), not lazily deferred.
    expect(cyclicNode.childrenNodes().length).toBeGreaterThan(0)
    const nestedProperty = cyclicNode.childrenNodes().find((node: any) => node.key === "nested")
    expect(nestedProperty).toBeDefined()
  })
})
