import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";
import {
  JSON_SCHEMA_SUITES,
  collectCasesForType,
  getSampleFileName,
  resolveSampleFormat,
  toExportName,
} from "./json-schema-sample-generation-utils.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const storiesOutDir = path.resolve(packageRoot, "src/stories/json-schema-suite");
const sampleFormat = resolveSampleFormat();
const sampleFileName = getSampleFileName(sampleFormat);

const printStoryFile = ({ schemaType, title, metaId }) => {
  const cases = collectCasesForType(schemaType);
  const exports = cases
    .map(
      (sampleCase) =>
        `export const ${toExportName(sampleCase.caseId)}: Story = createCaseStory("${sampleCase.caseId}");`,
    )
    .join("\n");

  return `import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  collectJsonSchemaSampleCases,
} from "../utils/json-schema-samples-cases";
import { createSampleById } from "../utils/sample-cases";
import {
  JsonSchemaSampleStory,
  createCaseStoryFactory,
  jsonSchemaSamplesStoryMetaBase,
  type JsonSchemaSamplesStoryObj,
} from "./json-schema-samples-common"

const sampleFiles = import.meta.glob(
  "../../../../samples/json-schema/${schemaType}/*/${sampleFileName}",
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

mkdirSync(storiesOutDir, { recursive: true });

for (const suite of JSON_SCHEMA_SUITES) {
  const filePath = path.join(storiesOutDir, suite.storyFileName);
  writeFileSync(filePath, printStoryFile(suite));
  console.log(
    `Generated ${path.relative(packageRoot, filePath)} (${collectCasesForType(suite.schemaType).length} stories)`,
  );
}
