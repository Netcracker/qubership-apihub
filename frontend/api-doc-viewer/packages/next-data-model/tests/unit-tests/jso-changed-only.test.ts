import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY, apiDiff } from "@netcracker/qubership-apihub-api-diff"
import fs from "fs"
import path from "path"
import yaml from "yaml"
import { isJsoNodeChanged, resolveJsoUnchangedBlocks } from "../../src/building-service/jso/tree-with-diffs/changed-only"
import { JsoTreeWithDiffsBuilder } from "../../src/building-service/jso/tree-with-diffs/builder"
import { JsoTreeNodeWithDiffs } from "../../src/model/jso/types/aliases"
import { simplifyConsole } from "../helpers/simplify-console"

const DIFF_META_KEYS = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

/** The JSO Diffs Suite template: the JSO document is an AsyncAPI operation binding (stories/preprocess.ts). */
function asyncApiTemplate(jso: unknown): Record<string, unknown> {
  return {
    asyncapi: "3.0.0",
    operations: {
      operation: {
        action: "send",
        channel: { $ref: "#/channels/channel" },
        messages: [{ $ref: "#/channels/channel/messages/message" }],
        bindings: { binding: jso },
      },
    },
    channels: { channel: { messages: { message: { name: "Test Message" } } } },
  }
}

function buildTreeFromFixture(relativeFixturePath: string) {
  const fixtureDir = path.resolve(__dirname, "../../../samples/jso-diffs/hiding-unchanged-nodes", relativeFixturePath)
  const before = asyncApiTemplate(yaml.parse(fs.readFileSync(path.join(fixtureDir, "before.yaml"), "utf8")))
  const after = asyncApiTemplate(yaml.parse(fs.readFileSync(path.join(fixtureDir, "after.yaml"), "utf8")))
  const { merged } = apiDiff(before, after, {
    beforeSource: before,
    afterSource: after,
    metaKey: DIFF_META_KEY,
    validate: true,
    liftCombiners: true,
    unify: true,
  })
  const source = (merged as { operations: Record<string, { bindings: Record<string, unknown> }> })
    .operations.operation.bindings.binding
  return new JsoTreeWithDiffsBuilder({ source, diffsMetaKeys: DIFF_META_KEYS }).build()
}

function child(node: JsoTreeNodeWithDiffs, key: string): JsoTreeNodeWithDiffs {
  const found = node.childrenNodes().find((candidate) => String(candidate.key) === key)
  if (!found) {
    throw new Error(`no child ${key} under ${String(node.key)}`)
  }
  return found
}

/** The visible sequence in short form: a property's key, or `…N` for a block of N hidden properties. */
function visibleRows(properties: readonly JsoTreeNodeWithDiffs[], hideUnchangedNodes = true): string[] {
  return resolveJsoUnchangedBlocks(properties, hideUnchangedNodes).visibleSequence.map((item) => (
    item.kind === "node" ? String(item.node.key) : `…${item.blockSize}`
  ))
}

describe("JSO changed-only data layer", () => {
  simplifyConsole()

  describe("root level", () => {
    it("groups the unchanged run between changed properties (1.1)", () => {
      const root = buildTreeFromFixture("root-level/1.1-two-changed-three-unchanged-one-changed").root!
      expect(visibleRows(root.childrenNodes())).toEqual(["node1", "node2", "…3", "node6"])
    })

    it("keeps one changed property between two unchanged blocks (1.2)", () => {
      const root = buildTreeFromFixture("root-level/1.2-three-unchanged-one-changed-two-unchanged").root!
      expect(visibleRows(root.childrenNodes())).toEqual(["…3", "node4", "…2"])
    })

    it("treats removed and added properties as changed (1.3)", () => {
      const root = buildTreeFromFixture("root-level/1.3-removed-and-added-between-unchanged").root!
      const changedKeys = root.childrenNodes().filter(isJsoNodeChanged).map((node) => String(node.key))
      expect(changedKeys.sort()).toEqual(["node2", "node6"])
    })

    it("collapses a fully unchanged document into one block (1.4)", () => {
      const root = buildTreeFromFixture("root-level/1.4-nothing-changed").root!
      expect(isJsoNodeChanged(root)).toBe(false)
      expect(visibleRows(root.childrenNodes())).toEqual(["…6"])
    })

    it("hides nothing when every property changed (1.5)", () => {
      const root = buildTreeFromFixture("root-level/1.5-everything-changed").root!
      expect(visibleRows(root.childrenNodes())).toEqual(["node1", "node2", "node3", "node4", "node5", "node6"])
    })

    it("shows every property without hideUnchangedNodes", () => {
      const root = buildTreeFromFixture("root-level/1.2-three-unchanged-one-changed-two-unchanged").root!
      expect(visibleRows(root.childrenNodes(), false)).toEqual(["node1", "node2", "node3", "node4", "node5", "node6"])
    })
  })

  describe("second level", () => {
    it("marks the parent changed through a nested change and groups at both levels (2.1)", () => {
      const root = buildTreeFromFixture("second-level/2.1-two-changed-three-unchanged-one-changed").root!
      expect(visibleRows(root.childrenNodes())).toEqual(["…1", "second", "…1"])
      expect(visibleRows(child(root, "second").childrenNodes())).toEqual(["node1", "node2", "…3", "node6"])
    })

    it("keeps one nested changed property between unchanged blocks (2.2)", () => {
      const second = child(buildTreeFromFixture("second-level/2.2-three-unchanged-one-changed-two-unchanged").root!, "second")
      expect(visibleRows(second.childrenNodes())).toEqual(["…3", "node4", "…2"])
    })

    it.each([
      ["second-level/2.3-nested-object-added"],
      ["second-level/2.4-nested-object-removed"],
    ])("shows a wholly added / removed object whole (%s)", (fixture) => {
      const second = child(buildTreeFromFixture(fixture).root!, "second")
      expect(visibleRows(second.childrenNodes())).toEqual(["…6", "extra"])
      expect(visibleRows(child(second, "extra").childrenNodes())).toEqual(["a", "b"])
    })

    it("shows a primitive replaced by an object whole (2.5)", () => {
      const second = child(buildTreeFromFixture("second-level/2.5-nested-primitive-to-object").root!, "second")
      expect(visibleRows(second.childrenNodes())).toEqual(["…3", "node4", "…2"])
      expect(visibleRows(child(second, "node4").childrenNodes())).toEqual(["a", "b"])
    })

    it("groups array items around a replaced item (2.6)", () => {
      const root = buildTreeFromFixture("second-level/2.6-array-item-replaced").root!
      expect(visibleRows(root.childrenNodes())).toEqual(["list", "…1"])
      expect(visibleRows(child(root, "list").childrenNodes())).toEqual(["…2", "2", "…2"])
    })

    it("opens the changed array item and groups inside it (2.7)", () => {
      const items = child(buildTreeFromFixture("second-level/2.7-array-object-item-changed").root!, "items")
      expect(visibleRows(items.childrenNodes())).toEqual(["…1", "1", "…1"])
      expect(visibleRows(child(items, "1").childrenNodes())).toEqual(["…1", "name"])
    })
  })

  describe("nested", () => {
    it("opens the path to third-level changes and groups unchanged siblings at every level (3.1)", () => {
      const root = buildTreeFromFixture("nested/3.1-third-level-changes-with-unchanged-siblings").root!
      expect(visibleRows(root.childrenNodes())).toEqual(["…1", "customer", "…2"])
      const customer = child(root, "customer")
      expect(visibleRows(customer.childrenNodes())).toEqual(["…1", "email", "…1", "address"])
      expect(visibleRows(child(customer, "address").childrenNodes())).toEqual(["…1", "zip", "…1"])
    })

    it("opens a fourth-level change (3.2)", () => {
      const root = buildTreeFromFixture("nested/3.2-fourth-level-change").root!
      expect(visibleRows(root.childrenNodes())).toEqual(["a", "…1"])
      const c = child(child(child(root, "a"), "b"), "c")
      expect(visibleRows(c.childrenNodes())).toEqual(["…1", "d", "…1"])
    })

    it("keeps an unchanged branch with children as one member of its parent's block (3.3)", () => {
      const root = buildTreeFromFixture("nested/3.3-changes-in-two-branches-unchanged-branch-between").root!
      expect(visibleRows(root.childrenNodes())).toEqual(["left", "…1", "right"])
      expect(isJsoNodeChanged(child(root, "middle"))).toBe(false)
    })

    it("marks a changed JSON Schema value as changed (3.4)", () => {
      const root = buildTreeFromFixture("nested/3.4-json-schema-value-changed").root!
      expect(visibleRows(root.childrenNodes())).toEqual(["…1", "schema", "version"])
    })
  })
})
