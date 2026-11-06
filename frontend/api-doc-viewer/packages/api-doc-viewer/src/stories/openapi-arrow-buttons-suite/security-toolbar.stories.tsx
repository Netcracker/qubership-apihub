import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  buildOpenApiArrowButtonsDocument,
  findOpenApiArrowButtonsCase,
  OPENAPI_ARROW_BUTTONS_OPERATION,
  openApiArrowButtonsCases,
} from "@netcracker/qubership-apihub-samples";
import { OPENAPI_STORY_ARG_TYPES, OPENAPI_STORY_DEFAULT_ARGS } from "../openapi-suite/openapi-story-args";
import { OpenApiSampleStory } from "../openapi-suite/OpenApiSampleStory";

/**
 * Security Toolbar strip: one option (both arrows disabled) and every option (the strip overflows; the ITs click
 * the right arrow to the median option and to the right edge). Cases are built in
 * `packages/samples/src/openapi-arrow-buttons.ts`, not stored as YAML.
 * Design: docs/design/shared/features/arrow-scroll-strip.md
 */
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "OpenAPI Operation Suite (Arrow Buttons)/Security Toolbar",
  component: OpenApiSampleStory,
  argTypes: OPENAPI_STORY_ARG_TYPES,
  args: OPENAPI_STORY_DEFAULT_ARGS,
} satisfies Meta<typeof OpenApiSampleStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = (caseId: string): Story => {
  const testCase = findOpenApiArrowButtonsCase(openApiArrowButtonsCases, "security-toolbar", caseId);
  // `parseYamlSource` reads JSON as well.
  return {
    name: `${caseId}: ${testCase.title}`,
    args: {
      caseId,
      sampleYaml: JSON.stringify(buildOpenApiArrowButtonsDocument(testCase.toolbar, testCase.lineup)),
      ...OPENAPI_ARROW_BUTTONS_OPERATION,
    },
  };
};

export const Case_01_single_option: Story = createCaseStory("01-single-option");
export const Case_02_every_option: Story = createCaseStory("02-every-option");
