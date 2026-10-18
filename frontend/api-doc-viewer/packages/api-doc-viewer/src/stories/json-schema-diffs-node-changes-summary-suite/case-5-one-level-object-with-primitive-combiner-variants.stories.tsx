/**
 * Fixture: packages/samples/json-schema-diffs/node-changes-summary/case-5-oneof-properties/
 * Object with 4 `oneOf(string, number)` properties (wholly added / wholly removed / gains a
 * `number` variant / loses a `number` variant) - see
 * packages/samples/json-schema-diffs/node-changes-summary/README.md.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  NodeChangesSummarySampleStory,
  createNodeChangesSummaryCaseStoryWithChangedVariant,
} from "./node-changes-summary-utils";

const CASE_SLUG = "5-oneof-properties";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Node Changes Summary)/Case 5 — One Level Object With Primitive Combiner Variants",
  component: NodeChangesSummarySampleStory,
} satisfies Meta<typeof NodeChangesSummarySampleStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// Unlike cases 6/7, neither story here exists specifically to demonstrate the combiner's
// default/unswitched selection -- both are plain expand-depth variants -- so both safely use
// the changed-variant factory (a no-op wherever a case's diff isn't combiner-option-level).
export const Expanded_root: Story = createNodeChangesSummaryCaseStoryWithChangedVariant(CASE_SLUG, "Expanded root", 1);
export const Collapsed_root: Story = createNodeChangesSummaryCaseStoryWithChangedVariant(CASE_SLUG, "Collapsed root", 0);
