import { Page } from 'puppeteer'

/**
 * Shared "ready for screenshot" waits for screenshot ITs. Hand-written and generated ITs import
 * these instead of declaring local copies (generators in `bin/` emit the import). None of them
 * selects options: the story `play` does (`src/stories/shared/auto-switch.ts`), and `storyPage`
 * waits for it.
 */

/** Document loaded and two animation frames painted (layout settled after the last React commit). */
export async function waitForRenderingComplete(page: Page): Promise<void> {
  await page.waitForFunction(() => document.readyState === 'complete')
  await page.evaluate(() => new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  ))
}

async function waitForJsonSchemaTree(page: Page, viewerTestId: string): Promise<void> {
  await page.waitForSelector(`[data-testid="${viewerTestId}"]`, { visible: true })
  // A combiner root renders through CombinerNodeViewer, which emits no [data-name="JsonNode"]
  // when its active option is a scalar or another combiner - waiting on JsonNode alone hangs
  // until the Puppeteer timeout. Accept whichever of the two becomes visible first.
  await page.waitForFunction(() => {
    for (const selector of ['[data-name="JsonNode"]', '[data-testid="json-schema-combiner-node-viewer"]']) {
      const rect = document.querySelector(selector)?.getBoundingClientRect()
      if (rect && rect.width > 0 && rect.height > 0) {
        return true
      }
    }
    return false
  })
  await waitForRenderingComplete(page)
}

export async function waitForJsonSchemaViewer(page: Page): Promise<void> {
  await waitForJsonSchemaTree(page, 'json-schema-viewer')
}

export async function waitForJsonSchemaDiffsViewer(page: Page): Promise<void> {
  await waitForJsonSchemaTree(page, 'json-schema-diffs-viewer')
}

export async function waitForDdlTableViewer(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="ddl-table-viewer"]', { visible: true })
  await waitForRenderingComplete(page)
}

export async function waitForDdlTableDiffsViewer(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="ddl-table-diffs-viewer"]', { visible: true })
  await waitForRenderingComplete(page)
}

/** Waits for an optional viewer selector (compatibility-suite generated ITs pass one per spec type). */
export async function waitForVisibleSelector(page: Page, selector: string | undefined): Promise<void> {
  if (selector === undefined) {
    return
  }

  await page.waitForSelector(selector, { visible: true })
  await waitForRenderingComplete(page)
}

/** `OpenApiOperationViewer` root visible and painted (nested JSON Schema viewers render synchronously). */
export async function waitForOpenApiOperationViewer(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="openapi-operation-viewer"]', { visible: true })
  await waitForRenderingComplete(page)
}

/** `OpenApiOperationDiffsViewer` root visible and painted. */
export async function waitForOpenApiOperationDiffsViewer(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="openapi-operation-diffs-viewer"]', { visible: true })
  await waitForRenderingComplete(page)
}
