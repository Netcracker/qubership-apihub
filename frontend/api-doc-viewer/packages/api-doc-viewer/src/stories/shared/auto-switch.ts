import { cn } from "@apihub/utils/common/cn";

/**
 * Initial navigation of a story: on load, the story `play` selects the selector options its case
 * covers, so the story and its screenshot IT show the same state. Screenshot ITs never navigate;
 * `storyPageWithArgs` waits until Storybook reports the `play` as finished.
 *
 * The `play` runs once per story load. Changing a control re-renders the story without running it
 * again, so an option the user selects by hand stays selected.
 */

/** Story args of every suite that navigates on load. */
export type AutoSwitchArgs = {
  autoSwitch?: boolean;
};

/** Story parameter with the option test ids a case selects first, in order. */
export type AutoSwitchParameters = {
  autoSwitch?: {
    switchTo?: readonly string[];
  };
};

type AutoSwitchPlayContext = {
  canvasElement: HTMLElement;
  args: AutoSwitchArgs;
  parameters: AutoSwitchParameters;
};

export const AUTO_SWITCH_ARG_TYPES = {
  autoSwitch: {
    control: { type: "boolean" },
    description:
      "Select the case's options when the story loads: the options the case lists, then a changed option in " +
      "every other selector. Takes effect on the next load (F5); the setting is kept in the URL.",
    table: { category: "Case" },
  },
} as const;

export const AUTO_SWITCH_DEFAULT_ARGS: { autoSwitch: boolean } = {
  autoSwitch: true,
};

const OPTION_SELECTOR = `button.${cn("button-selector-option")}`;
const SELECTED_CLASS = cn("selected");
const ADDED_OPTION_CLASS = cn("diffs-border-shadow_green");
const REMOVED_OPTION_CLASS = cn("diffs-border-shadow_red");
// Any border shadow (the option itself changed) or round marker (changes inside the option).
const CHANGE_MARKER_CLASS_PREFIXES = [cn("diffs-border-shadow_"), cn("diffs-round-marker_")];
const SIDE_BY_SIDE_LAYOUT_SELECTOR = `.${cn("side-by-side-layout")}`;

const MAX_ITERATIONS = 50;
const MAX_WAIT_ATTEMPTS = 40;
// A pass that finds nothing is repeated a few times: `play` can start before React paints a
// selector row, so one empty pass does not prove the story has nothing to select.
const MAX_EMPTY_PASSES = 5;
// `requestAnimationFrame` fires only while the browser composites the tab, which a background tab
// may not do; the timeout keeps the wait finite there.
const NEXT_RENDER_FALLBACK_TIMEOUT_MS = 100;

/** Story `parameters` for a case that selects options by test id, e.g. a response code or a section tab. */
export const autoSwitchParameters = (switchTo: readonly string[]): AutoSwitchParameters => ({
  autoSwitch: { switchTo },
});

/** Story `play` shared by every suite: `switchSelectorOptions` unless the `autoSwitch` control is off. */
export const playAutoSwitch = async ({ canvasElement, args, parameters }: AutoSwitchPlayContext): Promise<void> => {
  if (args.autoSwitch === false) {
    return;
  }
  await switchSelectorOptions(canvasElement, parameters.autoSwitch?.switchTo ?? []);
};

/**
 * Selects selector options in two passes:
 *
 * 1. Every test id in `switchTo`, in order. Each one is waited for, because an option can appear
 *    only after the previous click (a response media type after its response code).
 * 2. In every other selector, one changed option that is not selected, by priority: a wholly added
 *    option (`diffs-border-shadow_green`), a wholly removed option (`diffs-border-shadow_red`), an
 *    option with changes inside (any other border shadow or a `diffs-round-marker_*`). The last one
 *    is skipped when the selected option already shows a change. A click can reveal a nested
 *    selector, so the pass repeats until it finds nothing to click.
 *
 * Each selector is clicked at most once. In the side-by-side diffs layout, one selector renders on
 * both sides and both sides share the selection, so a selector is identified by the closest
 * `side-by-side-layout` element (by the option list itself in a one-side layout). Selectors from
 * pass 1 are skipped in pass 2.
 */
async function switchSelectorOptions(root: HTMLElement, switchTo: readonly string[]): Promise<void> {
  await waitForContent(root);
  const handledSelectors = new Set<Element>();

  for (const testId of switchTo) {
    const option = await waitForOption(root, testId);
    if (!option) {
      throw new Error(`Auto-switch: no option with data-testid="${testId}"`);
    }
    if (!option.classList.contains(SELECTED_CLASS)) {
      option.click();
    }
    handledSelectors.add(selectorOf(option));
    await waitForNextRender();
  }

  let emptyPasses = 0;
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const target = findChangedOptionToSelect(root, handledSelectors);
    if (target) {
      emptyPasses = 0;
      handledSelectors.add(selectorOf(target));
      target.click();
    } else if (++emptyPasses > MAX_EMPTY_PASSES) {
      return;
    }
    await waitForNextRender();
  }
}

function selectorOf(option: Element): Element {
  return option.closest(SIDE_BY_SIDE_LAYOUT_SELECTOR) ?? option.parentElement ?? option;
}

function findChangedOptionToSelect(root: HTMLElement, handledSelectors: ReadonlySet<Element>): HTMLElement | undefined {
  const options = Array.from(root.querySelectorAll<HTMLElement>(OPTION_SELECTOR));
  const candidates = options.filter(
    (option) => !option.classList.contains(SELECTED_CLASS) && !handledSelectors.has(selectorOf(option)),
  );
  const added = candidates.find((option) => option.classList.contains(ADDED_OPTION_CLASS));
  if (added) {
    return added;
  }
  const removed = candidates.find((option) => option.classList.contains(REMOVED_OPTION_CLASS));
  if (removed) {
    return removed;
  }
  const selectorsShowingChange = new Set(
    options
      .filter((option) => option.classList.contains(SELECTED_CLASS) && hasChangeMarker(option))
      .map(selectorOf),
  );
  return candidates.find((option) => hasChangeMarker(option) && !selectorsShowingChange.has(selectorOf(option)));
}

function hasChangeMarker(option: Element): boolean {
  return Array.from(option.classList).some((className) =>
    CHANGE_MARKER_CLASS_PREFIXES.some((prefix) => className.startsWith(prefix)),
  );
}

/** A story can render nothing at first, e.g. until a font loads; `play` starts regardless. */
async function waitForContent(root: HTMLElement): Promise<void> {
  for (let attempt = 0; attempt < MAX_WAIT_ATTEMPTS && root.firstElementChild === null; attempt++) {
    await waitForNextRender();
  }
}

async function waitForOption(root: HTMLElement, testId: string): Promise<HTMLElement | undefined> {
  for (let attempt = 0; attempt < MAX_WAIT_ATTEMPTS; attempt++) {
    const option = root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    if (option) {
      return option;
    }
    await waitForNextRender();
  }
  return undefined;
}

/** Resolves after two animation frames, or after the fallback timeout if the tab does not paint. */
function waitForNextRender(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (): void => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(settle));
    setTimeout(settle, NEXT_RENDER_FALLBACK_TIMEOUT_MS);
  });
}
