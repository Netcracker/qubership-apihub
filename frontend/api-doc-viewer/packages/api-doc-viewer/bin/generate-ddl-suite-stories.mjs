import { existsSync, readdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const samplesRoot = path.resolve(packageRoot, "../samples/ddlapi");
const storiesOutDir = path.resolve(packageRoot, "src/stories/ddlapi-suite");

const SUITES = [
  {
    suiteId: "column-constraints",
    title: "DDL API Suite/Column Constraints",
    storyFileName: "column-constraints-samples.stories.tsx",
  },
  {
    suiteId: "column-types",
    title: "DDL API Suite/Column Types",
    storyFileName: "column-types-samples.stories.tsx",
  },
  {
    suiteId: "indexes",
    title: "DDL API Suite/Indexes",
    storyFileName: "indexes-samples.stories.tsx",
  },
  {
    suiteId: "escaping-spec-chars",
    title: "DDL API Suite/Escaping Spec Chars",
    storyFileName: "escaping-spec-chars-samples.stories.tsx",
  },
  {
    suiteId: "display-mode-simple",
    title: "DDL API Suite/Display Mode Simple",
    storyFileName: "display-mode-simple-samples.stories.tsx",
    displayMode: "simple",
  },
];

const toPascalCase = (caseId) =>
  caseId
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");

const makeMetaId = (suiteId) => `ddlapi-suite-${suiteId}`;

const collectCaseIds = (suiteId) =>
  readdirSync(path.join(samplesRoot, suiteId), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((caseId) =>
      existsSync(path.join(samplesRoot, suiteId, caseId, "sample.sql")),
    )
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

const printStoryFile = ({ suiteId, title, displayMode }) => {
  const metaId = makeMetaId(suiteId);
  const caseIds = collectCaseIds(suiteId);
  const exports = caseIds
    .map(
      (caseId) =>
        `export const ${toPascalCase(caseId)}: Story = createCaseStory("${caseId}");`,
    )
    .join("\n");

  const displayModeImport = displayMode
    ? `import { ${displayMode === "simple" ? "SIMPLE" : "DETAILED"}_DISPLAY_MODE } from "@apihub/types/DisplayMode";\n`
    : "";
  const factoryOptions = displayMode
    ? `, { displayMode: ${displayMode === "simple" ? "SIMPLE" : "DETAILED"}_DISPLAY_MODE }`
    : "";

  return `import { DdlTableViewer } from "@apihub/components/DdlTableViewer/DdlTableViewer";
${displayModeImport}import type { Meta, StoryObj } from "@storybook/react";
import {
  collectDdlSampleCases,
  createDdlSampleById,
} from "../utils/ddl-samples-cases";
import { createCaseStoryFactory } from "./ddl-samples-common";

const sampleFiles = import.meta.glob(
  "../../../../samples/ddlapi/${suiteId}/*/sample.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlSampleCases(sampleFiles);
const sampleById = createDdlSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById${factoryOptions});

// eslint-disable-next-line storybook/story-exports
const meta = {
  id: "${metaId}",
  title: "${title}",
  component: DdlTableViewer,
} satisfies Meta<typeof DdlTableViewer>;

export default meta;

type Story = StoryObj<typeof DdlTableViewer>;

${exports}
`;
};

for (const suite of SUITES) {
  const filePath = path.join(storiesOutDir, suite.storyFileName);
  writeFileSync(filePath, printStoryFile(suite));
  console.log(
    `Generated ${path.relative(packageRoot, filePath)} (${collectCaseIds(suite.suiteId).length} stories)`,
  );
}
