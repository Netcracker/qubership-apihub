import { JsonSchemaDiffsViewer } from "@apihub/components/JsonSchemaViewer/JsonSchemaDiffsViewer";
import type { ArgTypes } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from "@netcracker/qubership-apihub-api-diff";
import {
  type JsonDiffSchemaOptions,
  prepareJsonDiffSchema,
  prepareJsonDiffSchemaOas31,
  RESPONSE_200_BODY_TARGET,
} from "../preprocess";
import { parseYamlSource } from "../utils/parse-yaml-source";
import { switchCombinerNodesToChangedVariant } from "@apihub/utils/combiner-changed-variant";

export const JSON_SCHEMA_DIFF_META_KEYS = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
} as const;

export type JsonSchemaDiffSampleCase = {
  caseId: string;
  beforeYaml: string;
  afterYaml: string;
};

export type JsonSchemaDiffCaseStoryComponentProps = Pick<
  JsonSchemaDiffSampleCase,
  "caseId" | "beforeYaml" | "afterYaml"
> & {
  hideUnchangedNodes: boolean;
};

export const JSON_SCHEMA_DIFFS_SUITE_DEFAULT_HIDE_UNCHANGED_NODES = false;

export const jsonSchemaDiffSampleReadonlyArgTypes = {
  beforeYaml: {
    control: { type: "text" },
    table: { category: "Sample" },
    description:
      "Before sample YAML for reference. The viewer always uses the bundled fixture for the selected case.",
  },
  afterYaml: {
    control: { type: "text" },
    table: { category: "Sample" },
    description:
      "After sample YAML for reference. The viewer always uses the bundled fixture for the selected case.",
  },
  hideUnchangedNodes: {
    control: { type: "boolean" },
    table: { category: "Display" },
    description: "Forwarded to JsonSchemaDiffsViewer's hideUnchangedNodes prop.",
  },
} satisfies Partial<ArgTypes<JsonSchemaDiffCaseStoryComponentProps>>;

type JsonSchemaDiffsViewerProps = ComponentProps<typeof JsonSchemaDiffsViewer>;

type JsonSchemaDiffCaseStoryArgs = {
  name: string;
  args: JsonSchemaDiffCaseStoryComponentProps;
  argTypes: typeof jsonSchemaDiffSampleReadonlyArgTypes;
  render: (args: JsonSchemaDiffCaseStoryComponentProps) => JSX.Element;
};

export const JSON_SCHEMA_DIFFS_SUITE_EXPANDED_DEPTH = 5;

const createSchemaFromYaml = (sourceText: string): Record<string, unknown> =>
  parseYamlSource(sourceText);

const createJsonSchemaDiffViewerBaseArgs = (
  schema: unknown,
): JsonSchemaDiffsViewerProps => ({
  schema,
  expandedDepth: JSON_SCHEMA_DIFFS_SUITE_EXPANDED_DEPTH,
  diffMetaKeys: JSON_SCHEMA_DIFF_META_KEYS,
});

/**
 * `oasVersion` picks the synthetic OAS template the pair is wrapped in (default `"3.0"`). Use
 * `"3.1"` for keywords the OAS 3.0 Schema Object dialect lacks (e.g. `propertyNames`, 3.1-style
 * numeric `exclusiveMinimum`) - `apiDiff`'s `validate: true` strips them under OAS 3.0. The OAS 3.1
 * template has no inline variant, so `disableSubstitutionTitle` is OAS 3.0 only.
 */
export type JsonSchemaDiffsViewerArgsOptions =
  | { oasVersion?: "3.0"; disableSubstitutionTitle?: boolean }
  | { oasVersion: "3.1" };

const prepareSuiteJsonDiffSchema = (
  beforeSchema: Record<string, unknown>,
  afterSchema: Record<string, unknown>,
  options: JsonSchemaDiffsViewerArgsOptions,
): unknown => {
  const schemaOptions: JsonDiffSchemaOptions = { beforeSchema, afterSchema, target: RESPONSE_200_BODY_TARGET };
  return options.oasVersion === "3.1"
    ? prepareJsonDiffSchemaOas31(schemaOptions)
    : prepareJsonDiffSchema({ ...schemaOptions, disableSubstitutionTitle: options.disableSubstitutionTitle });
};

export const createJsonSchemaDiffsViewerArgsFromSchemas = (
  beforeSchema: Record<string, unknown>,
  afterSchema: Record<string, unknown>,
  options: JsonSchemaDiffsViewerArgsOptions = {},
): JsonSchemaDiffsViewerProps =>
  createJsonSchemaDiffViewerBaseArgs(prepareSuiteJsonDiffSchema(beforeSchema, afterSchema, options));

export const createJsonSchemaDiffsViewerArgs = (
  beforeSourceText: string,
  afterSourceText: string,
  options: JsonSchemaDiffsViewerArgsOptions = {},
): JsonSchemaDiffsViewerProps =>
  createJsonSchemaDiffsViewerArgsFromSchemas(
    createSchemaFromYaml(beforeSourceText),
    createSchemaFromYaml(afterSourceText),
    options,
  );

/**
 * `defaultHideUnchangedNodes` seeds the `hideUnchangedNodes` story arg (default `false`: validation
 * and metadata suites show every row; the "Hiding Unchanged Nodes" suite passes `true`).
 */
export const createJsonSchemaDiffCaseStoryFactory = (
  StoryComponent: (props: JsonSchemaDiffCaseStoryComponentProps) => JSX.Element,
  sampleById: Record<string, JsonSchemaDiffSampleCase>,
  defaultHideUnchangedNodes: boolean = JSON_SCHEMA_DIFFS_SUITE_DEFAULT_HIDE_UNCHANGED_NODES,
) => (caseId: string): JsonSchemaDiffCaseStoryArgs => {
  const sample = sampleById[caseId];
  if (!sample) {
    throw new Error(`Sample case not found: ${caseId}`);
  }

  return {
    name: caseId,
    args: {
      caseId,
      beforeYaml: sample.beforeYaml,
      afterYaml: sample.afterYaml,
      hideUnchangedNodes: defaultHideUnchangedNodes,
    },
    argTypes: jsonSchemaDiffSampleReadonlyArgTypes,
    render: (args) => {
      const resolvedSample = sampleById[args.caseId];
      return (
        <StoryComponent
          caseId={args.caseId}
          beforeYaml={resolvedSample.beforeYaml}
          afterYaml={resolvedSample.afterYaml}
          hideUnchangedNodes={args.hideUnchangedNodes}
        />
      );
    },
  };
};

type JsonSchemaDiffCaseStoryArgsWithChangedVariant = JsonSchemaDiffCaseStoryArgs & {
  play: (context: { canvasElement: HTMLElement }) => Promise<void>;
};

/**
 * Same as `createJsonSchemaDiffCaseStoryFactory`, but also switches oneOf/anyOf combiner nodes
 * to their changed variant on mount (recursing into nested combiners until a leaf is reached),
 * so the story opens accented on the change instead of the combiner's default first option.
 * Only meaningful for suites that actually contain oneOf/anyOf combiners — a safe no-op
 * otherwise. Screenshot ITs do not rely on this `play` function (it does not run under the
 * Puppeteer iframe.html harness); they call `switchCombinerNodesToChangedVariant` directly via
 * `page.evaluate`.
 */
export const createJsonSchemaDiffCaseStoryFactoryWithChangedVariant = (
  StoryComponent: (props: JsonSchemaDiffCaseStoryComponentProps) => JSX.Element,
  sampleById: Record<string, JsonSchemaDiffSampleCase>,
  defaultHideUnchangedNodes: boolean = JSON_SCHEMA_DIFFS_SUITE_DEFAULT_HIDE_UNCHANGED_NODES,
) => {
  const createCaseStory = createJsonSchemaDiffCaseStoryFactory(StoryComponent, sampleById, defaultHideUnchangedNodes);
  return (caseId: string): JsonSchemaDiffCaseStoryArgsWithChangedVariant => ({
    ...createCaseStory(caseId),
    play: async ({ canvasElement }) => {
      await switchCombinerNodesToChangedVariant(canvasElement);
    },
  });
};

export const JsonSchemaDiffSamplesStory = ({
  beforeYaml,
  afterYaml,
  hideUnchangedNodes,
}: JsonSchemaDiffCaseStoryComponentProps) => (
  <JsonSchemaDiffsViewer
    {...createJsonSchemaDiffsViewerArgs(beforeYaml, afterYaml)}
    hideUnchangedNodes={hideUnchangedNodes}
  />
);

/**
 * Same as JsonSchemaDiffSamplesStory, but inlines schemas in the OAS template instead of $ref-ing
 * to __Substitution__ (disableSubstitutionTitle) -- needed for combiner suites, where the
 * substitution $ref would otherwise be the thing labeled at the diff root instead of the combiner.
 */
export const JsonSchemaDiffSamplesStoryWithDisabledSubstitutionTitle = ({
  beforeYaml,
  afterYaml,
  hideUnchangedNodes,
}: JsonSchemaDiffCaseStoryComponentProps) => (
  <JsonSchemaDiffsViewer
    {...createJsonSchemaDiffsViewerArgs(beforeYaml, afterYaml, { disableSubstitutionTitle: true })}
    hideUnchangedNodes={hideUnchangedNodes}
  />
);

/**
 * Same as JsonSchemaDiffSamplesStory, but wraps the pair in the OAS 3.1 template - needed for
 * keywords the OAS 3.0 dialect strips during `apiDiff` validation (see JsonSchemaDiffsViewerArgsOptions).
 */
export const JsonSchemaDiffSamplesStoryOas31 = ({
  beforeYaml,
  afterYaml,
  hideUnchangedNodes,
}: JsonSchemaDiffCaseStoryComponentProps) => (
  <JsonSchemaDiffsViewer
    {...createJsonSchemaDiffsViewerArgs(beforeYaml, afterYaml, { oasVersion: "3.1" })}
    hideUnchangedNodes={hideUnchangedNodes}
  />
);
