import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { kebabCase } from "lodash-es";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";
import { COMBINER_KINDS, combinerKindLabel, combinerKindSlug } from "./combiner-schema-builder.mjs";
import { listCombinerPlainCases, toCombinerCaseExportName } from "./combiner-plain-case-definitions.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const testsOutDir = path.resolve(packageRoot, "src/it/json-schema-suite");

/** @type {Array<{ combinerKind: string, storyFileName: string, testFileName: string, metaId: string, title: string }>} */
const COMBINER_STORY_SUITES = COMBINER_KINDS.map((combinerKind) => {
  const slug = combinerKindSlug(combinerKind);
  const label = combinerKindLabel(combinerKind);
  return {
    combinerKind,
    storyFileName: `${slug}-combiner-suite.stories.tsx`,
    testFileName: `${slug}-combiner-suite.it-test.ts`,
    metaId: `json-schema-suite-${slug}-combiner-suite`,
    title: `JSON Schema Suite/Combiners/${label} Combiner Suite`,
  };
});

const printTestFile = ({ title, metaId, testIdsLiteral }) => `/**
 * Auto-generated screenshot tests for ${title} stories.
 * Regenerate: node --experimental-strip-types bin/generate-combiner-suite-tests.mjs
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

for (const suite of COMBINER_STORY_SUITES) {
  const cases = listCombinerPlainCases(suite.combinerKind);
  const testIdsLiteral = cases
    .map((sampleCase) => `  '${kebabCase(toCombinerCaseExportName(sampleCase.caseId))}',`)
    .join("\n");
  const filePath = path.join(testsOutDir, suite.testFileName);
  writeFileSync(
    filePath,
    printTestFile({ title: suite.title, metaId: suite.metaId, testIdsLiteral }),
  );
  console.log(`Generated ${path.relative(packageRoot, filePath)} (${cases.length} tests)`);
}
