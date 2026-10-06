import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";
import {
  JSON_SCHEMA_VALIDATION_VALUE_RANGE_SUITES,
  JSON_SCHEMA_VALIDATION_YAML_SUITES,
  collectJsonSchemaValidationYamlCasesForGroup,
  toValidationCaseExportName,
} from "./json-schema-validation-case-definitions.mjs";
import { getSampleFileName, resolveSampleFormat } from "./json-schema-sample-generation-utils.mjs";
import { listValueRangePlainCases } from "./value-range-plain-case-definitions.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const storiesOutDir = path.resolve(packageRoot, "src/stories/json-schema-suite");
const sampleFormat = resolveSampleFormat();
const sampleFileName = getSampleFileName(sampleFormat);

const printYamlStoryFile = ({ group, title, metaId }) => {
  const cases = collectJsonSchemaValidationYamlCasesForGroup(group);
  const exports = cases
    .map(
      (sampleCase) =>
        `export const ${toValidationCaseExportName(sampleCase.caseId)}: Story = createCaseStory("${sampleCase.caseId}");`,
    )
    .join("\n");

  return `/**
 * Regenerate YAML samples: node bin/generate-json-schema-validation-samples.mjs
 * Regenerate this file: node bin/generate-json-schema-validation-suite-stories.mjs
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  collectJsonSchemaSampleCases,
} from "../utils/json-schema-samples-cases";
import { createSampleById } from "../utils/sample-cases";
import {
  JsonSchemaSampleStory,
  createCaseStoryFactory,
  jsonSchemaSamplesStoryMetaBase,
  type JsonSchemaSamplesStoryObj,
} from "./json-schema-samples-common";

const sampleFiles = import.meta.glob(
  "../../../../samples/json-schema/${group}/*/${sampleFileName}",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectJsonSchemaSampleCases(sampleFiles);
const sampleById = createSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsonSchemaSamplesStoryMetaBase,
  id: "${metaId}",
  title: "${title}",
} satisfies Meta<typeof JsonSchemaSampleStory>;

export default meta;

type Story = JsonSchemaSamplesStoryObj;

${exports}
`;
};

const printValueRangeStoryFile = (suite) => {
  const cases = listValueRangePlainCases({ includeOas31Only: suite.includeOas31Only });
  const exports = cases
    .map(
      (sampleCase) =>
        `export const ${toValidationCaseExportName(sampleCase.caseId)}: Story = createCaseStory("${sampleCase.caseId}");`,
    )
    .join("\n");

  return `/**
 * Programmatic value-range plain stories (see value-range-plain-case-definitions.ts).
 * Regenerate: node bin/generate-json-schema-validation-suite-stories.mjs
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { JsonSchemaViewer } from "@apihub/components/JsonSchemaViewer/JsonSchemaViewer";
import {
  JsonSchemaSampleStory,
  jsonSchemaSamplesStoryMetaBase,
  toSampleYaml,
  type JsonSchemaSamplesStoryObj,
} from "./json-schema-samples-common";
import {
  ${suite.sampleBuilderName},
  type ValueRangePlainProgrammaticSampleCase,
} from "./value-range-plain-samples";

const sampleCases = ${suite.sampleBuilderName}({ includeOas31Only: ${suite.includeOas31Only}, type: "${suite.schemaType}" });
const sampleById = sampleCases.reduce<Record<string, ValueRangePlainProgrammaticSampleCase>>(
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

for (const suite of JSON_SCHEMA_VALIDATION_YAML_SUITES) {
  const filePath = path.join(storiesOutDir, suite.storyFileName);
  writeFileSync(filePath, printYamlStoryFile(suite));
  console.log(
    `Generated ${path.relative(packageRoot, filePath)} (${collectJsonSchemaValidationYamlCasesForGroup(suite.group).length} stories)`,
  );
}

for (const suite of JSON_SCHEMA_VALIDATION_VALUE_RANGE_SUITES) {
  const filePath = path.join(storiesOutDir, suite.storyFileName);
  writeFileSync(filePath, printValueRangeStoryFile(suite));
  console.log(
    `Generated ${path.relative(packageRoot, filePath)} (${listValueRangePlainCases({ includeOas31Only: suite.includeOas31Only }).length} stories)`,
  );
}
