/**
 * Selects the given OpenAPI selector options (security alternative, response code, media type)
 * in order, so a story or a screenshot shows the option the case covers instead of the initial
 * one. Each test id is waited for (an option can appear only after the previous click, e.g. a
 * response media type after the response code), and clicked only when not yet selected.
 *
 * Pure DOM, no external dependencies: the single implementation shared by a Storybook `play`
 * function and Puppeteer's `page.evaluate()`. `page.evaluate()` re-evaluates only this function's
 * source in the browser, so every constant and helper is declared INSIDE the body - do not hoist
 * them to module scope (same contract as `switchCombinerNodesToChangedVariant`).
 */
export async function switchOpenApiOptions(
  testIds: readonly string[],
  root: ParentNode = document,
): Promise<void> {
  const MAX_ATTEMPTS = 40
  // Prefixed by cn() (CSS isolation); spelled out because this body runs through page.evaluate().
  const SELECTED_CLASS_PATTERN = /(?:^|\s)api-doc-viewer-selected(?:\s|$)/
  const NEXT_RENDER_FALLBACK_TIMEOUT_MS = 100

  const waitForNextRender = (): Promise<void> => new Promise(resolve => {
    let done = false
    const finish = (): void => {
      if (!done) {
        done = true
        resolve()
      }
    }
    requestAnimationFrame(() => requestAnimationFrame(finish))
    setTimeout(finish, NEXT_RENDER_FALLBACK_TIMEOUT_MS)
  })

  for (const testId of testIds) {
    const selector = `[data-testid="${testId}"]`
    let button: HTMLElement | null = null
    for (let attempt = 0; attempt < MAX_ATTEMPTS && !button; attempt++) {
      const found = root.querySelector(selector)
      button = found instanceof HTMLElement ? found : null
      if (!button) {
        await waitForNextRender()
      }
    }
    if (!button) {
      continue
    }
    if (!SELECTED_CLASS_PATTERN.test(button.className)) {
      button.click()
    }
    await waitForNextRender()
  }
}
