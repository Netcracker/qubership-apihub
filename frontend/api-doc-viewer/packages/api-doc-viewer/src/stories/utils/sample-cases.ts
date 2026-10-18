/**
 * Fixture-folder conventions shared by every sample-driven story suite: one folder per case under
 * `packages/samples/`, the folder name is the case id, and the folder holds either one sample file
 * (`sample.sql`, `sample.yaml`, ...) or a `before.<ext>` / `after.<ext>` pair. Suites map the raw
 * source texts returned here onto their own typed case shape.
 */

/** `import.meta.glob(..., { query: "?raw", import: "default", eager: true })` result: file path -> file text. */
export type RawSampleSources = Record<string, string>;

export type SampleSource = {
  caseId: string;
  source: string;
};

export type BeforeAfterSampleSource = {
  caseId: string;
  before: string;
  after: string;
};

const compareCaseIds = (left: { caseId: string }, right: { caseId: string }): number =>
  left.caseId.localeCompare(right.caseId, undefined, { numeric: true });

/** Case id = name of the folder that holds a file ending with one of `fileNames` (e.g. `"/sample.sql"`). */
export const extractSampleCaseId = (
  samplePath: string,
  fileNames: readonly string[],
): string | undefined => {
  const normalized = samplePath.replaceAll("\\", "/");
  const fileName = fileNames.find((candidate) => normalized.endsWith(candidate));
  if (!fileName) {
    return undefined;
  }

  const parts = normalized.slice(0, -fileName.length).split("/");
  return parts[parts.length - 1];
};

/** One sample file per case folder, sorted by case id (numeric-aware). */
export const collectSampleSources = (
  sampleFiles: RawSampleSources,
  fileNames: readonly string[],
): SampleSource[] => {
  const sources: SampleSource[] = [];

  for (const [samplePath, source] of Object.entries(sampleFiles)) {
    const caseId = extractSampleCaseId(samplePath, fileNames);
    if (caseId) {
      sources.push({ caseId, source });
    }
  }

  return sources.sort(compareCaseIds);
};

/**
 * `before.<extension>` / `after.<extension>` pairs per case folder, sorted by case id
 * (numeric-aware). Cases without a matching `after` file are skipped.
 */
export const collectBeforeAfterSampleSources = (
  beforeFiles: RawSampleSources,
  afterFiles: RawSampleSources,
  extension: string,
): BeforeAfterSampleSource[] => {
  const beforeFileName = `/before.${extension}`;
  const afterFileName = `/after.${extension}`;
  const sources: BeforeAfterSampleSource[] = [];

  for (const [beforePath, before] of Object.entries(beforeFiles)) {
    const caseId = extractSampleCaseId(beforePath, [beforeFileName]);
    if (!caseId) {
      continue;
    }

    const after = afterFiles[beforePath.replace(beforeFileName, afterFileName)];
    if (after) {
      sources.push({ caseId, before, after });
    }
  }

  return sources.sort(compareCaseIds);
};

export const createSampleById = <TSample extends { caseId: string }>(
  sampleCases: readonly TSample[],
): Record<string, TSample> =>
  Object.fromEntries(sampleCases.map((sampleCase) => [sampleCase.caseId, sampleCase]));
