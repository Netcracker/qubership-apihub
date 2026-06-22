import type { Meta } from "@storybook/react";
import {
  JsoPropertySamplesStory,
  createCaseStory,
  type JsoPropertySamplesStoryObj,
} from "./property-samples-common";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSO Diffs Suite/stringJsonSchema",
  component: JsoPropertySamplesStory,
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_13_1_stringJsonSchema_add_primitive_json_schema: Story = createCaseStory("13.1-stringJsonSchema-add-primitive-json-schema");
export const Case_13_3_stringJsonSchema_remove_primitive_json_schema: Story = createCaseStory("13.3-stringJsonSchema-remove-primitive-json-schema");
export const Case_14_1_stringJsonSchema_description_changed: Story = createCaseStory("14.1-stringJsonSchema-description-changed");
export const Case_14_2_stringJsonSchema_enum_changed: Story = createCaseStory("14.2-stringJsonSchema-enum-changed");
export const Case_14_3_stringJsonSchema_minLength_changed: Story = createCaseStory("14.3-stringJsonSchema-minLength-changed");
export const Case_14_4_stringJsonSchema_maxLength_changed: Story = createCaseStory("14.4-stringJsonSchema-maxLength-changed");
export const Case_14_5_stringJsonSchema_pattern_changed: Story = createCaseStory("14.5-stringJsonSchema-pattern-changed");
export const Case_14_6_stringJsonSchema_format_changed: Story = createCaseStory("14.6-stringJsonSchema-format-changed");
export const Case_14_7_stringJsonSchema_default_changed: Story = createCaseStory("14.7-stringJsonSchema-default-changed");
export const Case_14_8_stringJsonSchema_examples_changed: Story = createCaseStory("14.8-stringJsonSchema-examples-changed");
