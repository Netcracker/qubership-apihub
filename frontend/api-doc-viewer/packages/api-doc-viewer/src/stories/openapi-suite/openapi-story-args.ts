import { DisplayMode } from "@apihub/types/DisplayMode";
import { OPEN_API_HTTP_METHODS_ORDER } from "@netcracker/qubership-apihub-next-data-model/shared/openapi/types/http-method";
import { AUTO_SWITCH_ARG_TYPES, AUTO_SWITCH_DEFAULT_ARGS } from "../shared/auto-switch";
import { DISPLAY_MODE_ARG_TYPES, DISPLAY_MODE_DEFAULT_ARGS } from "../shared/display-mode-arg-types";

/**
 * Story controls shared by the OpenAPI stories: one story per case, the display mode is a control
 * (ITs pass `displayMode` as a story arg) - never a duplicated story. The debug pages use these
 * directly; the suites use the `*_SUITE_*` variants below, which add the `autoSwitch` control of
 * the story `play` (`playAutoSwitch`).
 */
export const OPENAPI_STORY_ARG_TYPES = DISPLAY_MODE_ARG_TYPES;

export const OPENAPI_STORY_DEFAULT_ARGS: { displayMode: DisplayMode } = DISPLAY_MODE_DEFAULT_ARGS;

/**
 * Diffs stories: display mode plus `hideUnchangedNodes` - `false` by default, so every row shows;
 * only the "Hiding Unchanged Nodes" suite sets `true`. One switch hides unchanged content in the
 * OpenAPI layer and in every embedded JSON Schema and JSO viewer alike.
 */
export const OPENAPI_DIFFS_STORY_ARG_TYPES = {
  ...OPENAPI_STORY_ARG_TYPES,
  hideUnchangedNodes: {
    control: { type: "boolean" },
    table: { category: "Viewer" },
  },
} as const;

export const OPENAPI_DIFFS_STORY_DEFAULT_ARGS: { displayMode: DisplayMode; hideUnchangedNodes: boolean } = {
  ...OPENAPI_STORY_DEFAULT_ARGS,
  hideUnchangedNodes: false,
};

/** Plain suites: display mode plus the `autoSwitch` control. */
export const OPENAPI_SUITE_STORY_ARG_TYPES = {
  ...OPENAPI_STORY_ARG_TYPES,
  ...AUTO_SWITCH_ARG_TYPES,
} as const;

export const OPENAPI_SUITE_STORY_DEFAULT_ARGS: { displayMode: DisplayMode; autoSwitch: boolean } = {
  ...OPENAPI_STORY_DEFAULT_ARGS,
  ...AUTO_SWITCH_DEFAULT_ARGS,
};

/** Diffs suites: the diffs controls plus the `autoSwitch` control. */
export const OPENAPI_DIFFS_SUITE_STORY_ARG_TYPES = {
  ...OPENAPI_DIFFS_STORY_ARG_TYPES,
  ...AUTO_SWITCH_ARG_TYPES,
} as const;

export const OPENAPI_DIFFS_SUITE_STORY_DEFAULT_ARGS: {
  displayMode: DisplayMode;
  hideUnchangedNodes: boolean;
  autoSwitch: boolean;
} = {
  ...OPENAPI_DIFFS_STORY_DEFAULT_ARGS,
  ...AUTO_SWITCH_DEFAULT_ARGS,
};

/** Operation Suite: the plain suite controls plus `noHeading`. */
export const OPENAPI_PLAIN_STORY_ARG_TYPES = {
  ...OPENAPI_SUITE_STORY_ARG_TYPES,
  noHeading: {
    control: { type: "boolean" },
    table: { category: "Viewer" },
  },
} as const;

export const OPENAPI_PLAIN_STORY_DEFAULT_ARGS: { displayMode: DisplayMode; autoSwitch: boolean; noHeading: boolean } = {
  ...OPENAPI_SUITE_STORY_DEFAULT_ARGS,
  noHeading: false,
};

/** HTTP Methods group: the plain controls plus the method the template operation is served as. */
export const OPENAPI_METHOD_TEMPLATE_STORY_ARG_TYPES = {
  ...OPENAPI_PLAIN_STORY_ARG_TYPES,
  method: {
    control: { type: "select" },
    options: OPEN_API_HTTP_METHODS_ORDER,
    description: "HTTP method the template operation is served as.",
    table: { category: "Case" },
  },
} as const;
