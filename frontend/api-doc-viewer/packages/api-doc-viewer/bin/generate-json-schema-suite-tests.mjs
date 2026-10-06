import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { kebabCase } from "lodash-es";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";
import {
  JSON_SCHEMA_SUITES,
  collectCasesForType,
  toExportName,
} from "./json-schema-sample-generation-utils.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const testsOutDir = path.resolve(packageRoot, "src/it/json-schema-suite");

const printTestFile = ({ schemaType, title, metaId }) => {
  const cases = collectCasesForType(schemaType);
  const testIdsLiteral = cases
    .map((sampleCase) => `  '${kebabCase(toExportName(sampleCase.caseId))}',`)
    .join("\n");

  return `/**
 * Auto-generated screenshot tests for ${title} stories.
 * Regenerate: node bin/generate-json-schema-suite-tests.mjs (from packages/api-doc-viewer).
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = '${metaId}'
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

const TEST_IDS: string[] = [
${testIdsLiteral}
]

beforeEach(async () => {
  await jestPuppeteer.resetPage()
})

for (const testId of TEST_IDS) {
  it(testId, async () => {
    const story = await storyPage(page, \`\${META_ID}--\${testId}\`)
    await waitForJsonSchemaViewer(page)
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

for (const suite of JSON_SCHEMA_SUITES) {
  const filePath = path.join(testsOutDir, suite.testFileName);
  writeFileSync(filePath, printTestFile(suite));
  console.log(
    `Generated ${path.relative(packageRoot, filePath)} (${collectCasesForType(suite.schemaType).length} tests)`,
  );
}
