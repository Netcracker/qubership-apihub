import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  buildOpenApiArrowButtonsDocuments,
  findOpenApiArrowButtonsCase,
  openApiDiffsArrowButtonsCases,
} from "@netcracker/qubership-apihub-samples";
import { OPENAPI_DIFFS_STORY_ARG_TYPES, OPENAPI_DIFFS_STORY_DEFAULT_ARGS } from "../openapi-suite/openapi-story-args";
import { OpenApiDiffSampleStory } from "../openapi-diffs-suite/OpenApiDiffSampleStory";

/**
 * Security Toolbar strip with diffs: one option → every option (the changed side overflows) and back (the origin
 * side overflows); each side scrolls on its own. Cases are built in
 * `packages/samples/src/openapi-arrow-buttons.ts`, not stored as YAML.
 * Design: docs/design/shared/features/arrow-scroll-strip.md
 */
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "OpenAPI Operation Diffs Suite (Arrow Buttons)/Security Toolbar",
  component: OpenApiDiffSampleStory,
  argTypes: OPENAPI_DIFFS_STORY_ARG_TYPES,
  args: OPENAPI_DIFFS_STORY_DEFAULT_ARGS,
} satisfies Meta<typeof OpenApiDiffSampleStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = (caseId: string): Story => {
  const testCase = findOpenApiArrowButtonsCase(openApiDiffsArrowButtonsCases, "security-toolbar", caseId);
  const { before, after } = buildOpenApiArrowButtonsDocuments(testCase);
  // `parseYamlSource` reads JSON as well.
  return {
    name: `${caseId}: ${testCase.title}`,
    args: { caseId, beforeYaml: JSON.stringify(before), afterYaml: JSON.stringify(after) },
  };
};

export const Case_01_single_to_every_option: Story = createCaseStory("01-single-to-every-option");
export const Case_02_every_to_single_option: Story = createCaseStory("02-every-to-single-option");
