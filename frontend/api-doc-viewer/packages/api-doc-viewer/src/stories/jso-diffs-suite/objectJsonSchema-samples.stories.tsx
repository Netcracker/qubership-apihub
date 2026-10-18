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
  title: "JSO Diffs Suite/objectJsonSchema",
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = JsoPropertySamplesStoryObj;

export const Case_13_2_objectJsonSchema_add_complex_json_schema: Story = createCaseStory("13.2-objectJsonSchema-add-complex-json-schema");
export const Case_13_4_objectJsonSchema_remove_complex_json_schema: Story = createCaseStory("13.4-objectJsonSchema-remove-complex-json-schema");
export const Case_15_1_objectJsonSchema_description_changed: Story = createCaseStory("15.1-objectJsonSchema-description-changed");
export const Case_15_2_objectJsonSchema_title_changed: Story = createCaseStory("15.2-objectJsonSchema-title-changed");
export const Case_15_3_objectJsonSchema_title_added: Story = createCaseStory("15.3-objectJsonSchema-title-added");
export const Case_15_4_objectJsonSchema_title_removed: Story = createCaseStory("15.4-objectJsonSchema-title-removed");
export const Case_15_5_objectJsonSchema_examples_changed: Story = createCaseStory("15.5-objectJsonSchema-examples-changed");
export const Case_15_6_objectJsonSchema_property_added: Story = createCaseStory("15.6-objectJsonSchema-property-added");
export const Case_15_7_objectJsonSchema_property_removed: Story = createCaseStory("15.7-objectJsonSchema-property-removed");
export const Case_15_8_objectJsonSchema_required_changed: Story = createCaseStory("15.8-objectJsonSchema-required-changed");
