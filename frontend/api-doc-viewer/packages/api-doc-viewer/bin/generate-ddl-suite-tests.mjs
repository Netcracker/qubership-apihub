import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const samplesRoot = path.resolve(packageRoot, "../samples/ddlapi");
const testsOutDir = path.resolve(packageRoot, "src/it/ddlapi-suite");

const SUITES = [
  {
    suiteId: "column-constraints",
    title: "DDL API Suite/Column Constraints",
    testFileName: "column-constraints-samples.it-test.ts",
  },
  {
    suiteId: "column-types",
    title: "DDL API Suite/Column Types",
    testFileName: "column-types-samples.it-test.ts",
  },
  {
    suiteId: "indexes",
    title: "DDL API Suite/Indexes",
    testFileName: "indexes-samples.it-test.ts",
  },
  {
    suiteId: "escaping-spec-chars",
    title: "DDL API Suite/Escaping Spec Chars",
    testFileName: "escaping-spec-chars-samples.it-test.ts",
  },
  {
    suiteId: "display-mode-simple",
    title: "DDL API Suite/Display Mode Simple",
    testFileName: "display-mode-simple-samples.it-test.ts",
  },
];

const makeMetaId = (suiteId) => `ddlapi-suite-${suiteId}`;

const collectCaseIds = (suiteId) =>
  readdirSync(path.join(samplesRoot, suiteId), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((caseId) =>
      existsSync(path.join(samplesRoot, suiteId, caseId, "sample.sql")),
    )
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

const printTestFile = ({ suiteId, title }) => {
  const metaId = makeMetaId(suiteId);
  const testIds = collectCaseIds(suiteId);
  const testIdsLiteral = testIds.map((id) => `  '${id}',`).join("\n");

  return `/**
 * Auto-generated screenshot tests for ${title} stories.
 * Regenerate: npm run generate-tests (from packages/api-doc-viewer).
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'

const META_ID = '${metaId}'
const SNAPSHOTS_DIR = path.resolve(__dirname, '..', '__image_snapshots__')

const TEST_IDS: string[] = [
${testIdsLiteral}
]

async function waitForDdlTableViewer() {
  await page.waitForSelector('[data-testid="ddl-table-viewer"]', { visible: true })
  await page.waitForFunction(() => document.readyState === 'complete')
  await page.evaluate(() => new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  ))
}

beforeEach(async () => {
  await jestPuppeteer.resetPage()
})

for (const testId of TEST_IDS) {
  it(testId, async () => {
    const story = await storyPage(page, \`\${META_ID}--\${testId}\`)
    await waitForDdlTableViewer()
    const component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => \`\${META_ID}-\${testId}-\${counter}\`,
    })
  })
}
`;
};

mkdirSync(testsOutDir, { recursive: true });

for (const suite of SUITES) {
  const filePath = path.join(testsOutDir, suite.testFileName);
  writeFileSync(filePath, printTestFile(suite));
  console.log(
    `Generated ${path.relative(packageRoot, filePath)} (${collectCaseIds(suite.suiteId).length} tests)`,
  );
}
