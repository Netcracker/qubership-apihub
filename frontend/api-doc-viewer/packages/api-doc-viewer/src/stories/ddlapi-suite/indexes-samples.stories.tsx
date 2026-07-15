import type { Meta, StoryObj } from "@storybook/react";
import {
  collectDdlSampleCases,
  createDdlSampleById,
} from "../utils/ddl-samples-cases";
import {
  DdlSampleStory,
  createCaseStoryFactory,
  ddlSamplesStoryMetaBase,
  type DdlSamplesStoryObj,
} from "./ddl-samples-common";

const sampleFiles = import.meta.glob(
  "../../../../samples/ddlapi/indexes/*/sample.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlSampleCases(sampleFiles);
const sampleById = createDdlSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlSamplesStoryMetaBase,
  id: "ddlapi-suite-indexes",
  title: "DDL API Suite/Indexes",
} satisfies Meta<typeof DdlSampleStory>;

export default meta;

type Story = DdlSamplesStoryObj;

export const CoveringInclude: Story = createCaseStory("covering-include");
export const Expression: Story = createCaseStory("expression");
export const NullsNotDistinct: Story = createCaseStory("nulls-not-distinct");
export const OneColumn: Story = createCaseStory("one-column");
export const OneColumnUnique: Story = createCaseStory("one-column-unique");
export const Partial: Story = createCaseStory("partial");
export const TwoColumns: Story = createCaseStory("two-columns");
export const TwoColumnsUnique: Story = createCaseStory("two-columns-unique");
