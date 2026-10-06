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

/**
 * Clicks the oneOf/anyOf combiner variant option that actually contains the diff (detected via
 * the `diffs-border-shadow_*` / `diffs-round-marker_*` classes `CombinerSelectorRow`'s underlying
 * `Selector` component applies to changed options), instead of leaving the default first-option
 * selection. Recurses into nested combiners revealed by each click until no changed-but-unselected
 * option remains (leaf state). Option buttons carry `data-testid="json-schema-combiner-option-
 * <index>"` — index-based and not globally unique across properties/diff panes (unlike the
 * legacy viewer's node-id-based `data-testid`s) — but this algorithm never needed uniqueness: it
 * just repeatedly clicks *any* unselected, diff-indicated button anywhere in `root` until none
 * remain, which converges correctly regardless of index collisions between independent combiners.
 *
 * Pure DOM, no external dependencies, so it can run identically from a Storybook `play` function
 * (browser context) or via Puppeteer's `page.evaluate()` — this is the single implementation
 * shared by both call sites. Everything it needs (constants, the render-settle helper) is
 * declared *inside* this function body rather than at module scope: `page.evaluate()` sends
 * Puppeteer's callback via `Function.prototype.toString()` and re-evaluates only that source in
 * the browser, so any reference to an outer module-level `const`/helper resolves to nothing
 * there (`ReferenceError`) even though the exact same code works fine when called directly from
 * a `play` function inside the bundled story module. Keep it this way — do not hoist any of the
 * declarations below back out to module scope.
 */
export async function switchCombinerNodesToChangedVariant(
  root: ParentNode = document,
  maxIterations = 50,
): Promise<void> {
  const COMBINER_OPTION_SELECTOR = '[data-testid^="json-schema-combiner-option-"]';
  const CHANGED_INDICATOR_PATTERN = /(?:^|\s)diffs-(?:border-shadow|round-marker)_\S+/;
  const SELECTED_CLASS_PATTERN = /(?:^|\s)selected(?:\s|$)/;

  // Fallback for `waitForNextRender`: `requestAnimationFrame` only fires once the browser
  // actually composites the tab, which it may not do promptly (or at all) for a tab that isn't
  // the visibly active/foreground one — e.g. a Storybook tab opened in the background, or one
  // driven by automation that doesn't force repaints. Without this fallback, the double-rAF
  // wait below can stall indefinitely, so the click above appears to silently do nothing.
  const NEXT_RENDER_FALLBACK_TIMEOUT_MS = 100;

  // How many consecutive "nothing to click right now" passes to tolerate before concluding
  // there really is nothing left to switch. Storybook invokes `play` as soon as the story
  // component mounts, which can race ahead of React actually painting the combiner selector's
  // buttons (verified live: Storybook reports the story's play phase as "completed" while the
  // combiner is still showing its default, unswitched variant) — a single empty
  // `querySelectorAll` pass does not by itself mean the combiner has no changed variant to
  // select, only that it doesn't *right now*. Retrying a few times (each after a render-settle
  // wait) lets a not-yet-mounted row show up before giving up.
  const MAX_EMPTY_PASS_RETRIES = 5;

  /**
   * Resolves once the browser has (probably) painted the DOM update from the most recent click —
   * via two chained `requestAnimationFrame` calls when the tab is actively compositing, or after
   * `NEXT_RENDER_FALLBACK_TIMEOUT_MS` otherwise. React commits the state update synchronously
   * within the click handler, so by the time either path resolves the DOM already reflects it;
   * the wait only exists to let CSS classes settle before the next `querySelectorAll` pass.
   */
  function waitForNextRender(): Promise<void> {
    return new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(settle));
      setTimeout(settle, NEXT_RENDER_FALLBACK_TIMEOUT_MS);
    });
  }

  let emptyPasses = 0;
  for (let i = 0; i < maxIterations; i++) {
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(COMBINER_OPTION_SELECTOR));
    const target = buttons.find(
      (button) => CHANGED_INDICATOR_PATTERN.test(button.className) && !SELECTED_CLASS_PATTERN.test(button.className),
    );
    if (target) {
      emptyPasses = 0;
      target.click();
      await waitForNextRender();
      continue;
    }
    if (emptyPasses >= MAX_EMPTY_PASS_RETRIES) {
      return;
    }
    emptyPasses++;
    await waitForNextRender();
  }
}
