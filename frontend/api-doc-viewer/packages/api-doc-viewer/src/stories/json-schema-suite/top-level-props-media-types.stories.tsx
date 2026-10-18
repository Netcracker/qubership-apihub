import type { Meta, StoryObj } from "@storybook/react-vite"
import { JsonSchemaViewer } from "@apihub/components/JsonSchemaViewer/JsonSchemaViewer"

/**
 * Schema in the shape a host synthesizes from OpenAPI operation parameters: one property per
 * parameter. `complex` is a parameter described with `content`, so its media type comes through
 * `topLevelPropsMediaTypes`. `nested.complex` shares the key but is not a root's direct property,
 * so it gets no badge. Passed as is (no OAS wrapper), like a host does.
 * Design: docs/design/json-schema/features/top-level-props-media-types.md
 */
const schema = {
  type: "object",
  required: ["complex"],
  properties: {
    simple: { type: "number", description: "Number param" },
    complex: { type: "string", description: "String param", deprecated: true },
    nested: {
      type: "object",
      description: "Object param",
      properties: {
        complex: { type: "string", description: "Nested property with the same key" },
      },
    },
  },
}

const TOP_LEVEL_PROPS_MEDIA_TYPES = {
  complex: "application/json",
  nested: "application/xml",
}

// eslint-disable-next-line storybook/story-exports
const meta = {
  id: "json-schema-suite-top-level-props-media-types",
  title: "JSON Schema Suite/Top Level Props Media Types",
  component: JsonSchemaViewer,
  args: {
    schema,
    expandedDepth: 5,
    topLevelPropsMediaTypes: TOP_LEVEL_PROPS_MEDIA_TYPES,
  },
} satisfies Meta<typeof JsonSchemaViewer>

export default meta

type Story = StoryObj<typeof meta>

export const DetailedMode: Story = {
  args: { displayMode: "detailed" },
}

export const SimpleMode: Story = {
  args: { displayMode: "simple" },
}
