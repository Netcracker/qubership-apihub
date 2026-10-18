import { JsonSchemaDiffsViewer } from '@apihub/components/JsonSchemaViewer/JsonSchemaDiffsViewer'
import type { ComponentProps } from 'react'
import { prepareJsonDiffSchema, RESPONSE_200_BODY_TARGET } from '../preprocess'
import { parseYamlSource } from '../utils/parse-yaml-source'
import {
  JSON_SCHEMA_DIFF_META_KEYS,
  JSON_SCHEMA_DIFFS_SUITE_EXPANDED_DEPTH,
  type JsonSchemaDiffCaseStoryComponentProps,
} from './json-schema-diffs-utils'

type JsonSchemaDiffsViewerProps = ComponentProps<typeof JsonSchemaDiffsViewer>;

// Circular fixtures keep the cyclic schema in named OAS components: the fixture is
// substituted into an OAS document, so a bare "#" or "#/definitions/..." ref (valid for a
// standalone JSON Schema document) would resolve against the OAS root instead and fail to
// find a schema there. Each fixture file therefore carries the schema under "beforeSchema"/
// "afterSchema" plus the cyclic component definitions under "beforeAdditionalComponents"/
// "afterAdditionalComponents", mirroring the `prepareJsonDiffSchema` option names so the
// raw YAML shown in Storybook controls matches what is actually fed into the viewer.
type CircularSampleFileShape = {
  beforeSchema?: unknown;
  beforeAdditionalComponents?: Record<PropertyKey, unknown>;
  afterSchema?: unknown;
  afterAdditionalComponents?: Record<PropertyKey, unknown>;
};

const createCircularJsonSchemaDiffsViewerArgs = (
  beforeSourceText: string,
  afterSourceText: string,
): JsonSchemaDiffsViewerProps => {
  const before = parseYamlSource(beforeSourceText) as CircularSampleFileShape;
  const after = parseYamlSource(afterSourceText) as CircularSampleFileShape;

  return {
    schema: prepareJsonDiffSchema({
      beforeSchema: before.beforeSchema,
      afterSchema: after.afterSchema,
      beforeAdditionalComponents: before.beforeAdditionalComponents,
      afterAdditionalComponents: after.afterAdditionalComponents,
      target: RESPONSE_200_BODY_TARGET,
      circular: true,
    }),
    expandedDepth: JSON_SCHEMA_DIFFS_SUITE_EXPANDED_DEPTH,
    diffMetaKeys: JSON_SCHEMA_DIFF_META_KEYS,
  };
};

/**
 * Same as JsonSchemaDiffSamplesStory (json-schema-diffs-utils.tsx), but reads the circular fixture
 * shape above and runs the merge with `circular: true`. Story/case factories, arg types and meta
 * keys are shared with the other JSON Schema Diffs Suite stories.
 */
export const JsonSchemaCircularDiffSamplesStory = ({
  beforeYaml,
  afterYaml,
  hideUnchangedNodes,
}: JsonSchemaDiffCaseStoryComponentProps) => (
  <JsonSchemaDiffsViewer
    {...createCircularJsonSchemaDiffsViewerArgs(beforeYaml, afterYaml)}
    hideUnchangedNodes={hideUnchangedNodes}
  />
);
