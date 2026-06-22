import type { Meta } from "@storybook/react";
import {
  JsoPropertySamplesStory,
  createCaseStory,
  type JsoPropertySamplesStoryObj,
} from "./property-samples-common";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSO Diffs Suite/arrayArrayItems",
  component: JsoPropertySamplesStory,
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_11_1_arrayArrayItems_array_items_arrays_to_string: Story = createCaseStory("11.1-arrayArrayItems-array-items-arrays-to-string");
export const Case_11_2_arrayArrayItems_array_items_arrays_to_number: Story = createCaseStory("11.2-arrayArrayItems-array-items-arrays-to-number");
export const Case_11_3_arrayArrayItems_array_items_arrays_to_boolean: Story = createCaseStory("11.3-arrayArrayItems-array-items-arrays-to-boolean");
export const Case_11_4_arrayArrayItems_array_items_arrays_to_null: Story = createCaseStory("11.4-arrayArrayItems-array-items-arrays-to-null");
export const Case_11_5_arrayArrayItems_array_items_arrays_to_object_primitive_props: Story = createCaseStory("11.5-arrayArrayItems-array-items-arrays-to-object-primitive-props");
export const Case_11_6_arrayArrayItems_array_items_arrays_to_object_props_objects: Story = createCaseStory("11.6-arrayArrayItems-array-items-arrays-to-object-props-objects");
export const Case_11_7_arrayArrayItems_array_items_arrays_to_object_props_arrays: Story = createCaseStory("11.7-arrayArrayItems-array-items-arrays-to-object-props-arrays");
export const Case_11_8_arrayArrayItems_array_items_arrays_to_object_all_prop_types: Story = createCaseStory("11.8-arrayArrayItems-array-items-arrays-to-object-all-prop-types");
export const Case_11_9_arrayArrayItems_array_items_arrays_to_array_primitives: Story = createCaseStory("11.9-arrayArrayItems-array-items-arrays-to-array-primitives");
export const Case_11_10_arrayArrayItems_array_items_arrays_to_array_objects: Story = createCaseStory("11.10-arrayArrayItems-array-items-arrays-to-array-objects");
export const Case_11_11_arrayArrayItems_array_items_arrays_to_array_all_item_types: Story = createCaseStory("11.11-arrayArrayItems-array-items-arrays-to-array-all-item-types");
