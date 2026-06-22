import type { Meta } from "@storybook/react";
import {
  JsoPropertySamplesStory,
  createCaseStory,
  type JsoPropertySamplesStoryObj,
} from "./property-samples-common";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSO Diffs Suite/objectPrimitiveProps",
  component: JsoPropertySamplesStory,
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_5_1_objectPrimitiveProps_object_primitive_props_to_string: Story = createCaseStory("5.1-objectPrimitiveProps-object-primitive-props-to-string");
export const Case_5_2_objectPrimitiveProps_object_primitive_props_to_number: Story = createCaseStory("5.2-objectPrimitiveProps-object-primitive-props-to-number");
export const Case_5_3_objectPrimitiveProps_object_primitive_props_to_boolean: Story = createCaseStory("5.3-objectPrimitiveProps-object-primitive-props-to-boolean");
export const Case_5_4_objectPrimitiveProps_object_primitive_props_to_null: Story = createCaseStory("5.4-objectPrimitiveProps-object-primitive-props-to-null");
export const Case_5_5_objectPrimitiveProps_object_primitive_props_to_object_props_objects: Story = createCaseStory("5.5-objectPrimitiveProps-object-primitive-props-to-object-props-objects");
export const Case_5_6_objectPrimitiveProps_object_primitive_props_to_object_props_arrays: Story = createCaseStory("5.6-objectPrimitiveProps-object-primitive-props-to-object-props-arrays");
export const Case_5_7_objectPrimitiveProps_object_primitive_props_to_object_all_prop_types: Story = createCaseStory("5.7-objectPrimitiveProps-object-primitive-props-to-object-all-prop-types");
export const Case_5_8_objectPrimitiveProps_object_primitive_props_to_array_primitives: Story = createCaseStory("5.8-objectPrimitiveProps-object-primitive-props-to-array-primitives");
export const Case_5_9_objectPrimitiveProps_object_primitive_props_to_array_objects: Story = createCaseStory("5.9-objectPrimitiveProps-object-primitive-props-to-array-objects");
export const Case_5_10_objectPrimitiveProps_object_primitive_props_to_array_items_arrays: Story = createCaseStory("5.10-objectPrimitiveProps-object-primitive-props-to-array-items-arrays");
export const Case_5_11_objectPrimitiveProps_object_primitive_props_to_array_all_item_types: Story = createCaseStory("5.11-objectPrimitiveProps-object-primitive-props-to-array-all-item-types");
