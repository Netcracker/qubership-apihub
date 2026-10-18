import { collectBeforeAfterSampleSources, type RawSampleSources } from "./sample-cases";

export type RawYamlSources = RawSampleSources;

export type SampleCase = {
  caseId: string;
  beforeYaml: string;
  afterYaml: string;
};

export const collectSampleCases = (beforeFiles: RawYamlSources, afterFiles: RawYamlSources): SampleCase[] =>
  collectBeforeAfterSampleSources(beforeFiles, afterFiles, "yaml").map(({ caseId, before, after }) => ({
    caseId,
    beforeYaml: before,
    afterYaml: after,
  }));
