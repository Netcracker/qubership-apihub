import { stringify as stringifyYaml } from "yaml";
import type { DisplayMode } from "@apihub/types/DisplayMode";
import type { ArgTypes, Meta, StoryObj } from "@storybook/react-vite";
import { DISPLAY_MODE_ARG_TYPES, DISPLAY_MODE_DEFAULT_ARGS } from "../shared/display-mode-arg-types";
import { JsonSchemaViewer } from "@apihub/components/JsonSchemaViewer/JsonSchemaViewer"
import type { JsonSchemaSampleCase } from "../utils/json-schema-samples-cases"

const JSON_SCHEMA_SUITE_EXPANDED_DEPTH = 5;

export type JsonSchemaCaseStoryComponentProps = {
  caseId: string;
  sampleYaml: string;
  displayMode?: DisplayMode;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const JsonSchemaSampleStory = (_props: JsonSchemaCaseStoryComponentProps) => null;

export type JsonSchemaSamplesStoryMeta = Meta<typeof JsonSchemaSampleStory>;
export type JsonSchemaSamplesStoryObj = StoryObj<JsonSchemaSamplesStoryMeta>;

/** YAML text of the effective schema passed to the viewer, for read-only display in Controls. */
export const toSampleYaml = (schema: Record<string, unknown>): string =>
  `${stringifyYaml(schema, { lineWidth: 0 })}\n`;

export const jsonSchemaSampleReferenceArgTypes = {
  caseId: {
    control: { disable: true },
    table: { disable: true },
  },
  sampleYaml: {
    control: { type: "text" },
    table: { category: "Sample" },
    description:
      "Effective sample schema (YAML) for reference. The viewer always uses the bundled fixture for the selected case.",
  },
  ...DISPLAY_MODE_ARG_TYPES,
} satisfies Partial<ArgTypes<JsonSchemaCaseStoryComponentProps>>;

export const jsonSchemaSamplesStoryMetaBase = {
  component: JsonSchemaSampleStory,
  argTypes: jsonSchemaSampleReferenceArgTypes,
} satisfies Pick<JsonSchemaSamplesStoryMeta, "component" | "argTypes">;

export type JsonSchemaCaseStoryFactoryOptions = {
  /** Per case: the viewer's `topLevelPropsMediaTypes` (root property key -> media type badge). */
  topLevelPropsMediaTypes?: Partial<Record<string, Record<string, string>>>;
};

export const createCaseStoryFactory = (
  sampleById: Record<string, JsonSchemaSampleCase>,
  options: JsonSchemaCaseStoryFactoryOptions = {},
) => {
  return (caseId: string): JsonSchemaSamplesStoryObj => {
    const sample = sampleById[caseId];
    if (!sample) {
      throw new Error(`Sample case not found: ${caseId}`);
    }

    return {
      name: caseId,
      args: { caseId, sampleYaml: toSampleYaml(sample.schema), ...DISPLAY_MODE_DEFAULT_ARGS },
      render: (args) => {
        const resolvedSample = sampleById[args.caseId];
        return (
          <JsonSchemaViewer
            schema={resolvedSample.schema}
            expandedDepth={JSON_SCHEMA_SUITE_EXPANDED_DEPTH}
            displayMode={args.displayMode}
            topLevelPropsMediaTypes={options.topLevelPropsMediaTypes?.[args.caseId]}
          />
        );
      },
    };
  };
};
