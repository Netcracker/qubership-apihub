import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";
import { COMBINER_KINDS, combinerKindLabel, combinerKindSlug } from "./combiner-schema-builder.mjs";
import { listCombinerPlainCases, toCombinerCaseExportName } from "./combiner-plain-case-definitions.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const storiesOutDir = path.resolve(packageRoot, "src/stories/json-schema-suite");

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

/**
 * @param {typeof COMBINER_STORY_SUITES[number]} suite
 * @param {ReturnType<typeof listCombinerPlainCases>} cases
 */
const printStoryFile = (suite, cases) => {
  const exports = cases
    .map(
      (sampleCase) =>
        `export const ${toCombinerCaseExportName(sampleCase.caseId)}: Story = createCaseStory("${sampleCase.caseId}");`,
    )
    .join("\n");

  return `/**
 * Programmatic combiner (${suite.combinerKind}) stories.
 * See src/stories/json-schema-suite/combiner-plain-case-definitions.ts and packages/samples/json-schema/{oneOf,anyOf,allOf}/README.md.
 * Regenerate: node --experimental-strip-types bin/generate-combiner-suite-stories.mjs
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  JsonSchemaSampleStory,
  jsonSchemaSamplesStoryMetaBase,
  toSampleYaml,
  type JsonSchemaSamplesStoryObj,
} from "./json-schema-samples-common";
import {
  buildCombinerPlainProgrammaticSampleCases,
  type CombinerPlainProgrammaticSampleCase,
} from "./combiner-plain-samples";
import { JsonSchemaViewer } from "@apihub/components/JsonSchemaViewer/JsonSchemaViewer";

const sampleCases = buildCombinerPlainProgrammaticSampleCases("${suite.combinerKind}");
const sampleById = sampleCases.reduce<Record<string, CombinerPlainProgrammaticSampleCase>>(
  (accumulator, sampleCase) => {
    accumulator[sampleCase.caseId] = sampleCase;
    return accumulator;
  },
  {},
);

const createCaseStory = (caseId: string): JsonSchemaSamplesStoryObj => {
  const sampleCase = sampleById[caseId];
  if (!sampleCase) {
    throw new Error(\`Sample case not found: \${caseId}\`);
  }

  return {
    name: caseId,
    args: { caseId, sampleYaml: toSampleYaml(sampleCase.schema) },
    render: (args) => {
      const resolvedSample = sampleById[args.caseId];
      return (
        <JsonSchemaViewer schema={resolvedSample.schema} expandedDepth={5} />
      );
    },
  };
};

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsonSchemaSamplesStoryMetaBase,
  id: "${suite.metaId}",
  title: "${suite.title}",
} satisfies Meta<typeof JsonSchemaSampleStory>;

export default meta;

type Story = JsonSchemaSamplesStoryObj;

${exports}
`;
};

mkdirSync(storiesOutDir, { recursive: true });

for (const suite of COMBINER_STORY_SUITES) {
  const cases = listCombinerPlainCases(suite.combinerKind);
  const filePath = path.join(storiesOutDir, suite.storyFileName);
  writeFileSync(filePath, printStoryFile(suite, cases));
  console.log(`Generated ${path.relative(packageRoot, filePath)} (${cases.length} stories)`);
}
