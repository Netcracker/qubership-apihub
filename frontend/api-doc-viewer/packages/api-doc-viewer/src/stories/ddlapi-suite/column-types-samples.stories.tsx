import { DdlTableViewer } from "@apihub/components/DdlTableViewer/DdlTableViewer";
import type { Meta, StoryObj } from "@storybook/react";
import {
  collectDdlSampleCases,
  createDdlSampleById,
} from "../utils/ddl-samples-cases";
import { createCaseStoryFactory } from "./ddl-samples-common";

const sampleFiles = import.meta.glob(
  "../../../../samples/ddlapi/column-types/*/sample.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlSampleCases(sampleFiles);
const sampleById = createDdlSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  id: "ddlapi-suite-column-types",
  title: "DDL API Suite/Column Types",
  component: DdlTableViewer,
} satisfies Meta<typeof DdlTableViewer>;

export default meta;

type Story = StoryObj<typeof DdlTableViewer>;

export const Bigint: Story = createCaseStory("bigint");
export const Bit: Story = createCaseStory("bit");
export const BitVarying: Story = createCaseStory("bit-varying");
export const Boolean: Story = createCaseStory("boolean");
export const Box: Story = createCaseStory("box");
export const Bytea: Story = createCaseStory("bytea");
export const Char: Story = createCaseStory("char");
export const Character: Story = createCaseStory("character");
export const CharacterVarying: Story = createCaseStory("character-varying");
export const Cidr: Story = createCaseStory("cidr");
export const Circle: Story = createCaseStory("circle");
export const Date: Story = createCaseStory("date");
export const DecimalPrecisionScale: Story = createCaseStory("decimal-precision-scale");
export const Domain: Story = createCaseStory("domain");
export const DoublePrecision: Story = createCaseStory("double-precision");
export const Enum: Story = createCaseStory("enum");
export const Inet: Story = createCaseStory("inet");
export const Integer: Story = createCaseStory("integer");
export const Interval: Story = createCaseStory("interval");
export const Json: Story = createCaseStory("json");
export const Jsonb: Story = createCaseStory("jsonb");
export const Line: Story = createCaseStory("line");
export const Lseg: Story = createCaseStory("lseg");
export const Macaddr: Story = createCaseStory("macaddr");
export const Macaddr8: Story = createCaseStory("macaddr-8");
export const Money: Story = createCaseStory("money");
export const Numeric: Story = createCaseStory("numeric");
export const NumericPrecisionScale: Story = createCaseStory("numeric-precision-scale");
export const Path: Story = createCaseStory("path");
export const Point: Story = createCaseStory("point");
export const Polygon: Story = createCaseStory("polygon");
export const Real: Story = createCaseStory("real");
export const Smallint: Story = createCaseStory("smallint");
export const Text: Story = createCaseStory("text");
export const Time: Story = createCaseStory("time");
export const TimePrecision: Story = createCaseStory("time-precision");
export const TimeWithTimeZone: Story = createCaseStory("time-with-time-zone");
export const Timestamp: Story = createCaseStory("timestamp");
export const TimestampPrecision: Story = createCaseStory("timestamp-precision");
export const Timestamptz: Story = createCaseStory("timestamptz");
export const Tsquery: Story = createCaseStory("tsquery");
export const Tsvector: Story = createCaseStory("tsvector");
export const Uuid: Story = createCaseStory("uuid");
export const Varchar: Story = createCaseStory("varchar");
export const Xml: Story = createCaseStory("xml");
