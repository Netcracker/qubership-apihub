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
  title: "JSO Diffs Suite/objectPropsArrays",
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_7_1_objectPropsArrays_object_props_arrays_to_string: Story = createCaseStory("7.1-objectPropsArrays-object-props-arrays-to-string");
export const Case_7_2_objectPropsArrays_object_props_arrays_to_number: Story = createCaseStory("7.2-objectPropsArrays-object-props-arrays-to-number");
export const Case_7_3_objectPropsArrays_object_props_arrays_to_boolean: Story = createCaseStory("7.3-objectPropsArrays-object-props-arrays-to-boolean");
export const Case_7_4_objectPropsArrays_object_props_arrays_to_null: Story = createCaseStory("7.4-objectPropsArrays-object-props-arrays-to-null");
export const Case_7_5_objectPropsArrays_object_props_arrays_to_object_primitive_props: Story = createCaseStory("7.5-objectPropsArrays-object-props-arrays-to-object-primitive-props");
export const Case_7_6_objectPropsArrays_object_props_arrays_to_object_props_objects: Story = createCaseStory("7.6-objectPropsArrays-object-props-arrays-to-object-props-objects");
export const Case_7_7_objectPropsArrays_object_props_arrays_to_object_all_prop_types: Story = createCaseStory("7.7-objectPropsArrays-object-props-arrays-to-object-all-prop-types");
export const Case_7_8_objectPropsArrays_object_props_arrays_to_array_primitives: Story = createCaseStory("7.8-objectPropsArrays-object-props-arrays-to-array-primitives");
export const Case_7_9_objectPropsArrays_object_props_arrays_to_array_objects: Story = createCaseStory("7.9-objectPropsArrays-object-props-arrays-to-array-objects");
export const Case_7_10_objectPropsArrays_object_props_arrays_to_array_items_arrays: Story = createCaseStory("7.10-objectPropsArrays-object-props-arrays-to-array-items-arrays");
export const Case_7_11_objectPropsArrays_object_props_arrays_to_array_all_item_types: Story = createCaseStory("7.11-objectPropsArrays-object-props-arrays-to-array-all-item-types");
