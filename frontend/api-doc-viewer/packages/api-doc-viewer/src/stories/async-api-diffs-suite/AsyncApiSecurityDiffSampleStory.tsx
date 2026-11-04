import { AsyncApiOperationDiffsViewer } from "@apihub/components/AsyncApiOperationViewer/AsyncApiOperationDiffsViewer";
import { DETAILED_DISPLAY_MODE, DisplayMode } from "@apihub/types/DisplayMode";
import { FC, useMemo } from "react";
import { ASYNC_API_SECURITY_OPERATION_KEYS } from "../async-api-suite/AsyncApiSecuritySampleStory";
import { createAsyncApiViewerArgs } from "./async-api-diffs-utils";

export type AsyncApiSecurityDiffSampleStoryProps = {
  caseId: string;
  beforeYaml: string;
  afterYaml: string;
  displayMode?: DisplayMode;
};

/** One AsyncAPI Security diff fixture (`packages/samples/async-api-diffs/security/<case>/{before,after}.yaml`). */
export const AsyncApiSecurityDiffSampleStory: FC<AsyncApiSecurityDiffSampleStoryProps> = (props) => {
  const { beforeYaml, afterYaml, displayMode = DETAILED_DISPLAY_MODE } = props;
  const viewerArgs = useMemo(() => createAsyncApiViewerArgs(beforeYaml, afterYaml, ASYNC_API_SECURITY_OPERATION_KEYS), [beforeYaml, afterYaml]);
  return <AsyncApiOperationDiffsViewer {...viewerArgs} displayMode={displayMode} />;
};
