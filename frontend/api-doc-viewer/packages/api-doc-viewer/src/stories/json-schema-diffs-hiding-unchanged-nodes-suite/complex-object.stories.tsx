import type { Meta, StoryObj } from "@storybook/react-vite";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import {
  JsonSchemaDiffSamplesStory,
  createJsonSchemaDiffCaseStoryFactory,
  jsonSchemaDiffSampleReadonlyArgTypes,
} from "../json-schema-diffs-suite/json-schema-diffs-utils";
import { createSampleById } from "../utils/sample-cases";

// This suite exercises the hiding feature itself, so stories open with unchanged nodes collapsed.
const HIDE_UNCHANGED_NODES_BY_DEFAULT = true;

const beforeFiles = import.meta.glob(
  "../../../../samples/json-schema-diffs/hiding-unchanged-rows/complex-object/*/before.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/json-schema-diffs/hiding-unchanged-rows/complex-object/*/after.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Hiding Unchanged Nodes)/Complex Object",
  component: JsonSchemaDiffSamplesStory,
  argTypes: jsonSchemaDiffSampleReadonlyArgTypes,
} satisfies Meta<typeof JsonSchemaDiffSamplesStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = createJsonSchemaDiffCaseStoryFactory(
  JsonSchemaDiffSamplesStory,
  sampleById,
  HIDE_UNCHANGED_NODES_BY_DEFAULT,
);

export const Case_2_1_root_description_changed: Story = createCaseStory("2.1-root-description-changed");
export const Case_2_2_primitive_props_added: Story = createCaseStory("2.2-primitive-props-added");
export const Case_2_3_nested_object_props_added: Story = createCaseStory("2.3-nested-object-props-added");
export const Case_2_4_primitive_added_nested_removed: Story = createCaseStory(
  "2.4-primitive-added-nested-removed",
);
export const Case_2_5_nested_prop_added_and_removed: Story = createCaseStory(
  "2.5-nested-prop-added-and-removed",
);
export const Case_2_6_nested_prop_added_object_removed: Story = createCaseStory(
  "2.6-nested-prop-added-object-removed",
);
export const Case_2_7_object_added_nested_prop_removed: Story = createCaseStory(
  "2.7-object-added-nested-prop-removed",
);
export const Case_2_8_nested_property_metadata_and_constraints_changed: Story = createCaseStory(
  "2.8-nested-property-metadata-and-constraints-changed",
);
export const Case_2_9_second_property_type_string_to_number: Story = createCaseStory(
  "2.9-second-property-type-string-to-number",
);
