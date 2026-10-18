/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Page } from 'puppeteer'
import { switchCombinerNodesToChangedVariant } from '../../utils/combiner-changed-variant'

/**
 * Shared "ready for screenshot" waits for screenshot ITs. Hand-written and generated ITs import
 * these instead of declaring local copies (generators in `bin/` emit the import).
 */

export type JsonSchemaViewerWaitOptions = {
  /**
   * Switch oneOf/anyOf combiner nodes to the variant that contains the diff before capture.
   * Changes rendered content, so it is opt-in per suite (a no-op on pages without combiners).
   */
  switchCombinerVariant?: boolean
}

/** Document loaded and two animation frames painted (layout settled after the last React commit). */
export async function waitForRenderingComplete(page: Page): Promise<void> {
  await page.waitForFunction(() => document.readyState === 'complete')
  await page.evaluate(() => new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  ))
}

async function waitForJsonSchemaTree(
  page: Page,
  viewerTestId: string,
  options: JsonSchemaViewerWaitOptions,
): Promise<void> {
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
  if (options.switchCombinerVariant) {
    await page.evaluate(switchCombinerNodesToChangedVariant)
  }
}

export async function waitForJsonSchemaViewer(
  page: Page,
  options: JsonSchemaViewerWaitOptions = {},
): Promise<void> {
  await waitForJsonSchemaTree(page, 'json-schema-viewer', options)
}

export async function waitForJsonSchemaDiffsViewer(
  page: Page,
  options: JsonSchemaViewerWaitOptions = {},
): Promise<void> {
  await waitForJsonSchemaTree(page, 'json-schema-diffs-viewer', options)
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
