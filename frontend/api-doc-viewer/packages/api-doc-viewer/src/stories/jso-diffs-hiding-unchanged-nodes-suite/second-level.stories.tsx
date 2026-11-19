import type { Meta, StoryObj } from "@storybook/react-vite";
import { createJsoCaseStoryFactory, jsoDiffSampleReadonlyArgTypes } from "../jso-diffs-suite/jso-diffs-utils";
import { JsoPropertySamplesStory } from "../jso-diffs-suite/property-samples-common";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import { createSampleById } from "../utils/sample-cases";

// This suite exercises the hiding feature itself, so stories open with unchanged nodes collapsed.
const HIDE_UNCHANGED_NODES_BY_DEFAULT = true;

const beforeFiles = import.meta.glob(
  "../../../../samples/jso-diffs/hiding-unchanged-nodes/second-level/*/before.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/jso-diffs/hiding-unchanged-nodes/second-level/*/after.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleById = createSampleById(collectSampleCases(beforeFiles, afterFiles));

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSO Diffs Suite (Hiding Unchanged Nodes)/Second Level",
  component: JsoPropertySamplesStory,
  argTypes: jsoDiffSampleReadonlyArgTypes,
} satisfies Meta<typeof JsoPropertySamplesStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = createJsoCaseStoryFactory(
  JsoPropertySamplesStory,
  sampleById,
  HIDE_UNCHANGED_NODES_BY_DEFAULT,
);

export const Case_2_1_two_changed_three_unchanged_one_changed: Story = createCaseStory("2.1-two-changed-three-unchanged-one-changed");
export const Case_2_2_three_unchanged_one_changed_two_unchanged: Story = createCaseStory("2.2-three-unchanged-one-changed-two-unchanged");
export const Case_2_3_nested_object_added: Story = createCaseStory("2.3-nested-object-added");
export const Case_2_4_nested_object_removed: Story = createCaseStory("2.4-nested-object-removed");
export const Case_2_5_nested_primitive_to_object: Story = createCaseStory("2.5-nested-primitive-to-object");
export const Case_2_6_array_item_replaced: Story = createCaseStory("2.6-array-item-replaced");
export const Case_2_7_array_object_item_changed: Story = createCaseStory("2.7-array-object-item-changed");
