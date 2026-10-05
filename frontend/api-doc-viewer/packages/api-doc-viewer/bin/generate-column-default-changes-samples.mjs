import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const groupId = "column-default-changes";
const samplesRoot = path.resolve(packageRoot, "../samples/ddlapi-diffs", groupId);
const storiesOut = path.resolve(packageRoot, "src/stories/ddlapi-diffs-suite/column-default-changes-samples.stories.tsx");
const testsOut = path.resolve(packageRoot, "src/it/ddlapi-diffs-suite/column-default-changes-samples.it-test.ts");

const metaTitle = "DDL API Diffs Suite/Column Default Changes Samples";
const metaKebab = "ddl-api-diffs-suite-column-default-changes-samples";

/**
 * Canonical PostgreSQL scalar storage types from the ddlapi scalar guard list that accept a
 * constant DEFAULT (PostgreSQL CREATE TABLE … DEFAULT). Serial aliases and duplicate type names
 * are omitted — see packages/samples/ddlapi-diffs/README.md.
 */
const TYPE_SPECS = [
  {
    slug: "bigint",
    columnType: "bigint",
    defaultAdd: "0",
    defaultReplaceBefore: "0",
    defaultReplaceAfter: "42",
  },
  {
    slug: "bit",
    columnType: "bit(3)",
    defaultAdd: "B'101'",
    defaultReplaceBefore: "B'101'",
    defaultReplaceAfter: "B'010'",
  },
  {
    slug: "bit-varying",
    columnType: "bit varying(4)",
    defaultAdd: "B'1010'",
    defaultReplaceBefore: "B'1010'",
    defaultReplaceAfter: "B'0101'",
  },
  {
    slug: "boolean",
    columnType: "boolean",
    defaultAdd: "true",
    defaultReplaceBefore: "true",
    defaultReplaceAfter: "false",
  },
  {
    slug: "bytea",
    columnType: "bytea",
    defaultAdd: "E'\\\\x0102'",
    defaultReplaceBefore: "E'\\\\x0102'",
    defaultReplaceAfter: "E'\\\\x0304'",
  },
  {
    slug: "char",
    columnType: "char(3)",
    defaultAdd: "'abc'",
    defaultReplaceBefore: "'abc'",
    defaultReplaceAfter: "'xyz'",
  },
  {
    slug: "date",
    columnType: "date",
    defaultAdd: "'2024-06-15'",
    defaultReplaceBefore: "'2024-06-15'",
    defaultReplaceAfter: "'2025-01-01'",
  },
  {
    slug: "double-precision",
    columnType: "double precision",
    defaultAdd: "3.14",
    defaultReplaceBefore: "3.14",
    defaultReplaceAfter: "2.71",
  },
  {
    slug: "integer",
    columnType: "integer",
    defaultAdd: "0",
    defaultReplaceBefore: "0",
    defaultReplaceAfter: "42",
  },
  {
    slug: "interval",
    columnType: "interval",
    defaultAdd: "'1 day'",
    defaultReplaceBefore: "'1 day'",
    defaultReplaceAfter: "'2 hours'",
  },
  {
    slug: "json",
    columnType: "json",
    defaultAdd: "'{}'",
    defaultReplaceBefore: "'{}'",
    defaultReplaceAfter: "'[]'",
  },
  {
    slug: "jsonb",
    columnType: "jsonb",
    defaultAdd: "'{\"status\":\"draft\"}'::jsonb",
    defaultReplaceBefore: "'{\"status\":\"draft\"}'::jsonb",
    defaultReplaceAfter: "'{\"status\":\"published\"}'::jsonb",
  },
  {
    slug: "money",
    columnType: "money",
    defaultAdd: "0",
    defaultReplaceBefore: "0",
    defaultReplaceAfter: "100",
  },
  {
    slug: "numeric",
    columnType: "numeric(10, 2)",
    defaultAdd: "1.50",
    defaultReplaceBefore: "1.50",
    defaultReplaceAfter: "9.99",
  },
  {
    slug: "real",
    columnType: "real",
    defaultAdd: "1.5",
    defaultReplaceBefore: "1.5",
    defaultReplaceAfter: "2.5",
  },
  {
    slug: "smallint",
    columnType: "smallint",
    defaultAdd: "0",
    defaultReplaceBefore: "0",
    defaultReplaceAfter: "7",
  },
  {
    slug: "text",
    columnType: "text",
    defaultAdd: "'draft'",
    defaultReplaceBefore: "'draft'",
    defaultReplaceAfter: "'published'",
  },
  {
    slug: "time",
    columnType: "time",
    defaultAdd: "'12:00:00'",
    defaultReplaceBefore: "'12:00:00'",
    defaultReplaceAfter: "'18:30:00'",
  },
  {
    slug: "timetz",
    columnType: "time with time zone",
    defaultAdd: "'12:00:00+02'",
    defaultReplaceBefore: "'12:00:00+02'",
    defaultReplaceAfter: "'09:00:00+02'",
  },
  {
    slug: "timestamp",
    columnType: "timestamp",
    defaultAdd: "'2024-06-15 12:00:00'",
    defaultReplaceBefore: "'2024-06-15 12:00:00'",
    defaultReplaceAfter: "'2025-01-01 00:00:00'",
  },
  {
    slug: "timestamptz",
    columnType: "timestamp with time zone",
    defaultAdd: "'2024-06-15 12:00:00+02'",
    defaultReplaceBefore: "'2024-06-15 12:00:00+02'",
    defaultReplaceAfter: "'2025-01-01 00:00:00+02'",
  },
  {
    slug: "uuid",
    columnType: "uuid",
    defaultAdd: "'550e8400-e29b-41d4-a716-446655440000'",
    defaultReplaceBefore: "'550e8400-e29b-41d4-a716-446655440000'",
    defaultReplaceAfter: "'6ba7b810-9dad-11d1-80b4-00c04fd430c8'",
  },
  {
    slug: "varchar",
    columnType: "character varying(50)",
    defaultAdd: "'active'",
    defaultReplaceBefore: "'active'",
    defaultReplaceAfter: "'inactive'",
  },
  {
    slug: "enum",
    columnType: "public.sample_status",
    defaultAdd: "'pending'",
    defaultReplaceBefore: "'pending'",
    defaultReplaceAfter: "'done'",
    enumPreamble: "CREATE TYPE public.sample_status AS ENUM ('pending', 'done');",
  },
];

const buildTableSql = (spec, defaultClause) => {
  const lines = [
    "CREATE SCHEMA IF NOT EXISTS public;",
    "",
  ];
  if (spec.enumPreamble) {
    lines.push(spec.enumPreamble, "");
  }
  lines.push(
    "CREATE TABLE public.t (",
    "  id integer,",
    `  sample_col ${spec.columnType}${defaultClause}`,
    ");",
    "",
  );
  return lines.join("\n");
};

const cases = [];

TYPE_SPECS.forEach((spec, index) => {
  const addId = `${101 + index}-add-default-${spec.slug}`;
  const removeId = `${201 + index}-remove-default-${spec.slug}`;
  const replaceId = `${301 + index}-replace-default-${spec.slug}`;

  const addDefault = ` DEFAULT ${spec.defaultAdd}`;
  const removeDefault = ` DEFAULT ${spec.defaultReplaceBefore}`;
  const replaceBefore = ` DEFAULT ${spec.defaultReplaceBefore}`;
  const replaceAfter = ` DEFAULT ${spec.defaultReplaceAfter}`;

  const writeCase = (caseId, beforeSql, afterSql) => {
    const caseDir = path.join(samplesRoot, caseId);
    mkdirSync(caseDir, { recursive: true });
    writeFileSync(path.join(caseDir, "before.sql"), beforeSql);
    writeFileSync(path.join(caseDir, "after.sql"), afterSql);
    cases.push(caseId);
  };

  writeCase(addId, buildTableSql(spec, ""), buildTableSql(spec, addDefault));
  writeCase(removeId, buildTableSql(spec, removeDefault), buildTableSql(spec, ""));
  writeCase(replaceId, buildTableSql(spec, replaceBefore), buildTableSql(spec, replaceAfter));
});

const toExportName = (caseId) =>
  `Case_${caseId.replace(/-/g, "_")}`;

const storyExports = cases
  .map((caseId) => `export const ${toExportName(caseId)}: Story = createCaseStory("${caseId}");`)
  .join("\n");

const storiesSource = `import type { Meta } from "@storybook/react-vite";
import {
  DdlDiffSampleStory,
  collectDdlDiffSampleCases,
  createDdlDiffCaseStoryFactory,
  createDdlDiffSampleById,
  ddlDiffsSamplesStoryMetaBase,
  type DdlDiffsSamplesStoryObj,
} from "./ddlapi-diffs-utils";

const beforeFiles = import.meta.glob(
  "../../../../samples/ddlapi-diffs/${groupId}/*/before.sql",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/ddlapi-diffs/${groupId}/*/after.sql",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlDiffSampleCases(beforeFiles, afterFiles);
const sampleById = createDdlDiffSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlDiffsSamplesStoryMetaBase,
  title: "${metaTitle}",
} satisfies Meta<typeof DdlDiffSampleStory>;

export default meta;

type Story = DdlDiffsSamplesStoryObj;

const createCaseStory = createDdlDiffCaseStoryFactory(sampleById);

${storyExports}
`;

const testCases = cases
  .map((caseId) => {
    const snapshotId = `${metaKebab}-${caseId}`;
    return `
  it('${caseId}', async () => {
    story = await storyPage(
      page,
      '${metaKebab}--case-${caseId}',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => \`${snapshotId}-\${counter}\`,
    });
  });`;
  })
  .join("\n");

const testsSource = `/**
 * Screenshot tests for ${metaTitle} stories.
 * Edit together with src/stories/ddlapi-diffs-suite/column-default-changes-samples.stories.tsx.
 * SQL fixtures: packages/api-doc-viewer/bin/generate-column-default-changes-samples.mjs
 */
import path from "path";
import { StoryPage } from "../service/story-page";
import { ViewComponent } from "../service/view-component";
import { storyPage } from "../service/storybook-service";

const SNAPSHOTS_DIR = path.resolve(__dirname, "..", "__image_snapshots__");

describe('${metaTitle}', () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  async function waitForDdlTableDiffsViewer() {
    await page.waitForSelector('[data-testid="ddl-table-diffs-viewer"]', { visible: true });
    await page.waitForFunction(() => document.readyState === "complete");
    await page.evaluate(() => new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    ));
  }
${testCases}
});
`;

writeFileSync(storiesOut, storiesSource);
writeFileSync(testsOut, testsSource);

console.log(`Generated ${cases.length} cases under ${samplesRoot}`);
console.log(`Stories: ${storiesOut}`);
console.log(`Tests: ${testsOut}`);
