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
  "../../../../samples/ddlapi/escaping-spec-chars/*/sample.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlSampleCases(sampleFiles);
const sampleById = createDdlSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlSamplesStoryMetaBase,
  id: "ddlapi-suite-escaping-spec-chars",
  title: "DDL API Suite/Escaping Spec Chars",
} satisfies Meta<typeof DdlSampleStory>;

export default meta;

type Story = DdlSamplesStoryObj;

export const DefaultValueBackslash: Story = createCaseStory("default-value-backslash");
export const DefaultValueCr: Story = createCaseStory("default-value-cr");
export const DefaultValueCrlf: Story = createCaseStory("default-value-crlf");
export const DefaultValueEmbeddedSingleQuotes: Story = createCaseStory("default-value-embedded-single-quotes");
export const DefaultValueLf: Story = createCaseStory("default-value-lf");
export const DefaultValueQuoted: Story = createCaseStory("default-value-quoted");
export const DefaultValueTab: Story = createCaseStory("default-value-tab");
export const DefaultValueUnicode: Story = createCaseStory("default-value-unicode");
export const GeneratedExpressionComposite: Story = createCaseStory("generated-expression-composite");
export const GeneratedExpressionQuoted: Story = createCaseStory("generated-expression-quoted");
