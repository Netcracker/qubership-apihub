import type { Meta } from "@storybook/react-vite"
import { JsonSchemaViewer } from "@apihub/components/JsonSchemaViewer/JsonSchemaViewer"
import { prepareJsonSchema, REQUEST_BODY_TARGET } from "../preprocess"
import {
  JsonSchemaSampleStory,
  jsonSchemaSamplesStoryMetaBase,
  toSampleYaml,
  type JsonSchemaSamplesStoryObj,
} from "./json-schema-samples-common"

const JSON_SCHEMA_SUITE_EXPANDED_DEPTH = 5

const rawSchema = {
  type: "object",
  properties: {
    a: { $ref: "#/components/schemas/A" },
    b: { $ref: "#/components/schemas/A" },
    c: { type: "string" },
    d: {
      type: "object",
      properties: {
        e: { type: "number" },
      },
    },
  },
}

const additionalComponents = {
  schemas: {
    A: {
      type: "object",
      properties: {
        c: { $ref: "#/components/schemas/A" },
      },
    },
  },
}

const cycledSchema = prepareJsonSchema({
  schema: rawSchema,
  target: REQUEST_BODY_TARGET,
  additionalComponents,
  circular: true,
})

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsonSchemaSamplesStoryMetaBase,
  id: "json-schema-suite-circular-ref",
  title: "JSON Schema Suite/Circular Ref",
} satisfies Meta<typeof JsonSchemaSampleStory>

export default meta

type Story = JsonSchemaSamplesStoryObj

export const Cycled: Story = {
  args: {
    caseId: "cycled",
    sampleYaml: toSampleYaml({ schema: rawSchema, additionalComponents }),
  },
  render: () => (
    <JsonSchemaViewer schema={cycledSchema} expandedDepth={JSON_SCHEMA_SUITE_EXPANDED_DEPTH} />
  ),
}
