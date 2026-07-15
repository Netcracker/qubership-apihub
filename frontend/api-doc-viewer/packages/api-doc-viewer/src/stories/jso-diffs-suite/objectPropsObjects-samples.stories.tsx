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
  title: "JSO Diffs Suite/objectPropsObjects",
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_6_1_objectPropsObjects_object_props_objects_to_string: Story = createCaseStory("6.1-objectPropsObjects-object-props-objects-to-string");
export const Case_6_2_objectPropsObjects_object_props_objects_to_number: Story = createCaseStory("6.2-objectPropsObjects-object-props-objects-to-number");
export const Case_6_3_objectPropsObjects_object_props_objects_to_boolean: Story = createCaseStory("6.3-objectPropsObjects-object-props-objects-to-boolean");
export const Case_6_4_objectPropsObjects_object_props_objects_to_null: Story = createCaseStory("6.4-objectPropsObjects-object-props-objects-to-null");
export const Case_6_5_objectPropsObjects_object_props_objects_to_object_primitive_props: Story = createCaseStory("6.5-objectPropsObjects-object-props-objects-to-object-primitive-props");
export const Case_6_6_objectPropsObjects_object_props_objects_to_object_props_arrays: Story = createCaseStory("6.6-objectPropsObjects-object-props-objects-to-object-props-arrays");
export const Case_6_7_objectPropsObjects_object_props_objects_to_object_all_prop_types: Story = createCaseStory("6.7-objectPropsObjects-object-props-objects-to-object-all-prop-types");
export const Case_6_8_objectPropsObjects_object_props_objects_to_array_primitives: Story = createCaseStory("6.8-objectPropsObjects-object-props-objects-to-array-primitives");
export const Case_6_9_objectPropsObjects_object_props_objects_to_array_objects: Story = createCaseStory("6.9-objectPropsObjects-object-props-objects-to-array-objects");
export const Case_6_10_objectPropsObjects_object_props_objects_to_array_items_arrays: Story = createCaseStory("6.10-objectPropsObjects-object-props-objects-to-array-items-arrays");
export const Case_6_11_objectPropsObjects_object_props_objects_to_array_all_item_types: Story = createCaseStory("6.11-objectPropsObjects-object-props-objects-to-array-all-item-types");
