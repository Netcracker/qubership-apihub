import type { Meta } from "@storybook/react";
import {
  JsoPropertySamplesStory,
  createCaseStory,
  type JsoPropertySamplesStoryObj,
} from "./property-samples-common";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSO Diffs Suite/arrayObjects",
  component: JsoPropertySamplesStory,
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_10_1_arrayObjects_array_objects_to_string: Story = createCaseStory("10.1-arrayObjects-array-objects-to-string");
export const Case_10_2_arrayObjects_array_objects_to_number: Story = createCaseStory("10.2-arrayObjects-array-objects-to-number");
export const Case_10_3_arrayObjects_array_objects_to_boolean: Story = createCaseStory("10.3-arrayObjects-array-objects-to-boolean");
export const Case_10_4_arrayObjects_array_objects_to_null: Story = createCaseStory("10.4-arrayObjects-array-objects-to-null");
export const Case_10_5_arrayObjects_array_objects_to_object_primitive_props: Story = createCaseStory("10.5-arrayObjects-array-objects-to-object-primitive-props");
export const Case_10_6_arrayObjects_array_objects_to_object_props_objects: Story = createCaseStory("10.6-arrayObjects-array-objects-to-object-props-objects");
export const Case_10_7_arrayObjects_array_objects_to_object_props_arrays: Story = createCaseStory("10.7-arrayObjects-array-objects-to-object-props-arrays");
export const Case_10_8_arrayObjects_array_objects_to_object_all_prop_types: Story = createCaseStory("10.8-arrayObjects-array-objects-to-object-all-prop-types");
export const Case_10_9_arrayObjects_array_objects_to_array_primitives: Story = createCaseStory("10.9-arrayObjects-array-objects-to-array-primitives");
export const Case_10_10_arrayObjects_array_objects_to_array_items_arrays: Story = createCaseStory("10.10-arrayObjects-array-objects-to-array-items-arrays");
export const Case_10_11_arrayObjects_array_objects_to_array_all_item_types: Story = createCaseStory("10.11-arrayObjects-array-objects-to-array-all-item-types");
