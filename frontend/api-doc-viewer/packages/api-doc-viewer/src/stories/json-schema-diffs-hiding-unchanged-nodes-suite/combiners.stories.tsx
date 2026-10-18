import type { Meta, StoryObj } from "@storybook/react-vite";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import {
  JsonSchemaDiffSamplesStory,
  createJsonSchemaDiffCaseStoryFactoryWithChangedVariant,
  jsonSchemaDiffSampleReadonlyArgTypes,
} from "../json-schema-diffs-suite/json-schema-diffs-utils";
import { createSampleById } from "../utils/sample-cases";

// This suite exercises the hiding feature itself, so stories open with unchanged nodes collapsed.
const HIDE_UNCHANGED_NODES_BY_DEFAULT = true;

const beforeFiles = import.meta.glob(
  "../../../../samples/json-schema-diffs/hiding-unchanged-rows/combiners/*/before.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/json-schema-diffs/hiding-unchanged-rows/combiners/*/after.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Hiding Unchanged Nodes)/Combiners",
  component: JsonSchemaDiffSamplesStory,
  argTypes: jsonSchemaDiffSampleReadonlyArgTypes,
} satisfies Meta<typeof JsonSchemaDiffSamplesStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = createJsonSchemaDiffCaseStoryFactoryWithChangedVariant(
  JsonSchemaDiffSamplesStory,
  sampleById,
  HIDE_UNCHANGED_NODES_BY_DEFAULT,
);

export const Case_3_1_oneof_variant_added: Story = createCaseStory("3.1-oneof-variant-added");
export const Case_4_1_oneof_variant_content_changed: Story = createCaseStory(
  "4.1-oneof-variant-content-changed",
);
export const Case_4_2_oneof_variant_description_only_changed: Story = createCaseStory(
  "4.2-oneof-variant-description-only-changed",
);
export const Case_5_1_oneof_three_variants_unchanged: Story = createCaseStory(
  "5.1-oneof-three-variants-unchanged",
);
export const Case_5_2_root_description_changed_oneof_unchanged: Story = createCaseStory(
  "5.2-root-description-changed-oneof-unchanged",
);
