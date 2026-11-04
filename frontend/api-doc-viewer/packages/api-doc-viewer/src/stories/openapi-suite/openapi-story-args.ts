import { DisplayMode } from "@apihub/types/DisplayMode";
import { switchOpenApiOptions } from "@apihub/utils/openapi/switch-openapi-options";
import { OPEN_API_HTTP_METHODS_ORDER } from "@netcracker/qubership-apihub-next-data-model/shared/openapi/types/http-method";
import { DISPLAY_MODE_ARG_TYPES, DISPLAY_MODE_DEFAULT_ARGS } from "../shared/display-mode-arg-types";

/**
 * Story controls shared by the OpenAPI suites: one story per case, the display mode is a control
 * (ITs pass `displayMode` as a story arg) - never a duplicated story.
 */
export const OPENAPI_STORY_ARG_TYPES = DISPLAY_MODE_ARG_TYPES;

export const OPENAPI_STORY_DEFAULT_ARGS: { displayMode: DisplayMode } = DISPLAY_MODE_DEFAULT_ARGS;

/**
 * Diffs suites: display mode plus `hideUnchangedNodes` - `false` by default, so every row shows;
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

/** Plain suite: display mode plus the auto-switch toggle. */
export const OPENAPI_PLAIN_STORY_ARG_TYPES = {
  ...OPENAPI_STORY_ARG_TYPES,
  autoSwitch: {
    control: { type: "boolean" },
    description: "Select the options the case covers (`switchTo`) on mount.",
    table: { category: "Case" },
  },
  noHeading: {
    control: { type: "boolean" },
    table: { category: "Viewer" },
  },
} as const;

export const OPENAPI_PLAIN_STORY_DEFAULT_ARGS: { displayMode: DisplayMode; autoSwitch: boolean; noHeading: boolean } = {
  ...OPENAPI_STORY_DEFAULT_ARGS,
  autoSwitch: true,
  noHeading: false,
};

/**
 * Story `play`: selects the case's `switchTo` options (the same `switchOpenApiOptions` the ITs run
 * through `page.evaluate`, mirroring `switchCombinerNodesToChangedVariant`).
 */
export const playOpenApiAutoSwitch = async (context: {
  canvasElement: HTMLElement;
  args: { switchTo?: readonly string[]; autoSwitch?: boolean };
}): Promise<void> => {
  const { canvasElement, args } = context;
  if (args.autoSwitch !== false && args.switchTo && args.switchTo.length > 0) {
    await switchOpenApiOptions(args.switchTo, canvasElement);
  }
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
