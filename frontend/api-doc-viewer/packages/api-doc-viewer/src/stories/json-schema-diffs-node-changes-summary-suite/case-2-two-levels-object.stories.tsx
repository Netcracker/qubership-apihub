/**
 * Fixture: packages/samples/json-schema-diffs/node-changes-summary/case-2-object-wrapping-case-1/
 * Object with 2 properties - the first is Case 1's schema, the second is unchanged - see
 * packages/samples/json-schema-diffs/node-changes-summary/README.md.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NodeChangesSummarySampleStory, createNodeChangesSummaryCaseStory } from "./node-changes-summary-utils";

const CASE_SLUG = "2-object-wrapping-case-1";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Node Changes Summary)/Case 2 — Two Levels Object",
  component: NodeChangesSummarySampleStory,
} satisfies Meta<typeof NodeChangesSummarySampleStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Expanded_root_expanded_first_property: Story = createNodeChangesSummaryCaseStory(
  CASE_SLUG, "Expanded root, expanded first property", 2,
);
export const Expanded_root_collapsed_first_property: Story = createNodeChangesSummaryCaseStory(
  CASE_SLUG, "Expanded root, collapsed first property", 1,
);
export const Collapsed_root: Story = createNodeChangesSummaryCaseStory(CASE_SLUG, "Collapsed root", 0);
