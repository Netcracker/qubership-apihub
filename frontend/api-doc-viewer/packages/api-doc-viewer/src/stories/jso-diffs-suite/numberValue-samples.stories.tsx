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
  title: "JSO Diffs Suite/numberValue",
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_2_1_numberValue_number_to_string: Story = createCaseStory("2.1-numberValue-number-to-string");
export const Case_2_2_numberValue_number_to_boolean: Story = createCaseStory("2.2-numberValue-number-to-boolean");
export const Case_2_3_numberValue_number_to_null: Story = createCaseStory("2.3-numberValue-number-to-null");
export const Case_2_4_numberValue_number_to_object_primitive_props: Story = createCaseStory("2.4-numberValue-number-to-object-primitive-props");
export const Case_2_5_numberValue_number_to_object_props_objects: Story = createCaseStory("2.5-numberValue-number-to-object-props-objects");
export const Case_2_6_numberValue_number_to_object_props_arrays: Story = createCaseStory("2.6-numberValue-number-to-object-props-arrays");
export const Case_2_7_numberValue_number_to_object_all_prop_types: Story = createCaseStory("2.7-numberValue-number-to-object-all-prop-types");
export const Case_2_8_numberValue_number_to_array_primitives: Story = createCaseStory("2.8-numberValue-number-to-array-primitives");
export const Case_2_9_numberValue_number_to_array_objects: Story = createCaseStory("2.9-numberValue-number-to-array-objects");
export const Case_2_10_numberValue_number_to_array_items_arrays: Story = createCaseStory("2.10-numberValue-number-to-array-items-arrays");
export const Case_2_11_numberValue_number_to_array_all_item_types: Story = createCaseStory("2.11-numberValue-number-to-array-all-item-types");
