import type { Meta } from "@storybook/react";
import {
  JsoPropertySamplesStory,
  createCaseStory,
  type JsoPropertySamplesStoryObj,
} from "./property-samples-common";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSO Diffs Suite/stringValue",
  component: JsoPropertySamplesStory,
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_1_1_stringValue_string_to_number: Story = createCaseStory("1.1-stringValue-string-to-number");
export const Case_1_2_stringValue_string_to_boolean: Story = createCaseStory("1.2-stringValue-string-to-boolean");
export const Case_1_3_stringValue_string_to_null: Story = createCaseStory("1.3-stringValue-string-to-null");
export const Case_1_4_stringValue_string_to_object_primitive_props: Story = createCaseStory("1.4-stringValue-string-to-object-primitive-props");
export const Case_1_5_stringValue_string_to_object_props_objects: Story = createCaseStory("1.5-stringValue-string-to-object-props-objects");
export const Case_1_6_stringValue_string_to_object_props_arrays: Story = createCaseStory("1.6-stringValue-string-to-object-props-arrays");
export const Case_1_7_stringValue_string_to_object_all_prop_types: Story = createCaseStory("1.7-stringValue-string-to-object-all-prop-types");
export const Case_1_8_stringValue_string_to_array_primitives: Story = createCaseStory("1.8-stringValue-string-to-array-primitives");
export const Case_1_9_stringValue_string_to_array_objects: Story = createCaseStory("1.9-stringValue-string-to-array-objects");
export const Case_1_10_stringValue_string_to_array_items_arrays: Story = createCaseStory("1.10-stringValue-string-to-array-items-arrays");
export const Case_1_11_stringValue_string_to_array_all_item_types: Story = createCaseStory("1.11-stringValue-string-to-array-all-item-types");
