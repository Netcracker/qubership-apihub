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
  title: "JSO Diffs Suite/arrayPrimitives",
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_9_1_arrayPrimitives_array_primitives_to_string: Story = createCaseStory("9.1-arrayPrimitives-array-primitives-to-string");
export const Case_9_2_arrayPrimitives_array_primitives_to_number: Story = createCaseStory("9.2-arrayPrimitives-array-primitives-to-number");
export const Case_9_3_arrayPrimitives_array_primitives_to_boolean: Story = createCaseStory("9.3-arrayPrimitives-array-primitives-to-boolean");
export const Case_9_4_arrayPrimitives_array_primitives_to_null: Story = createCaseStory("9.4-arrayPrimitives-array-primitives-to-null");
export const Case_9_5_arrayPrimitives_array_primitives_to_object_primitive_props: Story = createCaseStory("9.5-arrayPrimitives-array-primitives-to-object-primitive-props");
export const Case_9_6_arrayPrimitives_array_primitives_to_object_props_objects: Story = createCaseStory("9.6-arrayPrimitives-array-primitives-to-object-props-objects");
export const Case_9_7_arrayPrimitives_array_primitives_to_object_props_arrays: Story = createCaseStory("9.7-arrayPrimitives-array-primitives-to-object-props-arrays");
export const Case_9_8_arrayPrimitives_array_primitives_to_object_all_prop_types: Story = createCaseStory("9.8-arrayPrimitives-array-primitives-to-object-all-prop-types");
export const Case_9_9_arrayPrimitives_array_primitives_to_array_objects: Story = createCaseStory("9.9-arrayPrimitives-array-primitives-to-array-objects");
export const Case_9_10_arrayPrimitives_array_primitives_to_array_items_arrays: Story = createCaseStory("9.10-arrayPrimitives-array-primitives-to-array-items-arrays");
export const Case_9_11_arrayPrimitives_array_primitives_to_array_all_item_types: Story = createCaseStory("9.11-arrayPrimitives-array-primitives-to-array-all-item-types");
