/**
 * Switches an operation view to the sections with the major change, like api-doc-viewer's
 * `switchCombinerNodesToChangedVariant` does for oneOf/anyOf variants:
 * - response code tabs (`[data-testid^="response-code-"]` inside a `role="tab"`),
 * - request/response body media type selects (`[data-testid$="-media-type-select"]`).
 *
 * Every tab list and select is a group of items marked with `data-diff-action` (see
 * `diffActionMarkers.ts` in diff-elements-core). Actions are ranked: whole `add`/`remove` >
 * `rename` > `replace` (something inside changed) > unchanged. When the selected item of a group
 * ranks lower than the best item of the group, the first best item gets selected. Passes repeat
 * until nothing is left to switch, because selecting a response code reveals its own media
 * type select.
 *
 * Pure DOM and self-contained, so it can run from a Storybook `play` function and via Puppeteer's
 * `page.evaluate()`, which re-evaluates only the source of this function in the browser. Keep
 * every declaration inside the function body, and do not use `async`/`await`: the it-tests
 * compile to ES6, where TypeScript would replace them with module-level helpers.
 */
export function switchToChangedSections(root: ParentNode = document, maxIterations = 20): Promise<void> {
  const DIFF_ACTION_ATTRIBUTE = 'data-diff-action'
  const RESPONSE_CODE_SELECTOR = '[data-testid^="response-code-"]'
  const MEDIA_TYPE_SELECT_SELECTOR = 'select[data-testid$="-media-type-select"]'
  const ACTION_RANKS: Record<string, number> = { add: 3, remove: 3, rename: 2, replace: 1 }
  // Fallback for the double `requestAnimationFrame` when the tab is not composited (background tab)
  const NEXT_RENDER_FALLBACK_TIMEOUT_MS = 100
  // Consecutive passes without any switchable section before giving up: the view may still be mounting
  const MAX_EMPTY_PASS_RETRIES = 5

  type Group = { selectedIndex: number; ranks: number[]; select(index: number): void }

  const rankOf = (element: Element): number => ACTION_RANKS[element.getAttribute(DIFF_ACTION_ATTRIBUTE) ?? ''] ?? 0

  function collectGroups(): Group[] {
    const groups: Group[] = []

    const tabLists = new Map<Element, HTMLElement[]>()
    root.querySelectorAll(RESPONSE_CODE_SELECTOR).forEach(marker => {
      const tab = marker.closest<HTMLElement>('[role="tab"]')
      const tabList = tab?.closest('[role="tablist"]')
      if (tab && tabList) {
        tabLists.set(tabList, [...(tabLists.get(tabList) ?? []), tab])
      }
    })
    tabLists.forEach(tabs => {
      groups.push({
        selectedIndex: tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true'),
        ranks: tabs.map(tab => {
          const marker = tab.querySelector(RESPONSE_CODE_SELECTOR)
          return marker ? rankOf(marker) : 0
        }),
        select: index => tabs[index].click(),
      })
    })

    root.querySelectorAll<HTMLSelectElement>(MEDIA_TYPE_SELECT_SELECTOR).forEach(select => {
      groups.push({
        selectedIndex: select.selectedIndex,
        ranks: Array.from(select.options).map(rankOf),
        select: index => {
          select.value = select.options[index].value
          select.dispatchEvent(new Event('change', { bubbles: true }))
        },
      })
    })

    return groups
  }

  /** Selects the best ranked item of the first group which needs it; returns whether it switched. */
  function switchOnce(groups: Group[]): boolean {
    for (const group of groups) {
      const bestRank = Math.max(0, ...group.ranks)
      const selectedRank = group.selectedIndex >= 0 ? group.ranks[group.selectedIndex] : 0
      if (selectedRank < bestRank) {
        group.select(group.ranks.indexOf(bestRank))
        return true
      }
    }
    return false
  }

  function waitForNextRender(): Promise<void> {
    return new Promise<void>(resolve => {
      let settled = false
      const settle = () => {
        if (!settled) {
          settled = true
          resolve()
        }
      }
      requestAnimationFrame(() => requestAnimationFrame(settle))
      setTimeout(settle, NEXT_RENDER_FALLBACK_TIMEOUT_MS)
    })
  }

  function pass(iteration: number, quietPasses: number): Promise<void> {
    if (iteration >= maxIterations) {
      return Promise.resolve()
    }
    const groups = collectGroups()
    if (switchOnce(groups)) {
      return waitForNextRender().then(() => pass(iteration + 1, 0))
    }
    // Nothing to switch right now, but sections may still be rendering: the view itself (no groups
    // yet) or a section revealed by the last switch (one more pass is enough)
    const maxQuietPasses = groups.length > 0 ? 1 : MAX_EMPTY_PASS_RETRIES
    if (quietPasses >= maxQuietPasses) {
      return Promise.resolve()
    }
    return waitForNextRender().then(() => pass(iteration + 1, quietPasses + 1))
  }

  return pass(0, 0)
}
