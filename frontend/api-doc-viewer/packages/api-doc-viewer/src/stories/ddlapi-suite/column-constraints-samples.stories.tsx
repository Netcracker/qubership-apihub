import { DdlTableViewer } from "@apihub/components/DdlTableViewer/DdlTableViewer";
import type { Meta, StoryObj } from "@storybook/react";
import {
  collectDdlSampleCases,
  createDdlSampleById,
} from "../utils/ddl-samples-cases";
import { createCaseStoryFactory } from "./ddl-samples-common";

const sampleFiles = import.meta.glob(
  "../../../../samples/ddlapi/column-constraints/*/sample.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlSampleCases(sampleFiles);
const sampleById = createDdlSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  id: "ddlapi-suite-column-constraints",
  title: "DDL API Suite/Column Constraints",
  component: DdlTableViewer,
} satisfies Meta<typeof DdlTableViewer>;

export default meta;

type Story = StoryObj<typeof DdlTableViewer>;

export const ForeignKey: Story = createCaseStory("foreign-key");
export const ForeignKeyCustomSchema: Story = createCaseStory("foreign-key-custom-schema");
export const ForeignKeyNotNull: Story = createCaseStory("foreign-key-not-null");
export const ForeignKeyUnique: Story = createCaseStory("foreign-key-unique");
export const ForeignKeyUniqueNotNull: Story = createCaseStory("foreign-key-unique-not-null");
export const GeneratedBigserial: Story = createCaseStory("generated-bigserial");
export const GeneratedExpression: Story = createCaseStory("generated-expression");
export const GeneratedExpressionNotNull: Story = createCaseStory("generated-expression-not-null");
export const GeneratedIdentity: Story = createCaseStory("generated-identity");
export const GeneratedIdentityPrimaryKey: Story = createCaseStory("generated-identity-primary-key");
export const GeneratedSerial: Story = createCaseStory("generated-serial");
export const GeneratedSmallserial: Story = createCaseStory("generated-smallserial");
export const NoConstraints: Story = createCaseStory("no-constraints");
export const NotNull: Story = createCaseStory("not-null");
export const PrimaryKey: Story = createCaseStory("primary-key");
export const PrimaryKeyForeignKey: Story = createCaseStory("primary-key-foreign-key");
export const PrimaryKeyForeignKeyNotNull: Story = createCaseStory("primary-key-foreign-key-not-null");
export const PrimaryKeyNotNull: Story = createCaseStory("primary-key-not-null");
export const SerialPrimaryKey: Story = createCaseStory("serial-primary-key");
export const Unique: Story = createCaseStory("unique");
export const UniqueNotNull: Story = createCaseStory("unique-not-null");
