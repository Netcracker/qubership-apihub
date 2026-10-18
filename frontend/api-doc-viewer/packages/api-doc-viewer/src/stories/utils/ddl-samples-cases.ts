import { collectSampleSources, type RawSampleSources } from "./sample-cases";
import type { TableKey } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key";

export type RawDdlSources = RawSampleSources;

export type DdlSampleCase = {
  caseId: string;
  ddl: string;
  tableKey: TableKey;
};

export const DEFAULT_DDL_SAMPLE_TABLE_KEY: TableKey = {
  schemaName: "public",
  name: "t",
};

export const collectDdlSampleCases = (
  sampleFiles: RawDdlSources,
  tableKey: TableKey = DEFAULT_DDL_SAMPLE_TABLE_KEY,
): DdlSampleCase[] =>
  collectSampleSources(sampleFiles, ["/sample.sql"]).map(({ caseId, source }) => ({ caseId, ddl: source, tableKey }));
