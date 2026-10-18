import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { kebabCase } from "lodash-es";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";
import {
  JSON_SCHEMA_VALIDATION_VALUE_RANGE_SUITES,
  JSON_SCHEMA_VALIDATION_YAML_SUITES,
  collectJsonSchemaValidationYamlCasesForGroup,
  toValidationCaseExportName,
} from "./json-schema-validation-case-definitions.mjs";
import { listValueRangePlainCases } from "./value-range-plain-case-definitions.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const testsOutDir = path.resolve(packageRoot, "src/it/json-schema-suite");

const printTestFile = ({ title, metaId, testIdsLiteral }) => `/**
 * Auto-generated screenshot tests for ${title} stories.
 * Regenerate: node --experimental-strip-types bin/generate-json-schema-validation-suite-tests.mjs
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

mkdirSync(testsOutDir, { recursive: true });

for (const suite of JSON_SCHEMA_VALIDATION_YAML_SUITES) {
  const cases = collectJsonSchemaValidationYamlCasesForGroup(suite.group);
  const testIdsLiteral = cases
    .map((sampleCase) => `  '${kebabCase(toValidationCaseExportName(sampleCase.caseId))}',`)
    .join("\n");
  const filePath = path.join(testsOutDir, suite.testFileName);
  writeFileSync(
    filePath,
    printTestFile({ title: suite.title, metaId: suite.metaId, testIdsLiteral }),
  );
  console.log(`Generated ${path.relative(packageRoot, filePath)} (${cases.length} tests)`);
}

for (const suite of JSON_SCHEMA_VALIDATION_VALUE_RANGE_SUITES) {
  const cases = listValueRangePlainCases({ includeOas31Only: suite.includeOas31Only });
  const testIdsLiteral = cases
    .map((sampleCase) => `  '${kebabCase(toValidationCaseExportName(sampleCase.caseId))}',`)
    .join("\n");
  const filePath = path.join(testsOutDir, suite.testFileName);
  writeFileSync(
    filePath,
    printTestFile({ title: suite.title, metaId: suite.metaId, testIdsLiteral }),
  );
  console.log(`Generated ${path.relative(packageRoot, filePath)} (${cases.length} tests)`);
}
