/**
 * Fixture: packages/samples/json-schema-diffs/node-changes-summary/case-3-array-items-case-1/
 * Array whose `items` schema is Case 1 - see
 * packages/samples/json-schema-diffs/node-changes-summary/README.md.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NodeChangesSummarySampleStory, createNodeChangesSummaryCaseStory } from "./node-changes-summary-utils";

const CASE_SLUG = "3-array-items-case-1";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Node Changes Summary)/Case 3 — Array Of One Level Object In Items",
  component: NodeChangesSummarySampleStory,
} satisfies Meta<typeof NodeChangesSummarySampleStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Expanded_root: Story = createNodeChangesSummaryCaseStory(CASE_SLUG, "Expanded root", 1);
export const Collapsed_root: Story = createNodeChangesSummaryCaseStory(CASE_SLUG, "Collapsed root", 0);
