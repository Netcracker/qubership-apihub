import { DdlTableDiffsViewer } from "@apihub/components/DdlTableViewer/DdlTableDiffsViewer";
import { apiDiff } from "@netcracker/qubership-apihub-api-diff";
import type { Realm } from "@netcracker/qubership-apihub-ddlapi";
import type { DisplayMode } from "@apihub/types/DisplayMode";
import type { ArgTypes, Meta, StoryObj } from "@storybook/react-vite";
import { DISPLAY_MODE_ARG_TYPES, DISPLAY_MODE_DEFAULT_ARGS } from "../shared/display-mode-arg-types";
import { NavigationLinkBuilder } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/navigation-link-builder";
import { TableKey } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key";
import { buildFromDdlInBrowser, resolveDdlDiffComparePair } from "../ddlapi-suite/build-from-ddl-browser";
import { TEST_DIFF_META_KEYS } from "../shared/test-diff-meta-keys";
import { collectBeforeAfterSampleSources, type RawSampleSources } from "../utils/sample-cases";
import { ddlStoryNavigationLinkBuilder } from "../ddlapi-suite/ddl-story-navigation";

export type DdlDiffSampleCase = {
  caseId: string;
  beforeSql: string;
  afterSql: string;
};

export type DdlDiffCaseStoryComponentProps = Pick<
  DdlDiffSampleCase,
  "caseId" | "beforeSql" | "afterSql"
> & {
  displayMode?: DisplayMode;
};

export const ddlDiffSampleReadonlyArgTypes = {
  caseId: {
    control: { type: "text" },
    table: { category: "Sample" },
    description: "Sample case identifier. The viewer always uses the bundled fixture for this case.",
  },
  beforeSql: {
    control: { type: "text" },
    table: { category: "Sample" },
    description:
      "Before sample SQL for reference. The viewer always uses the bundled fixture for the selected case.",
  },
  afterSql: {
    control: { type: "text" },
    table: { category: "Sample" },
    description:
      "After sample SQL for reference. The viewer always uses the bundled fixture for the selected case.",
  },
  ...DISPLAY_MODE_ARG_TYPES,
} satisfies Partial<ArgTypes<DdlDiffCaseStoryComponentProps>>;

export const DdlDiffSampleStory = (_props: DdlDiffCaseStoryComponentProps) => null;

export type DdlDiffsSamplesStoryMeta = Meta<typeof DdlDiffSampleStory>;
export type DdlDiffsSamplesStoryObj = StoryObj<DdlDiffsSamplesStoryMeta>;

export const ddlDiffsSamplesStoryMetaBase = {
  component: DdlDiffSampleStory,
  argTypes: ddlDiffSampleReadonlyArgTypes,
} satisfies Pick<DdlDiffsSamplesStoryMeta, "component" | "argTypes">;

export type RawSqlSources = RawSampleSources;

const DEFAULT_TABLE_KEY: TableKey = {
  schemaName: "public",
  name: "t",
};

const TABLE_KEYS_BY_CASE_ID: Record<string, TableKey> = {};

export const collectDdlDiffSampleCases = (
  beforeFiles: RawSqlSources,
  afterFiles: RawSqlSources,
): DdlDiffSampleCase[] =>
  collectBeforeAfterSampleSources(beforeFiles, afterFiles, "sql").map(({ caseId, before, after }) => ({
    caseId,
    beforeSql: before,
    afterSql: after,
  }));

export const resolveTableKey = (caseId: string): TableKey =>
  TABLE_KEYS_BY_CASE_ID[caseId] ?? DEFAULT_TABLE_KEY;

async function prepareDdlDiffsMergedSource(
  beforeSql: string,
  afterSql: string,
): Promise<Realm> {
  const [beforeRealm, afterRealm] = await Promise.all([
    buildFromDdlInBrowser(beforeSql),
    buildFromDdlInBrowser(afterSql),
  ]);
  const { before, after } = resolveDdlDiffComparePair(beforeRealm, afterRealm);

  const { merged } = apiDiff(before, after, {
    unify: true,
    validate: true,
    metaKey: TEST_DIFF_META_KEYS.diffsMetaKey,
    normalizedResult: false,
  }) as { merged: Realm };

  return merged;
}

type LoaderData = {
  mergedSource: Realm;
  tableKey: TableKey;
};

export const createDdlDiffCaseStoryFactory = (
  sampleById: Record<string, DdlDiffSampleCase>,
) => (caseId: string): DdlDiffsSamplesStoryObj => {
  const sample = sampleById[caseId];
  if (!sample) {
    throw new Error(`Sample case not found: ${caseId}`);
  }

  return {
    name: caseId,
    args: {
      caseId,
      beforeSql: sample.beforeSql,
      afterSql: sample.afterSql,
      ...DISPLAY_MODE_DEFAULT_ARGS,
    },
    argTypes: ddlDiffSampleReadonlyArgTypes,
    loaders: [
      async () => ({
        mergedSource: await prepareDdlDiffsMergedSource(sample.beforeSql, sample.afterSql),
        tableKey: resolveTableKey(caseId),
      } satisfies LoaderData),
    ],
    render: (args, { loaded }) => (
      <DdlTableDiffsViewer
        mergedSource={loaded!.mergedSource}
        tableKey={loaded!.tableKey}
        navigationLinkBuilder={ddlStoryNavigationLinkBuilder}
        diffMetaKeys={TEST_DIFF_META_KEYS}
        displayMode={args.displayMode}
        devMode
      />
    ),
  };
};
