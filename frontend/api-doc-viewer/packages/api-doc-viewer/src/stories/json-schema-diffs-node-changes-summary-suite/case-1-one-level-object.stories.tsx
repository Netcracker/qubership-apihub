/**
 * Fixture: packages/samples/json-schema-diffs/node-changes-summary/case-1-simple-properties/
 * Object with 4 simple properties (wholly added / wholly removed / description changed / type
 * changed) - see packages/samples/json-schema-diffs/node-changes-summary/README.md.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NodeChangesSummarySampleStory, createNodeChangesSummaryCaseStory } from "./node-changes-summary-utils";

const CASE_SLUG = "1-simple-properties";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Node Changes Summary)/Case 1 — One Level Object",
  component: NodeChangesSummarySampleStory,
} satisfies Meta<typeof NodeChangesSummarySampleStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Expanded_root: Story = createNodeChangesSummaryCaseStory(CASE_SLUG, "Expanded root", 1);
export const Collapsed_root: Story = createNodeChangesSummaryCaseStory(CASE_SLUG, "Collapsed root", 0);
