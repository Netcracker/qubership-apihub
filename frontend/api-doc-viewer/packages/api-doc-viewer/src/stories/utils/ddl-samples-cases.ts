import type { TableKey } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key";

export type RawDdlSources = Record<string, string>;

export type DdlSampleCase = {
  caseId: string;
  ddl: string;
  tableKey: TableKey;
};

const SAMPLE_SUFFIX = "/sample.sql";

export const DEFAULT_DDL_SAMPLE_TABLE_KEY: TableKey = {
  schemaName: "public",
  name: "t",
};

export const extractDdlCaseId = (samplePath: string): string | undefined => {
  const normalized = samplePath.replaceAll("\\", "/");
  if (!normalized.endsWith(SAMPLE_SUFFIX)) {
    return undefined;
  }

  const trimmed = normalized.slice(0, -SAMPLE_SUFFIX.length);
  const parts = trimmed.split("/");
  return parts[parts.length - 1];
};

export const collectDdlSampleCases = (
  sampleFiles: RawDdlSources,
  tableKey: TableKey = DEFAULT_DDL_SAMPLE_TABLE_KEY,
): DdlSampleCase[] => {
  const cases: DdlSampleCase[] = [];

  for (const [samplePath, ddl] of Object.entries(sampleFiles)) {
    const caseId = extractDdlCaseId(samplePath);
    if (!caseId) {
      continue;
    }

    cases.push({ caseId, ddl, tableKey });
  }

  return cases.sort((left, right) =>
    left.caseId.localeCompare(right.caseId, undefined, { numeric: true }),
  );
};

export const createDdlSampleById = (
  sampleCases: readonly DdlSampleCase[],
): Record<string, DdlSampleCase> =>
  sampleCases.reduce<Record<string, DdlSampleCase>>((accumulator, sampleCase) => {
    accumulator[sampleCase.caseId] = sampleCase;
    return accumulator;
  }, {});
