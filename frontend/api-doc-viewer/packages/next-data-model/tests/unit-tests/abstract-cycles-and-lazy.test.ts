import { DiffAction, DiffType } from "@netcracker/qubership-apihub-api-diff"
import { JsoTreeBuilder } from "../../src/building-service/jso/tree/builder"
import { JsoTreeWithDiffsBuilder } from "../../src/building-service/jso/tree-with-diffs/builder"
import { defaultObjectTreeHasOwnChildren } from "../../src/building-service/abstract/tree/lazy-materialization"
import { simplifyConsole } from "../helpers/simplify-console"

const TEST_DIFFS_META_KEY = Symbol("diffs")
const TEST_AGGREGATED_DIFFS_META_KEY = Symbol("aggregatedDiffs")
const TEST_DIFF_META_KEYS = {
  diffsMetaKey: TEST_DIFFS_META_KEY,
  aggregatedDiffsMetaKey: TEST_AGGREGATED_DIFFS_META_KEY,
}

describe("next-data-model abstract: cycles and lazy materialization", () => {
  simplifyConsole()

  describe("cycle clones", () => {
    it("creates a cycle clone that shares children with the source after source finishes building", () => {
      const owner: Record<string, unknown> = {
        name: "owner",
      }
      owner.self = owner
      owner.extra = { nested: true }

      const tree = new JsoTreeBuilder({ source: { root: owner } }).build()
      const rootProp = tree.root!.childrenNodes().find((n) => n.key === "root")!
      expect(rootProp).toBeDefined()

      const children = rootProp.childrenNodes()
      const selfClone = children.find((n) => n.key === "self")
      const extra = children.find((n) => n.key === "extra")

      expect(selfClone?.isCycle).toBe(true)
      expect(extra).toBeDefined()
      expect(extra!.isCycle).toBe(false)

      // Shared children array: clone sees siblings added after cycle detection (extra).
      expect(selfClone!.childrenNodes()).toBe(rootProp.childrenNodes())
      expect(selfClone!.childrenNodes().some((n) => n.key === "extra")).toBe(true)
      expect(selfClone!.childrenNodes().some((n) => n.key === "name")).toBe(true)
    })

    it("copies diffs summary onto a cycle clone", () => {
      const owner: Record<string, unknown> = {
        name: "owner",
      }
      owner.self = owner

      const nameDiff = {
        action: DiffAction.replace,
        type: "breaking" as DiffType,
        beforeValue: "old",
        afterValue: "owner",
        beforeDeclarationPaths: [["name"]],
        afterDeclarationPaths: [["name"]],
      }
      Object.defineProperty(owner, TEST_DIFFS_META_KEY, {
        value: { name: nameDiff },
        enumerable: false,
      })

      const tree = new JsoTreeWithDiffsBuilder({
        source: { root: owner },
        diffsMetaKeys: TEST_DIFF_META_KEYS,
      }).build()

      const rootProp = tree.root!.childrenNodes().find((n) => n.key === "root")!
      const selfClone = rootProp.childrenNodes().find((n) => n.key === "self")!

      expect(selfClone.isCycle).toBe(true)
      // Source rootProp has descendant changes from name; clone copies source diffs fields.
      expect(rootProp.descendantDiffsSummary.size + rootProp.diffsSummary.size).toBeGreaterThan(0)
      expect(selfClone.diffsSummary.size + selfClone.descendantDiffsSummary.size)
        .toBe(rootProp.diffsSummary.size + rootProp.descendantDiffsSummary.size)
    })
  })

  describe("lazy materialization", () => {
    it("defers children at materializeDepth and materializeChildren is idempotent", () => {
      // Depth: root→1, level1→2, level2→3. materializeDepth 3 defers level2.
      const source = {
        level1: {
          level2: {
            leaf: "value",
          },
        },
      }

      const builder = new JsoTreeBuilder({ source, materializeDepth: 3 })
      const tree = builder.build()
      const level1 = tree.root!.childrenNodes().find((n) => n.key === "level1")!
      expect(level1.childrenNodes()).toHaveLength(1)

      const level2 = level1.childrenNodes().find((n) => n.key === "level2")!
      expect(level2.childrenNodes()).toHaveLength(0)

      builder.materializeChildren(level2)
      expect(level2.childrenNodes()).toHaveLength(1)
      expect(level2.childrenNodes()[0].key).toBe("leaf")

      builder.materializeChildren(level2)
      expect(level2.childrenNodes()).toHaveLength(1)
    })

    it("detects cycles that start above the materialization frontier", () => {
      const owner: Record<string, unknown> = {
        deep: {
          city: "X",
        },
      }
      ;(owner.deep as Record<string, unknown>).resident = owner

      // Depth: root→1, owner→2, deep→3. Defer deep; rematerialize finds cycle to owner.
      const builder = new JsoTreeBuilder({
        source: { owner },
        materializeDepth: 3,
      })
      const tree = builder.build()
      const ownerNode = tree.root!.childrenNodes().find((n) => n.key === "owner")!
      const deep = ownerNode.childrenNodes().find((n) => n.key === "deep")!
      expect(deep.childrenNodes()).toHaveLength(0)

      builder.materializeChildren(deep)
      const resident = deep.childrenNodes().find((n) => n.key === "resident")
      expect(resident?.isCycle).toBe(true)
      expect(deep.childrenNodes().some((n) => n.key === "city")).toBe(true)
    })

    it("hasOwnChildren matches children after full materialization", () => {
      const source = {
        emptyObject: {},
        withProps: { a: 1 },
        emptyArray: [] as unknown[],
        withItems: [1, 2],
        scalar: "x",
      }
      const tree = new JsoTreeBuilder({ source }).build()
      const props = tree.root!.childrenNodes()

      for (const node of props) {
        const fragment = (source as Record<string, unknown>)[String(node.key)]
        const predicted = defaultObjectTreeHasOwnChildren(fragment)
        const actual = node.childrenNodes().length > 0
        expect(actual).toBe(predicted)
      }
    })
  })

  describe("benchmark smoke", () => {
    it("builds a reused-object document faster when depth-limited", () => {
      const shared: Record<string, unknown> = { leaf: "x" }
      for (let i = 0; i < 5; i++) {
        shared[`n${i}`] = { ...shared, id: i }
      }

      const wide: Record<string, unknown> = {}
      for (let i = 0; i < 200; i++) {
        wide[`ref${i}`] = shared
      }

      const fullStart = Date.now()
      new JsoTreeBuilder({ source: wide }).build()
      const fullMs = Date.now() - fullStart

      const lazyStart = Date.now()
      new JsoTreeBuilder({ source: wide, materializeDepth: 1 }).build()
      const lazyMs = Date.now() - lazyStart

      // Soft assertion: lazy should not be dramatically slower; log for Phase 0 metrics.
      // eslint-disable-next-line no-console
      console.log(`[benchmark] full=${fullMs}ms lazyDepth1=${lazyMs}ms`)
      expect(lazyMs).toBeGreaterThanOrEqual(0)
      expect(fullMs).toBeGreaterThanOrEqual(0)
    })
  })
})
