import { AsyncApiOperationViewer } from "@apihub/components/AsyncApiOperationViewer/AsyncApiOperationViewer";
import { DETAILED_DISPLAY_MODE, DisplayMode } from "@apihub/types/DisplayMode";
import { FC, useMemo } from "react";
import { prepareAsyncApiDocument } from "../preprocess";
import { DISPLAY_MODE_ARG_TYPES, DISPLAY_MODE_DEFAULT_ARGS } from "../shared/display-mode-arg-types";
import { parseYamlSource } from "../utils/parse-yaml-source";
import { TEST_REFERENCE_NAME_PROPERTY } from "./shared-test-data";

/** Operation / message every AsyncAPI Security and Display Mode fixture declares. */
export const ASYNC_API_SECURITY_OPERATION_KEYS = { operationKey: "sendOperation", messageKey: "TestMessage" } as const;

/** Story controls of the AsyncAPI document suites: the display mode (a story arg). */
export const ASYNC_API_SECURITY_STORY_ARG_TYPES = DISPLAY_MODE_ARG_TYPES;

export const ASYNC_API_SECURITY_STORY_DEFAULT_ARGS: { displayMode: DisplayMode } = DISPLAY_MODE_DEFAULT_ARGS;

export type AsyncApiSecuritySampleStoryProps = {
  caseId: string;
  yaml: string;
  displayMode?: DisplayMode;
};

/**
 * One plain AsyncAPI document declaring `sendOperation` / `TestMessage`: the Security fixtures
 * (`packages/samples/async-api/security/<case>/document.yaml`) and the Display Mode fixtures
 * (`packages/samples/async-api-display-mode-simple/<case>/sample.yaml`).
 */
export const AsyncApiSecuritySampleStory: FC<AsyncApiSecuritySampleStoryProps> = ({ yaml, displayMode = DETAILED_DISPLAY_MODE }) => {
  const source = useMemo(() => prepareAsyncApiDocument({ source: parseYamlSource(yaml) }), [yaml]);
  return (
    <AsyncApiOperationViewer
      devMode={true}
      source={source}
      operationKeys={ASYNC_API_SECURITY_OPERATION_KEYS}
      referenceNamePropertyKey={TEST_REFERENCE_NAME_PROPERTY}
      displayMode={displayMode}
    />
  );
};
