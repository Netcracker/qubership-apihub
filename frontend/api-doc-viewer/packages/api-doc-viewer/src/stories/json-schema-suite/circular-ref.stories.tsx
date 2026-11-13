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

// The viewer copies a schema with an `x-` extension while building the tree. These cases check that
// cycles of such schemas still end in a circular node.
const OFFERING_REF = "#/components/schemas/Offering"

function createCircularCase(caseId: string, offering: Record<string, unknown>): Story {
  const schema = { $ref: OFFERING_REF }
  const components = { schemas: { Offering: offering } }
  const prepared = prepareJsonSchema({ schema, target: REQUEST_BODY_TARGET, additionalComponents: components, circular: true })
  return {
    args: {
      caseId,
      sampleYaml: toSampleYaml({ schema, additionalComponents: components }),
    },
    render: () => (
      <JsonSchemaViewer schema={prepared} expandedDepth={JSON_SCHEMA_SUITE_EXPANDED_DEPTH} />
    ),
  }
}

function offeringSchema(
  extensions: Record<string, unknown>,
  properties: Record<string, unknown>,
  required: string[] = [],
): Record<string, unknown> {
  return {
    type: "object",
    ...extensions,
    ...(required.length > 0 ? { required } : {}),
    properties: { id: { type: "string" }, ...properties },
  }
}

const DIRECT_CYCLE_PROPERTIES = {
  parent: { $ref: OFFERING_REF },
  children: { type: "array", items: { $ref: OFFERING_REF } },
}

// `allOf` merges the enclosing schema and a description into a new schema, so `delivery` is not a
// cycle itself; the circular node is `delivery.delivery`.
const ALL_OF_CYCLE_PROPERTIES = {
  delivery: {
    allOf: [
      { $ref: OFFERING_REF },
      { type: "object", description: "Only `id` is used for a delivery offering." },
    ],
  },
  children: { type: "array", items: { $ref: OFFERING_REF } },
}

export const CycledWithExtension: Story = createCircularCase(
  "cycled-with-extension",
  // `parent` is required: its cycle node shows the asterisk of its own position.
  offeringSchema({ "x-entity": "Offering" }, DIRECT_CYCLE_PROPERTIES, ["parent"]),
)

export const CycledThroughAllOf: Story = createCircularCase(
  "cycled-through-all-of",
  offeringSchema({}, ALL_OF_CYCLE_PROPERTIES),
)

export const CycledThroughAllOfWithExtension: Story = createCircularCase(
  "cycled-through-all-of-with-extension",
  offeringSchema({ "x-entity": "Offering" }, ALL_OF_CYCLE_PROPERTIES),
)
