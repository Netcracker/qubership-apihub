import { OpenApiOperationViewer } from "@apihub/components/OpenApiOperationViewer/OpenApiOperationViewer";
import { DisplayMode } from "@apihub/types/DisplayMode";
import { useMemo } from "react";
import { prepareOpenApiDocument } from "../preprocess";
import { type AutoSwitchArgs } from "../shared/auto-switch";
import { parseYamlSource } from "../utils/parse-yaml-source";
import { serveTemplateOperationAs } from "./openapi-suite-utils";

export type OpenApiSampleStoryProps = AutoSwitchArgs & {
  caseId: string;
  sampleYaml: string;
  path: string;
  method: string;
  /** The sample is a method template: its only operation under `path` is served as `method`. */
  methodTemplate?: boolean;
  displayMode?: DisplayMode;
  noHeading?: boolean;
};

export const OpenApiSampleStory = ({ sampleYaml, path, method, methodTemplate, displayMode, noHeading }: OpenApiSampleStoryProps) => {
  const source = useMemo(() => {
    const document = parseYamlSource(sampleYaml);
    return prepareOpenApiDocument(methodTemplate ? serveTemplateOperationAs(document, path, method) : document);
  }, [method, methodTemplate, path, sampleYaml]);
  return (
    <OpenApiOperationViewer
      source={source}
      operationKeys={{ path, method }}
      displayMode={displayMode}
      noHeading={noHeading}
      devMode={true}
    />
  );
};
