import type { Meta } from "@storybook/react";
import {
  JsoPropertySamplesStory,
  createCaseStory,
  jsoPropertySamplesStoryMetaBase,
  type JsoPropertySamplesStoryObj,
} from "./property-samples-common";

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsoPropertySamplesStoryMetaBase,
  title: "JSO Diffs Suite/nullValue",
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_4_1_nullValue_null_to_string: Story = createCaseStory("4.1-nullValue-null-to-string");
export const Case_4_2_nullValue_null_to_number: Story = createCaseStory("4.2-nullValue-null-to-number");
export const Case_4_3_nullValue_null_to_boolean: Story = createCaseStory("4.3-nullValue-null-to-boolean");
export const Case_4_4_nullValue_null_to_object_primitive_props: Story = createCaseStory("4.4-nullValue-null-to-object-primitive-props");
export const Case_4_5_nullValue_null_to_object_props_objects: Story = createCaseStory("4.5-nullValue-null-to-object-props-objects");
export const Case_4_6_nullValue_null_to_object_props_arrays: Story = createCaseStory("4.6-nullValue-null-to-object-props-arrays");
export const Case_4_7_nullValue_null_to_object_all_prop_types: Story = createCaseStory("4.7-nullValue-null-to-object-all-prop-types");
export const Case_4_8_nullValue_null_to_array_primitives: Story = createCaseStory("4.8-nullValue-null-to-array-primitives");
export const Case_4_9_nullValue_null_to_array_objects: Story = createCaseStory("4.9-nullValue-null-to-array-objects");
export const Case_4_10_nullValue_null_to_array_items_arrays: Story = createCaseStory("4.10-nullValue-null-to-array-items-arrays");
export const Case_4_11_nullValue_null_to_array_all_item_types: Story = createCaseStory("4.11-nullValue-null-to-array-all-item-types");
