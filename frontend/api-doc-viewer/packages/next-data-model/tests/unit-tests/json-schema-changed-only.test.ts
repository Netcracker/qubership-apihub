import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY, apiDiff } from "@netcracker/qubership-apihub-api-diff"
import {
  isJsonSchemaNodeChanged,
  resolveJsonSchemaUnchangedBlocks,
} from "../../src/building-service/json-schema/tree-with-diffs/changed-only"
import { resolveJsonSchemaPropertyInitiallyExpandedWithDiffs } from "../../src/building-service/json-schema/tree-with-diffs/node-visibility-data/kind-property-expand"
import { JsonSchemaTreeWithDiffsBuilder } from "../../src/building-service/json-schema/tree-with-diffs/builder"
import { JsonSchemaTreeNodeKinds } from "../../src/model/json-schema/types/node-kind"
import { TreeNodeComplexityTypes } from "../../src/model/abstract/tree/tree-node.interface"
import { isJsonSchemaTreeNodeWithDiffs } from "../../src/shared/json-schema/guards/tree-node"
import { simplifyConsole } from "../helpers/simplify-console"
import fs from "fs"
import path from "path"
import yaml from "yaml"

const DIFF_META_KEYS = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

function mergeSchemas(beforeSchema: object, afterSchema: object): object {
  const beforeDocument = {
    openapi: "3.0.0",
    info: { title: "Test", version: "1.0.0" },
    paths: {},
    components: {
      schemas: {
        __Substitution__: beforeSchema,
      },
    },
  }
  const afterDocument = {
    openapi: "3.0.0",
    info: { title: "Test", version: "1.0.0" },
    paths: {},
    components: {
      schemas: {
        __Substitution__: afterSchema,
      },
    },
  }

  return apiDiff(beforeDocument, afterDocument, {
    beforeSource: beforeDocument,
    afterSource: afterDocument,
    metaKey: DIFF_META_KEY,
  }).merged.components.schemas.__Substitution__ as object
}

function buildTreeFromFixture(relativeFixturePath: string) {
  const fixtureDir = path.resolve(
    __dirname,
    "../../../samples/json-schema-diffs/hiding-unchanged-rows",
    relativeFixturePath,
  )
  const beforeSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "before.yaml"), "utf8"))
  const afterSchema = yaml.parse(fs.readFileSync(path.join(fixtureDir, "after.yaml"), "utf8"))
  const merged = mergeSchemas(beforeSchema, afterSchema)
  return new JsonSchemaTreeWithDiffsBuilder({
    source: merged,
    diffsMetaKeys: DIFF_META_KEYS,
    materializeDepth: Number.MAX_SAFE_INTEGER,
  }).build()
}

function childKeys(tree: ReturnType<typeof buildTreeFromFixture>) {
  return tree.root!.childrenNodes().map((node) => String(node.key))
}

describe("JSON Schema changed-only data layer", () => {
  simplifyConsole()

  describe("isJsonSchemaNodeChanged", () => {
    it("marks added and removed properties as changed in case 1.2", () => {
      const tree = buildTreeFromFixture("simple-object/1.2-second-and-fifth-added-others-unchanged")
      const children = tree.root!.childrenNodes()

      const prop1 = children.find((node) => node.key === "prop1")
      const prop2 = children.find((node) => node.key === "prop2")
      const prop3 = children.find((node) => node.key === "prop3")
      const prop4 = children.find((node) => node.key === "prop4")
      const prop5 = children.find((node) => node.key === "prop5")

      expect(prop1).toBeDefined()
      expect(prop2).toBeDefined()
      expect(prop3).toBeDefined()
      expect(prop4).toBeDefined()
      expect(prop5).toBeDefined()

      expect(isJsonSchemaNodeChanged(prop1!)).toBe(false)
      expect(isJsonSchemaNodeChanged(prop2!)).toBe(true)
      expect(isJsonSchemaNodeChanged(prop3!)).toBe(false)
      expect(isJsonSchemaNodeChanged(prop4!)).toBe(false)
      expect(isJsonSchemaNodeChanged(prop5!)).toBe(true)
    })

    it("marks root as changed when only description changes in case 1.3", () => {
      const tree = buildTreeFromFixture("simple-object/1.3-root-description-replaced")
      expect(isJsonSchemaNodeChanged(tree.root!)).toBe(true)
    })

    it("marks nested object as changed when a nested property changes in case 2.8", () => {
      const tree = buildTreeFromFixture("complex-object/2.8-nested-property-metadata-and-constraints-changed")
      const prop2 = tree.root!.childrenNodes().find((node) => node.key === "prop2")
      const prop1 = tree.root!.childrenNodes().find((node) => node.key === "prop1")

      expect(prop2).toBeDefined()
      expect(prop1).toBeDefined()
      expect(isJsonSchemaNodeChanged(prop2!)).toBe(true)
      expect(isJsonSchemaNodeChanged(prop1!)).toBe(false)
    })

    it("marks nested object as changed when nested property is added or removed in case 2.5", () => {
      const tree = buildTreeFromFixture("complex-object/2.5-nested-prop-added-and-removed")
      const prop2 = tree.root!.childrenNodes().find((node) => node.key === "prop2")
      const prop4 = tree.root!.childrenNodes().find((node) => node.key === "prop4")

      expect(isJsonSchemaNodeChanged(prop2!)).toBe(true)
      expect(isJsonSchemaNodeChanged(prop4!)).toBe(true)
    })

    it("detects changes through nested oneOf branches", () => {
      const beforeSchema = {
        type: "object",
        properties: {
          status: {
            oneOf: [
              { type: "string" },
              { type: "number" },
            ],
          },
        },
      }
      const afterSchema = {
        type: "object",
        properties: {
          status: {
            oneOf: [
              { type: "string" },
              { type: "boolean" },
            ],
          },
        },
      }
      const merged = mergeSchemas(beforeSchema, afterSchema)
      const tree = new JsonSchemaTreeWithDiffsBuilder({
        source: merged,
        diffsMetaKeys: DIFF_META_KEYS,
        materializeDepth: Number.MAX_SAFE_INTEGER,
      }).build()

      const status = tree.root!.childrenNodes().find((node) => node.key === "status")
      expect(status).toBeDefined()
      expect(status!.type).toBe(TreeNodeComplexityTypes.COMPLEX)
      expect(isJsonSchemaNodeChanged(status!)).toBe(true)
    })

    it("uses own signals only for cycle nodes without walking shared children", () => {
      const owner: Record<string, unknown> = {
        type: "object",
        properties: {
          name: { type: "string" },
          address: {
            type: "object",
            properties: {
              city: { type: "string" },
            },
          },
        },
      }
      ;(owner.properties as Record<string, unknown>).resident = owner

      const beforeSchema = {
        type: "object",
        properties: {
          owner,
        },
      }
      const afterSchema = {
        type: "object",
        properties: {
          owner: {
            ...owner,
            properties: {
              ...(owner.properties as object),
              name: { type: "string", description: "Renamed owner" },
            },
          },
        },
      }
      const merged = mergeSchemas(beforeSchema, afterSchema)
      const tree = new JsonSchemaTreeWithDiffsBuilder({
        source: merged,
        diffsMetaKeys: DIFF_META_KEYS,
        materializeDepth: Number.MAX_SAFE_INTEGER,
      }).build()

      const ownerNode = tree.root!.childrenNodes().find((node) => node.key === "owner")
      expect(ownerNode).toBeDefined()

      const resident = ownerNode!.childrenNodes()
        .flatMap((node) => node.childrenNodes())
        .find((node) => node.key === "resident")
      expect(resident?.isCycle).toBe(true)

      expect(isJsonSchemaNodeChanged(resident!)).toBe(false)
      expect(isJsonSchemaNodeChanged(ownerNode!)).toBe(true)
    })
  })

  describe("resolveJsonSchemaUnchangedBlocks", () => {
    it("groups consecutive unchanged siblings in case 1.2", () => {
      const tree = buildTreeFromFixture("simple-object/1.2-second-and-fifth-added-others-unchanged")
      const children = tree.root!.childrenNodes().filter(isJsonSchemaTreeNodeWithDiffs)
      const { memberships, visibleSequence } = resolveJsonSchemaUnchangedBlocks(children)

      expect(childKeys(tree).sort()).toEqual(["prop1", "prop2", "prop3", "prop4", "prop5"].sort())

      const prop1 = children.find((node) => node.key === "prop1")!
      const prop2 = children.find((node) => node.key === "prop2")!
      const prop5 = children.find((node) => node.key === "prop5")!

      expect(memberships.filter((membership) => !membership.visible)).toHaveLength(3)
      expect(memberships.filter((membership) => membership.visible)).toHaveLength(2)

      const hiddenBlockId = prop1.id
      expect(memberships.every((membership, index) => {
        const child = children[index]
        if (child.key === "prop2" || child.key === "prop5") {
          return membership.visible
        }
        return !membership.visible && membership.unchangedBlockId === hiddenBlockId
      })).toBe(true)

      expect(visibleSequence.map((item) => (
        item.kind === "node" ? String(item.node.key) : "placeholder"
      ))).toEqual([
        "placeholder",
        String(prop2.key),
        String(prop5.key),
      ])

      const unchangedBlock = visibleSequence.find((item) => item.kind === "placeholder")
      expect(unchangedBlock && unchangedBlock.kind === "placeholder" && unchangedBlock.blockSize).toBe(3)
    })

    it("returns all visible when hideUnchangedNodes is false", () => {
      const tree = buildTreeFromFixture("simple-object/1.2-second-and-fifth-added-others-unchanged")
      const children = tree.root!.childrenNodes().filter(isJsonSchemaTreeNodeWithDiffs)
      const { memberships, visibleSequence } = resolveJsonSchemaUnchangedBlocks(children, {
        hideUnchangedNodes: false,
      })

      expect(memberships.every((membership) => membership.visible)).toBe(true)
      expect(visibleSequence).toHaveLength(children.length)
      expect(visibleSequence.every((item) => item.kind === "node")).toBe(true)
    })

    it("places list tail marker on trailing placeholder", () => {
      const tree = buildTreeFromFixture("simple-object/1.2-second-and-fifth-added-others-unchanged")
      const children = tree.root!.childrenNodes().filter(isJsonSchemaTreeNodeWithDiffs)
      const { visibleSequence } = resolveJsonSchemaUnchangedBlocks(children)

      const lastItem = visibleSequence[visibleSequence.length - 1]
      expect(lastItem.kind).toBe("node")
      if (lastItem.kind === "node") {
        expect(lastItem.node.key).toBe("prop5")
      }
    })

    it("hides unchanged descendant C while parent A and changed descendant B stay visible (design remark)", () => {
      const beforeSchema = {
        type: "object",
        properties: {
          parentA: {
            type: "object",
            properties: {
              childB: { type: "string", description: "before description" },
              childC: { type: "string", description: "unchanged nested field" },
            },
          },
        },
      }
      const afterSchema = {
        type: "object",
        properties: {
          parentA: {
            type: "object",
            properties: {
              childB: { type: "string", description: "after description" },
              childC: { type: "string", description: "unchanged nested field" },
            },
          },
        },
      }
      const merged = mergeSchemas(beforeSchema, afterSchema)
      const tree = new JsonSchemaTreeWithDiffsBuilder({
        source: merged,
        diffsMetaKeys: DIFF_META_KEYS,
        materializeDepth: Number.MAX_SAFE_INTEGER,
      }).build()

      const parentA = tree.root!.childrenNodes().find((node) => node.key === "parentA")
      expect(parentA).toBeDefined()

      const nestedChildren = parentA!.childrenNodes()
      const childB = nestedChildren.find((node) => node.key === "childB")
      const childC = nestedChildren.find((node) => node.key === "childC")
      expect(childB).toBeDefined()
      expect(childC).toBeDefined()

      expect(isJsonSchemaNodeChanged(parentA!)).toBe(true)
      expect(isJsonSchemaNodeChanged(childB!)).toBe(true)
      expect(isJsonSchemaNodeChanged(childC!)).toBe(false)

      const { visibleSequence } = resolveJsonSchemaUnchangedBlocks(
        nestedChildren.filter(isJsonSchemaTreeNodeWithDiffs),
      )
      const visibleKeys = visibleSequence
        .filter((item): item is Extract<typeof item, { kind: "node" }> => item.kind === "node")
        .map((item) => String(item.node.key))

      expect(visibleKeys).toContain("childB")
      expect(visibleKeys).not.toContain("childC")

      const childCPlaceholder = visibleSequence.find((item) => (
        item.kind === "placeholder" && item.blockSize === 1
      ))
      expect(childCPlaceholder).toBeDefined()
    })

    it("hides unchanged nested property under oneOf branch in case 4.1", () => {
      const tree = buildTreeFromFixture("combiners/4.1-oneof-variant-content-changed")
      const valueProperty = tree.root!.childrenNodes().find((node) => node.key === "value")
      expect(valueProperty).toBeDefined()

      const objectBranch = valueProperty!.nestedNodes()[0]
      const branchChildren = objectBranch.childrenNodes().filter(isJsonSchemaTreeNodeWithDiffs)
      const nestedChanged = branchChildren.find((node) => node.key === "nestedChanged")
      const nestedUnchanged = branchChildren.find((node) => node.key === "nestedUnchanged")

      expect(nestedChanged).toBeDefined()
      expect(nestedUnchanged).toBeDefined()
      expect(isJsonSchemaNodeChanged(nestedChanged!)).toBe(true)
      expect(isJsonSchemaNodeChanged(nestedUnchanged!)).toBe(false)

      const { visibleSequence } = resolveJsonSchemaUnchangedBlocks(branchChildren)
      const visibleKeys = visibleSequence
        .filter((item): item is Extract<typeof item, { kind: "node" }> => item.kind === "node")
        .map((item) => String(item.node.key))

      expect(visibleKeys).toEqual(["nestedChanged"])
      expect(visibleSequence.some((item) => item.kind === "placeholder" && item.blockSize === 1)).toBe(true)
    })
  })

  describe("resolveJsonSchemaPropertyInitiallyExpandedWithDiffs", () => {
    it("expands changed oneOf branch and collapses unchanged branch in case 4.1", () => {
      const tree = buildTreeFromFixture("combiners/4.1-oneof-variant-content-changed")
      const valueProperty = tree.root!.childrenNodes().find((node) => node.key === "value")
      expect(valueProperty).toBeDefined()

      const objectBranch = valueProperty!.nestedNodes()[0]
      const numberBranch = valueProperty!.nestedNodes()[1]

      expect(isJsonSchemaNodeChanged(objectBranch)).toBe(true)
      expect(isJsonSchemaNodeChanged(numberBranch)).toBe(false)
      expect(objectBranch.childrenNodes().length).toBeGreaterThan(0)
      expect(numberBranch.childrenNodes()).toHaveLength(0)

      expect(
        resolveJsonSchemaPropertyInitiallyExpandedWithDiffs(objectBranch, {
          expandedDepth: 5,
          level: 2,
          hideUnchangedNodes: true,
        }),
      ).toBe(true)
    })
  })
})
