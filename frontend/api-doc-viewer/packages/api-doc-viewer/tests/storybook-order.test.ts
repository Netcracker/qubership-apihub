import { readdirSync, readFileSync } from "fs"
import { resolve } from "path"
import preview from "../.storybook/preview"

// The single-suite runner (bin/run-screenshot-test-suite.mjs) lists test runs in Storybook's order:
// bin/screenshot-test-run-order.json must follow the `storySort` order of .storybook/preview.ts.

type TestRunOrderEntry = { testRun: string; storybookTitle: string; compatibility?: boolean }

const TEST_RUN_ORDER: TestRunOrderEntry[] = JSON.parse(readFileSync(resolve(__dirname, "../bin/screenshot-test-run-order.json"), "utf-8"))
const IT_ROOT = resolve(__dirname, "../src/it")
const IT_DIRS_WITHOUT_TEST_RUN = new Set(["service", "__image_snapshots__", "compatibility-suite"])

function takeStorySortOrder(): unknown[] {
  const options: unknown = preview.parameters?.options
  const storySort = options && typeof options === "object" && "storySort" in options ? options.storySort : undefined
  const order = storySort && typeof storySort === "object" && "order" in storySort ? storySort.order : undefined
  if (!Array.isArray(order)) {
    throw new Error("preview.ts has no storySort.order")
  }
  return order
}

/** Index path of a `Root/Group` title in a nested `storySort.order`; `undefined` when a segment is missing. */
function resolveTitlePosition(order: unknown[], title: string): number[] | undefined {
  const position: number[] = []
  let level: unknown[] | undefined = order
  for (const segment of title.split("/")) {
    const index: number = level?.indexOf(segment) ?? -1
    if (!level || index < 0) {
      return undefined
    }
    position.push(index)
    const next: unknown = level[index + 1]
    level = Array.isArray(next) ? next : undefined
  }
  return position
}

function comparePositions(a: number[], b: number[]): number {
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    if (a[index] !== b[index]) {
      return a[index] - b[index]
    }
  }
  return a.length - b.length
}

describe("Storybook order and the single-suite runner", () => {
  const order = takeStorySortOrder()

  it.each(TEST_RUN_ORDER.map(entry => [entry.testRun, entry.storybookTitle]))("%s is listed in preview.ts as %s", (_testRun, title) => {
    expect(resolveTitlePosition(order, title)).toBeDefined()
  })

  it("lists the test runs in the preview.ts order", () => {
    const positions = TEST_RUN_ORDER.map(entry => resolveTitlePosition(order, entry.storybookTitle) ?? [])
    const sorted = [...positions].sort(comparePositions)
    expect(positions).toEqual(sorted)
  })

  it("keeps every IT in its test-run folder, next to its own __image_snapshots__", () => {
    // One folder per test run (`src/it/<test-run>/`): no IT directly in src/it, no shared umbrella
    // snapshot directory. jest-image-snapshot writes next to the test file by default.
    const misplaced = readdirSync(IT_ROOT, { withFileTypes: true })
      .filter(entry => entry.isFile() ? entry.name.endsWith(".it-test.ts") : entry.name === "__image_snapshots__")
      .map(entry => entry.name)
    expect(misplaced).toEqual([])
  })

  it("orders every hand-written test run of src/it", () => {
    const testRunIds = new Set(readdirSync(IT_ROOT, { withFileTypes: true })
      .filter(entry => entry.isDirectory() ? !IT_DIRS_WITHOUT_TEST_RUN.has(entry.name) : entry.name.endsWith(".it-test.ts"))
      .map(entry => entry.name.split(".")[0]))
    const ordered = new Set(TEST_RUN_ORDER.map(entry => entry.testRun))
    expect([...testRunIds].filter(id => !ordered.has(id))).toEqual([])
  })
})
