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
  title: "JSO Diffs Suite/objectAllPropTypes",
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_8_1_objectAllPropTypes_object_all_prop_types_to_string: Story = createCaseStory("8.1-objectAllPropTypes-object-all-prop-types-to-string");
export const Case_8_2_objectAllPropTypes_object_all_prop_types_to_number: Story = createCaseStory("8.2-objectAllPropTypes-object-all-prop-types-to-number");
export const Case_8_3_objectAllPropTypes_object_all_prop_types_to_boolean: Story = createCaseStory("8.3-objectAllPropTypes-object-all-prop-types-to-boolean");
export const Case_8_4_objectAllPropTypes_object_all_prop_types_to_null: Story = createCaseStory("8.4-objectAllPropTypes-object-all-prop-types-to-null");
export const Case_8_5_objectAllPropTypes_object_all_prop_types_to_object_primitive_props: Story = createCaseStory("8.5-objectAllPropTypes-object-all-prop-types-to-object-primitive-props");
export const Case_8_6_objectAllPropTypes_object_all_prop_types_to_object_props_objects: Story = createCaseStory("8.6-objectAllPropTypes-object-all-prop-types-to-object-props-objects");
export const Case_8_7_objectAllPropTypes_object_all_prop_types_to_object_props_arrays: Story = createCaseStory("8.7-objectAllPropTypes-object-all-prop-types-to-object-props-arrays");
export const Case_8_8_objectAllPropTypes_object_all_prop_types_to_array_primitives: Story = createCaseStory("8.8-objectAllPropTypes-object-all-prop-types-to-array-primitives");
export const Case_8_9_objectAllPropTypes_object_all_prop_types_to_array_objects: Story = createCaseStory("8.9-objectAllPropTypes-object-all-prop-types-to-array-objects");
export const Case_8_10_objectAllPropTypes_object_all_prop_types_to_array_items_arrays: Story = createCaseStory("8.10-objectAllPropTypes-object-all-prop-types-to-array-items-arrays");
export const Case_8_11_objectAllPropTypes_object_all_prop_types_to_array_all_item_types: Story = createCaseStory("8.11-objectAllPropTypes-object-all-prop-types-to-array-all-item-types");
