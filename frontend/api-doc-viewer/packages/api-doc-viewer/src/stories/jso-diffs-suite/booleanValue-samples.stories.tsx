import type { Meta } from "@storybook/react";
import {
  JsoPropertySamplesStory,
  createCaseStory,
  type JsoPropertySamplesStoryObj,
} from "./property-samples-common";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSO Diffs Suite/booleanValue",
  component: JsoPropertySamplesStory,
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_3_1_booleanValue_boolean_to_string: Story = createCaseStory("3.1-booleanValue-boolean-to-string");
export const Case_3_2_booleanValue_boolean_to_number: Story = createCaseStory("3.2-booleanValue-boolean-to-number");
export const Case_3_3_booleanValue_boolean_to_null: Story = createCaseStory("3.3-booleanValue-boolean-to-null");
export const Case_3_4_booleanValue_boolean_to_object_primitive_props: Story = createCaseStory("3.4-booleanValue-boolean-to-object-primitive-props");
export const Case_3_5_booleanValue_boolean_to_object_props_objects: Story = createCaseStory("3.5-booleanValue-boolean-to-object-props-objects");
export const Case_3_6_booleanValue_boolean_to_object_props_arrays: Story = createCaseStory("3.6-booleanValue-boolean-to-object-props-arrays");
export const Case_3_7_booleanValue_boolean_to_object_all_prop_types: Story = createCaseStory("3.7-booleanValue-boolean-to-object-all-prop-types");
export const Case_3_8_booleanValue_boolean_to_array_primitives: Story = createCaseStory("3.8-booleanValue-boolean-to-array-primitives");
export const Case_3_9_booleanValue_boolean_to_array_objects: Story = createCaseStory("3.9-booleanValue-boolean-to-array-objects");
export const Case_3_10_booleanValue_boolean_to_array_items_arrays: Story = createCaseStory("3.10-booleanValue-boolean-to-array-items-arrays");
export const Case_3_11_booleanValue_boolean_to_array_all_item_types: Story = createCaseStory("3.11-booleanValue-boolean-to-array-all-item-types");
