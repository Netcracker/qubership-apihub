
export type RawYamlSources = Record<string, string>;

export type SampleCase = {
  caseId: string;
  beforeYaml: string;
  afterYaml: string;
};
const BEFORE_SUFFIX = "/before.yaml";
const AFTER_SUFFIX = "/after.yaml";
const extractCaseId = (beforePath: string): string | undefined => {
  const normalized = beforePath.replaceAll("\\", "/");
  if (!normalized.endsWith(BEFORE_SUFFIX)) {
    return undefined;
  }

  const trimmed = normalized.slice(0, -BEFORE_SUFFIX.length);
  const parts = trimmed.split("/");
  return parts[parts.length - 1];
};

export const collectSampleCases = (beforeFiles: RawYamlSources, afterFiles: RawYamlSources): SampleCase[] => {
  const cases: SampleCase[] = [];

  for (const [beforePath, beforeYaml] of Object.entries(beforeFiles)) {
    const caseId = extractCaseId(beforePath);
    if (!caseId) {
      continue;
    }

    const afterPath = beforePath.replace(BEFORE_SUFFIX, AFTER_SUFFIX);
    const afterYaml = afterFiles[afterPath];
    if (!afterYaml) {
      continue;
    }

    cases.push({ caseId, beforeYaml, afterYaml });
  }

  return cases.sort((a, b) => a.caseId.localeCompare(b.caseId, undefined, { numeric: true }));
};
