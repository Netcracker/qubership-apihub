/**
 * Fixture: packages/samples/json-schema-diffs/node-changes-summary/case-7-oneof-wrapping-array-cases/
 * Object with 2 `oneOf(string, array)` properties, where the array variant is Case 3's schema
 * (first property) and Case 4's schema (second property) - see
 * packages/samples/json-schema-diffs/node-changes-summary/README.md. `string` is the combiner's
 * default selection; the "chosen array" stories use `createNodeChangesSummaryCaseStoryWithChangedVariant`
 * so both properties' combiners auto-switch to their changed (array) variant on mount, via the
 * shared `switchCombinerNodesToChangedVariant` (index-based `json-schema-combiner-option-{index}`
 * testids on CombinerSelectorRow, discovered generically rather than scoped per-property - see
 * that function's own doc comment for why index collisions across properties/diff panes don't
 * matter for it). "Default choice" and "Collapsed root" intentionally keep the plain
 * `createNodeChangesSummaryCaseStory` (no switch) - they exist specifically to show the
 * combiner's default, unswitched selection. There is no items-expand step: a combiner-leaf array
 * never gets an expandable `items` child in the current JsonSchemaViewer (see the IT test's
 * comment), so "expanded items" and "collapsed items" are expected to render identically for now.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  NodeChangesSummarySampleStory,
  createNodeChangesSummaryCaseStory,
  createNodeChangesSummaryCaseStoryWithChangedVariant,
} from "./node-changes-summary-utils";

const CASE_SLUG = "7-oneof-wrapping-array-cases";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Node Changes Summary)/Case 7 — One Level Object With Array Combiner Variant",
  component: NodeChangesSummarySampleStory,
} satisfies Meta<typeof NodeChangesSummarySampleStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Expanded_root_chosen_array_expanded_items: Story = createNodeChangesSummaryCaseStoryWithChangedVariant(
  CASE_SLUG, "Expanded root, chosen array, expanded items", 3,
);
export const Expanded_root_chosen_array_collapsed_items: Story = createNodeChangesSummaryCaseStoryWithChangedVariant(
  CASE_SLUG, "Expanded root, chosen array, collapsed items", 2,
);
export const Expanded_root_default_choice: Story = createNodeChangesSummaryCaseStory(
  CASE_SLUG, "Expanded root, default choice", 1,
);
export const Collapsed_root: Story = createNodeChangesSummaryCaseStory(CASE_SLUG, "Collapsed root", 0);
