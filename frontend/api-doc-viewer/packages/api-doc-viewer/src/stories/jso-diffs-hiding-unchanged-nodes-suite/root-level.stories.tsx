import type { Meta, StoryObj } from "@storybook/react-vite";
import { createJsoCaseStoryFactory, jsoDiffSampleReadonlyArgTypes } from "../jso-diffs-suite/jso-diffs-utils";
import { JsoPropertySamplesStory } from "../jso-diffs-suite/property-samples-common";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import { createSampleById } from "../utils/sample-cases";

// This suite exercises the hiding feature itself, so stories open with unchanged nodes collapsed.
const HIDE_UNCHANGED_NODES_BY_DEFAULT = true;

const beforeFiles = import.meta.glob(
  "../../../../samples/jso-diffs/hiding-unchanged-nodes/root-level/*/before.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/jso-diffs/hiding-unchanged-nodes/root-level/*/after.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleById = createSampleById(collectSampleCases(beforeFiles, afterFiles));

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSO Diffs Suite (Hiding Unchanged Nodes)/Root Level",
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

export const Case_1_1_two_changed_three_unchanged_one_changed: Story = createCaseStory("1.1-two-changed-three-unchanged-one-changed");
export const Case_1_2_three_unchanged_one_changed_two_unchanged: Story = createCaseStory("1.2-three-unchanged-one-changed-two-unchanged");
export const Case_1_3_removed_and_added_between_unchanged: Story = createCaseStory("1.3-removed-and-added-between-unchanged");
export const Case_1_4_nothing_changed: Story = createCaseStory("1.4-nothing-changed");
export const Case_1_5_everything_changed: Story = createCaseStory("1.5-everything-changed");
