import type { Meta, StoryObj } from "@storybook/react-vite";
import { createJsoCaseStoryFactory, jsoDiffSampleReadonlyArgTypes } from "../jso-diffs-suite/jso-diffs-utils";
import { JsoPropertySamplesStory } from "../jso-diffs-suite/property-samples-common";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import { createSampleById } from "../utils/sample-cases";

// This suite exercises the hiding feature itself, so stories open with unchanged nodes collapsed.
const HIDE_UNCHANGED_NODES_BY_DEFAULT = true;

const beforeFiles = import.meta.glob(
  "../../../../samples/jso-diffs/hiding-unchanged-nodes/nested/*/before.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/jso-diffs/hiding-unchanged-nodes/nested/*/after.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleById = createSampleById(collectSampleCases(beforeFiles, afterFiles));

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSO Diffs Suite (Hiding Unchanged Nodes)/Nested",
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

export const Case_3_1_third_level_changes_with_unchanged_siblings: Story = createCaseStory("3.1-third-level-changes-with-unchanged-siblings");
export const Case_3_2_fourth_level_change: Story = createCaseStory("3.2-fourth-level-change");
export const Case_3_3_changes_in_two_branches_unchanged_branch_between: Story = createCaseStory("3.3-changes-in-two-branches-unchanged-branch-between");
export const Case_3_4_json_schema_value_changed: Story = createCaseStory("3.4-json-schema-value-changed");
