/**
 * Fixture: packages/samples/json-schema-diffs/node-changes-summary/case-6-oneof-wrapping-object-cases/
 * Object with 2 `oneOf(string, object)` properties, where the object variant is Case 1's schema
 * (first property) and Case 2's schema (second property) - see
 * packages/samples/json-schema-diffs/node-changes-summary/README.md. `string` is the combiner's
 * default selection; the "chosen object" story uses `createNodeChangesSummaryCaseStoryWithChangedVariant`
 * so both properties' combiners auto-switch to their changed (object) variant on mount, via the
 * shared `switchCombinerNodesToChangedVariant`. "Collapsed root" intentionally keeps the plain
 * `createNodeChangesSummaryCaseStory` (no switch) - it doesn't expand far enough to show any
 * combiner anyway.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  NodeChangesSummarySampleStory,
  createNodeChangesSummaryCaseStory,
  createNodeChangesSummaryCaseStoryWithChangedVariant,
} from "./node-changes-summary-utils";

const CASE_SLUG = "6-oneof-wrapping-object-cases";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Node Changes Summary)/Case 6 — One Level Object With Object Combiner Variant",
  component: NodeChangesSummarySampleStory,
} satisfies Meta<typeof NodeChangesSummarySampleStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Expanded_root_chosen_object: Story = createNodeChangesSummaryCaseStoryWithChangedVariant(
  CASE_SLUG, "Expanded root, chosen object", 2,
);
export const Collapsed_root: Story = createNodeChangesSummaryCaseStory(CASE_SLUG, "Collapsed root", 0);
