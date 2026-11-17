import { isOpenApiHttpMethod } from "@netcracker/qubership-apihub-next-data-model/shared/openapi/types/http-method";
import { collectSampleSources } from "../utils/sample-cases";

/** `packages/samples/openapi/<dialect>/<case-id>/sample.yaml` texts by case id. */
export const collectOpenApiSamples = (sampleFiles: Record<string, string>): Record<string, string> =>
  Object.fromEntries(collectSampleSources(sampleFiles, ["/sample.yaml"]).map(({ caseId, source }) => [caseId, source]));

export const takeOpenApiSample = (samples: Record<string, string>, caseId: string): string => {
  const sample = samples[caseId];
  if (sample === undefined) {
    throw new Error(`OpenAPI sample case not found: ${caseId}`);
  }
  return sample;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A method template (`oas30/http-methods/template`) served as `method`: the only operation of the
 * path item at `path` moves under the `method` key; the rest of the document is kept.
 */
export const serveTemplateOperationAs = (document: Record<string, unknown>, path: string, method: string): Record<string, unknown> => {
  const paths = document.paths;
  const pathItem = isRecord(paths) ? paths[path] : undefined;
  if (!isRecord(paths) || !isRecord(pathItem)) {
    throw new Error(`OpenAPI method template has no path item ${path}`);
  }
  const operations = Object.entries(pathItem).filter(([key]) => isOpenApiHttpMethod(key));
  if (operations.length !== 1) {
    throw new Error(`OpenAPI method template must have exactly one operation under ${path}, found ${operations.length}`);
  }
  const [[, operation]] = operations;
  const pathItemRest = Object.fromEntries(Object.entries(pathItem).filter(([key]) => !isOpenApiHttpMethod(key)));
  return { ...document, paths: { ...paths, [path]: { ...pathItemRest, [method]: operation } } };
};
