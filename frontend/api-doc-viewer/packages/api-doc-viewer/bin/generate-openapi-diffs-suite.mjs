/**
 * Generates the OpenAPI Operation Diffs Suite from `bin/openapi-diffs-case-definitions.mjs`:
 *
 * - fixtures and catalogues: `packages/samples/openapi-diffs/` (recreated as a whole);
 * - stories: `src/stories/openapi-diffs-suite/<category>.stories.tsx`;
 * - screenshot ITs: `src/it/openapi-diffs-suite/<category>.it-test.ts` (every case in display
 *   mode `detailed`, the default, after the story `play` selects the case's options; `simple` is
 *   covered by `OpenAPI Operation Diffs Suite (Display Mode = simple)`);
 * - the case matrix block of `docs/design/openapi/features/diffs-case-matrix.md`.
 *
 * Usage (from packages/api-doc-viewer): node bin/generate-openapi-diffs-suite.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { stringify } from "yaml";
import { collectCategories } from "./openapi-diffs-case-definitions.mjs";
import { toStorybookMetaId, toStorybookStorySlug } from "./storybook-story-id-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const samplesRoot = path.resolve(packageRoot, "../samples/openapi-diffs");
const storiesDir = path.resolve(packageRoot, "src/stories/openapi-diffs-suite");
const itDir = path.resolve(packageRoot, "src/it/openapi-diffs-suite");
const matrixDoc = path.resolve(packageRoot, "../../docs/design/openapi/features/diffs-case-matrix.md");

const SUITE_TITLE = "OpenAPI Operation Diffs Suite";
const MATRIX_BEGIN = "<!-- BEGIN generated: node packages/api-doc-viewer/bin/generate-openapi-diffs-suite.mjs -->";
const MATRIX_END = "<!-- END generated -->";

const pad = (number) => String(number).padStart(2, "0");
const toExportName = (caseId) => `Case_${caseId.replace(/[^A-Za-z0-9]/g, "_")}`;
const applyAll = (doc, mutators) => {
  for (const mutate of mutators) {
    mutate?.(doc);
  }
  return doc;
};

/**
 * Expands case definitions of one category into concrete cases. Numbers are assigned to every
 * definition slot, including skipped ones, so one slug has the same id in every fragment folder.
 */
function expandCategory(category) {
  const { fragment, createBase } = category;
  const cases = [];
  let number = 1;
  for (const definition of category.cases) {
    const slots = definition.pair ? 2 : 1;
    const skipped = definition.skip?.(fragment) ?? false;
    const setup = definition.setup?.(fragment);
    if (!skipped && definition.pair) {
      const apply = definition.apply(fragment);
      const plain = () => applyAll(createBase(), [setup]);
      const applied = () => applyAll(createBase(), [setup, apply]);
      const [first, second] = definition.reversed ? [[applied, plain], [plain, applied]] : [[plain, applied], [applied, plain]];
      definition.pair.forEach((slug, index) => {
        const [before, after] = index === 0 ? first : second;
        cases.push({
          caseId: `${pad(number + index)}-${slug}`,
          slug,
          title: definition.titles[index],
          oppositeId: `${pad(number + 1 - index)}-${definition.pair[1 - index]}`,
          before: before(),
          after: after(),
          switchTo: definition.switchTo ?? [],
        });
      });
    } else if (!skipped) {
      cases.push({
        caseId: `${pad(number)}-${definition.change}`,
        slug: definition.change,
        title: definition.title,
        before: applyAll(createBase(), [setup, definition.before?.(fragment)]),
        after: applyAll(createBase(), [setup, definition.after(fragment)]),
        switchTo: definition.switchTo ?? [],
      });
    }
    number += slots;
  }
  return cases;
}

/** Definition slots of a category (for the matrix): id, slug, title, opposite id. */
function expandSlots(category) {
  const slots = [];
  let number = 1;
  for (const definition of category.cases) {
    if (definition.pair) {
      definition.pair.forEach((slug, index) => slots.push({
        caseId: `${pad(number + index)}-${slug}`,
        title: definition.titles[index],
        oppositeId: `${pad(number + 1 - index)}-${definition.pair[1 - index]}`,
      }));
      number += 2;
    } else {
      slots.push({ caseId: `${pad(number)}-${definition.change}`, title: definition.title });
      number += 1;
    }
  }
  return slots;
}

function writeYaml(file, document) {
  fs.writeFileSync(file, stringify(document, { lineWidth: 0 }), "utf8");
}

function resetSamples() {
  fs.rmSync(samplesRoot, { recursive: true, force: true });
  fs.mkdirSync(samplesRoot, { recursive: true });
}

function resetGeneratedSuiteFiles() {
  for (const file of fs.readdirSync(storiesDir)) {
    if (file.endsWith(".stories.tsx")) {
      fs.rmSync(path.join(storiesDir, file));
    }
  }
  // Only the ITs: the folder also holds the committed baselines (`__image_snapshots__/`).
  fs.mkdirSync(itDir, { recursive: true });
  for (const file of fs.readdirSync(itDir)) {
    if (file.endsWith(".it-test.ts")) {
      fs.rmSync(path.join(itDir, file));
    }
  }
}

const escapeCell = (text) => text.replaceAll("|", "\\|");

function writeCategoryCatalogue(category, cases) {
  const rows = cases.map(c => `| \`${c.caseId}\` | ${escapeCell(c.title)} | ${c.oppositeId ? `\`${c.oppositeId}\`` : "—"} |`);
  const text = `# OpenAPI diff fixtures — ${category.title}

Generated by \`node bin/generate-openapi-diffs-suite.mjs\` (packages/api-doc-viewer) from
\`bin/openapi-diffs-case-definitions.mjs\`. Do not edit by hand.

## Cases

| Case | Change | Opposite |
| --- | --- | --- |
${rows.join("\n")}

## Storybook and screenshot tests

Storybook: \`${SUITE_TITLE}/${category.title}\`, story \`Case_<case id>\`
(\`src/stories/openapi-diffs-suite/${category.folder}.stories.tsx\`). ITs:
\`src/it/openapi-diffs-suite/${category.folder}.it-test.ts\`, every case in display mode \`detailed\`
(\`simple\`: \`${SUITE_TITLE} (Display Mode = simple)\`).

## Regenerate

\`node bin/generate-openapi-diffs-suite.mjs\` in \`packages/api-doc-viewer/\`, then
\`pnpm run regenerate-screenshots-single-suite\`.
`;
  fs.writeFileSync(path.join(samplesRoot, category.folder, "README.md"), text, "utf8");
}

function writeRootCatalogue(expanded) {
  const rows = expanded.map(({ category, cases }) =>
    `| [\`${category.folder}/\`](${category.folder}/README.md) | ${category.title} | ${cases.length} | ${category.createBase().openapi} |`);
  const total = expanded.reduce((sum, { cases }) => sum + cases.length, 0);
  const text = `# OpenAPI diff fixtures

Before / after OpenAPI documents for \`OpenApiOperationDiffsViewer\`:
\`<category>/<case-id>/{before,after}.yaml\`. Every pair is derived from its category's minimal base
document and changes one thing. A base holds only what its category covers (\`POST /orders\`, or
\`POST /orders/{orderId}\` for path parameters; OAS 3.0 cases outside the response categories keep a
status-only \`200\`, because \`responses\` is required); anything else a case needs, its setup adds.
Stories merge the two whole documents with
\`mergeOpenApiDocuments\` (\`components\` kept) and show \`POST\` of the first \`paths\` key of the after
document. The case matrix (what is covered, opposites, fragments) is in
[docs/design/openapi/features/diffs-case-matrix.md](../../../docs/design/openapi/features/diffs-case-matrix.md).

Generated by \`node bin/generate-openapi-diffs-suite.mjs\` (packages/api-doc-viewer) from
\`bin/openapi-diffs-case-definitions.mjs\`; the whole folder is recreated. Do not edit by hand.

## Categories

| Category | Storybook | Cases | Base |
| --- | --- | ---: | --- |
${rows.join("\n")}

Total: ${total} cases.

## Storybook and screenshot tests

\`${SUITE_TITLE}/<Category>\` stories under \`packages/api-doc-viewer/src/stories/openapi-diffs-suite/\`
(display mode is a story control, default \`detailed\`); ITs
\`packages/api-doc-viewer/src/it/openapi-diffs-suite/<category>.it-test.ts\` capture every case in
\`detailed\` (\`simple\`: \`${SUITE_TITLE} (Display Mode = simple)\`). On load, the story selects the case's
\`switchTo\` options (the response code or security alternative the change is on), then a changed option in
every other selector.

## Regenerate

\`node bin/generate-openapi-diffs-suite.mjs\` in \`packages/api-doc-viewer/\`, then
\`pnpm run regenerate-screenshots-single-suite\`.
`;
  fs.writeFileSync(path.join(samplesRoot, "README.md"), text, "utf8");
}

function writeStories(category, cases) {
  const exports = cases.map(c => `export const ${toExportName(c.caseId)}: Story = createCaseStory("${c.caseId}"${c.switchTo.length > 0 ? `, [${c.switchTo.map(id => `"${id}"`).join(", ")}]` : ""});`);
  const text = `// Generated by bin/generate-openapi-diffs-suite.mjs - do not edit by hand.
import type { Meta, StoryObj } from "@storybook/react-vite";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import { createSampleById } from "../utils/sample-cases";
import { OPENAPI_DIFFS_SUITE_STORY_ARG_TYPES, OPENAPI_DIFFS_SUITE_STORY_DEFAULT_ARGS } from "../openapi-suite/openapi-story-args";
import { autoSwitchParameters, playAutoSwitch } from "../shared/auto-switch";
import { OpenApiDiffSampleStory } from "./OpenApiDiffSampleStory";

const beforeFiles = import.meta.glob(
  "../../../../samples/openapi-diffs/${category.folder}/*/before.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/openapi-diffs/${category.folder}/*/after.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleById = createSampleById(collectSampleCases(beforeFiles, afterFiles));

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "${SUITE_TITLE}/${category.title}",
  component: OpenApiDiffSampleStory,
  argTypes: OPENAPI_DIFFS_SUITE_STORY_ARG_TYPES,
  args: OPENAPI_DIFFS_SUITE_STORY_DEFAULT_ARGS,
  play: playAutoSwitch,
} satisfies Meta<typeof OpenApiDiffSampleStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = (caseId: string, switchTo: string[] = []): Story => {
  const sample = sampleById[caseId];
  if (!sample) {
    throw new Error(\`Sample case not found: \${caseId}\`);
  }
  return {
    name: caseId,
    args: { caseId, beforeYaml: sample.beforeYaml, afterYaml: sample.afterYaml },
    parameters: autoSwitchParameters(switchTo),
  };
};

${exports.join("\n")}
`;
  fs.writeFileSync(path.join(storiesDir, `${category.folder}.stories.tsx`), text, "utf8");
}

function writeTests(category, cases) {
  const metaId = toStorybookMetaId(`${SUITE_TITLE}/${category.title}`);
  const rows = cases.map(c => {
    const storyId = `${metaId}--${toStorybookStorySlug(toExportName(c.caseId))}`;
    return `  ['${c.caseId}', '${storyId}'],`;
  });
  const text = `// Generated by bin/generate-openapi-diffs-suite.mjs - do not edit by hand.
/**
 * Screenshot tests for ${SUITE_TITLE} - ${category.title}: every case in display mode
 * \`detailed\` (the default), after the story \`play\` selects the case's options.
 */
import { storyPage } from '../service/storybook-service'
import { waitForOpenApiOperationDiffsViewer } from '../service/viewer-waits'

/** [case id, story id]. */
const CASES: ReadonlyArray<readonly [string, string]> = [
${rows.join("\n")}
]

describe('${SUITE_TITLE} - ${category.title}', () => {
  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it.each(CASES)('%s', async (_caseId, storyId) => {
    const story = await storyPage(page, storyId)
    const component = await story.viewComponent()
    await waitForOpenApiOperationDiffsViewer(page)
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
`;
  fs.writeFileSync(path.join(itDir, `${category.folder}.it-test.ts`), text, "utf8");
}

function renderFragmentMatrix(categories) {
  const slots = expandSlots(categories[0]);
  const expandedIds = categories.map(category => new Set(expandCategory(category).map(c => c.caseId)));
  const header = `| Case | Change | Opposite | ${categories.map(c => c.title).join(" | ")} |`;
  const divider = `| --- | --- | --- | ${categories.map(() => ":---:").join(" | ")} |`;
  const rows = slots.map(slot => `| \`${slot.caseId}\` | ${escapeCell(slot.title)} | ${slot.oppositeId ? `\`${slot.oppositeId}\`` : "—"} | ${expandedIds.map(ids => (ids.has(slot.caseId) ? "✓" : "—")).join(" | ")} |`);
  const extras = categories.flatMap(category => expandCategory(category)
    .filter(c => !slots.some(slot => slot.caseId === c.caseId))
    .map(c => `| \`${c.caseId}\` | ${escapeCell(c.title)} (${category.title} only) | ${c.oppositeId ? `\`${c.oppositeId}\`` : "—"} | ${categories.map(other => (other === category ? "✓" : "—")).join(" | ")} |`));
  return [header, divider, ...rows, ...extras].join("\n");
}

function renderListMatrix(cases) {
  return ["| Case | Change | Opposite |", "| --- | --- | --- |",
    ...cases.map(c => `| \`${c.caseId}\` | ${escapeCell(c.title)} | ${c.oppositeId ? `\`${c.oppositeId}\`` : "—"} |`)].join("\n");
}

function writeMatrix(expanded) {
  const byFamily = (family) => expanded.filter(({ category }) => category.family === family).map(({ category }) => category);
  const single = expanded.filter(({ category }) => !category.family);
  const total = expanded.reduce((sum, { cases }) => sum + cases.length, 0);
  const block = [
    MATRIX_BEGIN,
    "",
    `${total} cases; ITs capture each in \`detailed\` (${total} screenshots). Display mode \`simple\` is covered by \`${SUITE_TITLE} (Display Mode = simple)\`.`,
    "",
    "### Parameters and headers",
    "",
    "One case list for every parameter-like fragment; the same id is the same change in each folder.",
    "`—` = the fragment cannot express the change.",
    "",
    renderFragmentMatrix(byFamily("parameters")),
    "",
    "### Bodies",
    "",
    "One case list for the request body and the body of the initially selected response (`200`).",
    "",
    renderFragmentMatrix(byFamily("bodies")),
    "",
    ...single.flatMap(({ category, cases }) => [`### ${category.title} (\`${category.folder}/\`)`, "", renderListMatrix(cases), ""]),
    MATRIX_END,
  ].join("\n");
  const current = fs.readFileSync(matrixDoc, "utf8");
  const begin = current.indexOf(MATRIX_BEGIN);
  const end = current.indexOf(MATRIX_END);
  if (begin < 0 || end < 0) {
    throw new Error(`Matrix markers not found in ${matrixDoc}`);
  }
  fs.writeFileSync(matrixDoc, current.slice(0, begin) + block + current.slice(end + MATRIX_END.length), "utf8");
}

function main() {
  const categories = collectCategories();
  const expanded = categories.map(category => ({ category, cases: expandCategory(category) }));

  resetSamples();
  resetGeneratedSuiteFiles();
  for (const { category, cases } of expanded) {
    for (const sampleCase of cases) {
      const dir = path.join(samplesRoot, category.folder, sampleCase.caseId);
      fs.mkdirSync(dir, { recursive: true });
      writeYaml(path.join(dir, "before.yaml"), sampleCase.before);
      writeYaml(path.join(dir, "after.yaml"), sampleCase.after);
    }
    writeCategoryCatalogue(category, cases);
    writeStories(category, cases);
    writeTests(category, cases);
  }
  writeRootCatalogue(expanded);
  writeMatrix(expanded);
  const total = expanded.reduce((sum, { cases }) => sum + cases.length, 0);
  console.log(`OpenAPI diffs suite: ${expanded.length} categories, ${total} cases.`);
}

main();
