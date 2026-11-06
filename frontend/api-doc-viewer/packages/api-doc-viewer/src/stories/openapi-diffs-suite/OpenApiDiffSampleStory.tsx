import { OpenApiOperationDiffsViewer } from "@apihub/components/OpenApiOperationViewer/OpenApiOperationDiffsViewer";
import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from "@netcracker/qubership-apihub-api-diff";
import { DisplayMode } from "@apihub/types/DisplayMode";
import { useMemo } from "react";
import { mergeOpenApiDocuments } from "../preprocess";
import { parseYamlSource } from "../utils/parse-yaml-source";

/** `mergeOpenApiDocuments` stores diffs under api-diff's own `DIFF_META_KEY`. */
const OPENAPI_STORY_DIFF_META_KEYS = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
};

/** Every diff fixture changes `POST` of its only path; a renamed path is keyed by its after path (E1). */
const OPENAPI_DIFFS_SUITE_METHOD = "post";

export type OpenApiDiffSampleStoryProps = {
  caseId: string;
  beforeYaml: string;
  afterYaml: string;
  displayMode?: DisplayMode;
  hideUnchangedNodes?: boolean;
};

function resolveMergedPath(after: Record<string, unknown>, before: Record<string, unknown>): string {
  const paths = after.paths ?? before.paths;
  return paths && typeof paths === "object" ? Object.keys(paths)[0] ?? "" : "";
}

export const OpenApiDiffSampleStory = ({ beforeYaml, afterYaml, displayMode, hideUnchangedNodes }: OpenApiDiffSampleStoryProps) => {
  const { mergedSource, path } = useMemo(() => {
    const before = parseYamlSource(beforeYaml);
    const after = parseYamlSource(afterYaml);
    return { mergedSource: mergeOpenApiDocuments(before, after), path: resolveMergedPath(after, before) };
  }, [beforeYaml, afterYaml]);
  return (
    <OpenApiOperationDiffsViewer
      mergedSource={mergedSource}
      operationKeys={{ path, method: OPENAPI_DIFFS_SUITE_METHOD }}
      diffMetaKeys={OPENAPI_STORY_DIFF_META_KEYS}
      displayMode={displayMode}
      hideUnchangedNodes={hideUnchangedNodes}
      devMode={true}
    />
  );
};
