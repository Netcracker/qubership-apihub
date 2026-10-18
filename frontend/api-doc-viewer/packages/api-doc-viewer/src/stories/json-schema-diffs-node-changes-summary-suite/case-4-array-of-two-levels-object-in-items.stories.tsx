/**
 * Fixture: packages/samples/json-schema-diffs/node-changes-summary/case-4-array-items-case-2/
 * Array whose `items` schema is Case 2 - see
 * packages/samples/json-schema-diffs/node-changes-summary/README.md.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NodeChangesSummarySampleStory, createNodeChangesSummaryCaseStory } from "./node-changes-summary-utils";

const CASE_SLUG = "4-array-items-case-2";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Node Changes Summary)/Case 4 — Array Of Two Levels Object In Items",
  component: NodeChangesSummarySampleStory,
} satisfies Meta<typeof NodeChangesSummarySampleStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Expanded_root_expanded_items: Story = createNodeChangesSummaryCaseStory(
  CASE_SLUG, "Expanded root, expanded items", 2,
);
export const Expanded_root_collapsed_items: Story = createNodeChangesSummaryCaseStory(
  CASE_SLUG, "Expanded root, collapsed items", 1,
);
export const Collapsed_root: Story = createNodeChangesSummaryCaseStory(CASE_SLUG, "Collapsed root", 0);
