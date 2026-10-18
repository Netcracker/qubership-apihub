import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";
import { COMBINER_KINDS, combinerKindLabel, combinerKindSlug } from "./combiner-schema-builder.mjs";
import { listCombinerDiffCases, toCombinerCaseExportName } from "./combiner-diff-case-definitions.mjs";
import { toStorybookMetaId } from "./storybook-story-id-utils.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const storiesOutDir = path.resolve(packageRoot, "src/stories/json-schema-diffs-suite");

/** @type {Array<{ combinerKind: string, storyFileName: string, testFileName: string, metaKebab: string, title: string }>} */
const COMBINER_DIFF_STORY_SUITES = COMBINER_KINDS.map((combinerKind) => {
  const slug = combinerKindSlug(combinerKind);
  const label = combinerKindLabel(combinerKind);
  const title = `JSON Schema Diffs Suite/Combiners/${label} Combiner Diffs Suite`;
  return {
    combinerKind,
    storyFileName: `${slug}-combiner-diffs-suite.stories.tsx`,
    testFileName: `${slug}-combiner-diffs-suite.it-test.ts`,
    metaKebab: toStorybookMetaId(title),
    title,
  };
});

mkdirSync(storiesOutDir, { recursive: true });

/**
 * @param {typeof COMBINER_DIFF_STORY_SUITES[number]} suite
 * @param {ReturnType<typeof listCombinerDiffCases>} cases
 */
const printStoryFile = (suite, cases) => {
  // allOf has no variant selector (all sub-schemas apply simultaneously) -- nothing to switch.
  const factoryName = suite.combinerKind !== "allOf"
    ? "createJsonSchemaDiffCaseStoryFactoryWithChangedVariant"
    : "createJsonSchemaDiffCaseStoryFactory";
  const exports = cases
    .map(
      (sampleCase) =>
        `export const ${toCombinerCaseExportName(sampleCase.caseId)}: Story = createCaseStory("${sampleCase.caseId}");`,
    )
    .join("\n");

  return `/**
 * Programmatic combiner (${suite.combinerKind}) diff stories.
 * See src/stories/json-schema-diffs-suite/combiner-diff-case-definitions.ts and packages/samples/json-schema-diffs/{oneOf,anyOf,allOf}/README.md.
 * Regenerate: node --experimental-strip-types bin/generate-combiner-diffs-suite-stories.mjs
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  JsonSchemaDiffSamplesStoryWithDisabledSubstitutionTitle,
  ${factoryName},
  jsonSchemaDiffSampleReadonlyArgTypes,
} from "./json-schema-diffs-utils";
import { createSampleById } from "../utils/sample-cases";
import { buildCombinerDiffProgrammaticSampleCases } from "./combiner-diff-samples";

const sampleCases = buildCombinerDiffProgrammaticSampleCases("${suite.combinerKind}");
const sampleById = createSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "${suite.title}",
  component: JsonSchemaDiffSamplesStoryWithDisabledSubstitutionTitle,
  argTypes: jsonSchemaDiffSampleReadonlyArgTypes,
} satisfies Meta<typeof JsonSchemaDiffSamplesStoryWithDisabledSubstitutionTitle>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = ${factoryName}(
  JsonSchemaDiffSamplesStoryWithDisabledSubstitutionTitle,
  sampleById,
);

${exports}
`;
};

for (const suite of COMBINER_DIFF_STORY_SUITES) {
  const cases = listCombinerDiffCases(suite.combinerKind);
  const filePath = path.join(storiesOutDir, suite.storyFileName);
  writeFileSync(filePath, printStoryFile(suite, cases));
  console.log(`Generated ${path.relative(packageRoot, filePath)} (${cases.length} stories)`);
}
