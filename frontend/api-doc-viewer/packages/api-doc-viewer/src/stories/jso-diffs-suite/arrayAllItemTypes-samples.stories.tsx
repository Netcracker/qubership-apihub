import type { Meta } from "@storybook/react";
import {
  JsoPropertySamplesStory,
  createCaseStory,
  type JsoPropertySamplesStoryObj,
} from "./property-samples-common";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSO Diffs Suite/arrayAllItemTypes",
  component: JsoPropertySamplesStory,
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_12_1_arrayAllItemTypes_array_all_item_types_to_string: Story = createCaseStory("12.1-arrayAllItemTypes-array-all-item-types-to-string");
export const Case_12_2_arrayAllItemTypes_array_all_item_types_to_number: Story = createCaseStory("12.2-arrayAllItemTypes-array-all-item-types-to-number");
export const Case_12_3_arrayAllItemTypes_array_all_item_types_to_boolean: Story = createCaseStory("12.3-arrayAllItemTypes-array-all-item-types-to-boolean");
export const Case_12_4_arrayAllItemTypes_array_all_item_types_to_null: Story = createCaseStory("12.4-arrayAllItemTypes-array-all-item-types-to-null");
export const Case_12_5_arrayAllItemTypes_array_all_item_types_to_object_primitive_props: Story = createCaseStory("12.5-arrayAllItemTypes-array-all-item-types-to-object-primitive-props");
export const Case_12_6_arrayAllItemTypes_array_all_item_types_to_object_props_objects: Story = createCaseStory("12.6-arrayAllItemTypes-array-all-item-types-to-object-props-objects");
export const Case_12_7_arrayAllItemTypes_array_all_item_types_to_object_props_arrays: Story = createCaseStory("12.7-arrayAllItemTypes-array-all-item-types-to-object-props-arrays");
export const Case_12_8_arrayAllItemTypes_array_all_item_types_to_object_all_prop_types: Story = createCaseStory("12.8-arrayAllItemTypes-array-all-item-types-to-object-all-prop-types");
export const Case_12_9_arrayAllItemTypes_array_all_item_types_to_array_primitives: Story = createCaseStory("12.9-arrayAllItemTypes-array-all-item-types-to-array-primitives");
export const Case_12_10_arrayAllItemTypes_array_all_item_types_to_array_objects: Story = createCaseStory("12.10-arrayAllItemTypes-array-all-item-types-to-array-objects");
export const Case_12_11_arrayAllItemTypes_array_all_item_types_to_array_items_arrays: Story = createCaseStory("12.11-arrayAllItemTypes-array-all-item-types-to-array-items-arrays");
