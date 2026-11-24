import { DETAILED_DISPLAY_MODE, DisplayMode, SIMPLE_DISPLAY_MODE } from "@apihub/types/DisplayMode";

const DISPLAY_MODES: readonly DisplayMode[] = [DETAILED_DISPLAY_MODE, SIMPLE_DISPLAY_MODE];

/**
 * The viewer's public `displayMode` prop as a story control, shared by every suite. One story per
 * case; the `(Display Mode = simple)` suites capture it in both modes by passing `displayMode` as a
 * story arg (`storyPageWithArgs`) - never a duplicated story or fixture. Other suites keep the
 * default `detailed`.
 */
export const DISPLAY_MODE_ARG_TYPES = {
  displayMode: {
    control: { type: "select" },
    options: DISPLAY_MODES,
    table: { category: "Viewer" },
  },
} as const;

export const DISPLAY_MODE_DEFAULT_ARGS: { displayMode: DisplayMode } = {
  displayMode: DETAILED_DISPLAY_MODE,
};
