import { parseYamlSource } from "./parse-yaml-source";
import { collectSampleSources, type RawSampleSources } from "./sample-cases";

export type RawJsonSchemaSources = RawSampleSources;

export type JsonSchemaSampleCase = {
  caseId: string;
  schema: Record<string, unknown>;
};

export const collectJsonSchemaSampleCases = (
  sampleFiles: RawJsonSchemaSources,
): JsonSchemaSampleCase[] =>
  collectSampleSources(sampleFiles, ["/sample.yaml", "/sample.json"]).map(({ caseId, source }) => ({
    caseId,
    schema: parseYamlSource(source),
  }));
