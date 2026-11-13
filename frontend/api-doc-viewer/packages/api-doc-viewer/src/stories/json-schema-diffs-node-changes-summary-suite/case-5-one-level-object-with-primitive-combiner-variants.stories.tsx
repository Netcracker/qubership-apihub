/**
 * Fixture: packages/samples/json-schema-diffs/node-changes-summary/case-5-oneof-properties/
 * Object with 4 `oneOf(string, number)` properties (wholly added / wholly removed / gains a
 * `number` variant / loses a `number` variant) - see
 * packages/samples/json-schema-diffs/node-changes-summary/README.md.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  NodeChangesSummarySampleStory,
  createNodeChangesSummaryCaseStory,
} from "./node-changes-summary-utils";

const CASE_SLUG = "5-oneof-properties";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Node Changes Summary)/Case 5 — One Level Object With Primitive Combiner Variants",
  component: NodeChangesSummarySampleStory,
} satisfies Meta<typeof NodeChangesSummarySampleStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Expanded_root: Story = createNodeChangesSummaryCaseStory(CASE_SLUG, "Expanded root", 1);
export const Collapsed_root: Story = createNodeChangesSummaryCaseStory(CASE_SLUG, "Collapsed root", 0);
