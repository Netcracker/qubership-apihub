import { JsonSchemaDiffsViewer } from "@apihub/components/JsonSchemaViewer/JsonSchemaDiffsViewer";
import { JsoDiffsViewer } from "@apihub/components/JsoViewer/JsoDiffsViewer";
import type { ArgTypes } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { prepareJsoDiffsDocument } from "../preprocess";
import { parseYamlSource } from "../utils/parse-yaml-source";
import { TEST_DIFF_META_KEYS } from "../shared/test-diff-meta-keys";

export type JsoDiffSampleCase = {
  caseId: string;
  beforeYaml: string;
  afterYaml: string;
};

export type JsoCaseStoryComponentProps = Pick<
  JsoDiffSampleCase,
  "caseId" | "beforeYaml" | "afterYaml"
> & {
  hideUnchangedNodes: boolean;
};

export const JSO_DIFFS_SUITE_DEFAULT_HIDE_UNCHANGED_NODES = false;

export const jsoDiffSampleReadonlyArgTypes = {
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
    description: "Forwarded to JsoDiffsViewer's hideUnchangedNodes prop.",
  },
} satisfies Partial<ArgTypes<JsoCaseStoryComponentProps>>;

type JsoDiffsViewerProps = ComponentProps<typeof JsoDiffsViewer>;

type JsoCaseStoryArgs = {
  name: string;
  args: JsoCaseStoryComponentProps;
  argTypes: typeof jsoDiffSampleReadonlyArgTypes;
  render: (args: JsoCaseStoryComponentProps) => JSX.Element;
};

const createSource = (sourceText: string): Record<string, unknown> => parseYamlSource(sourceText);

export const createJsoViewerArgs = (
  beforeSourceText: string,
  afterSourceText: string,
  hideUnchangedNodes: boolean,
): JsoDiffsViewerProps => ({
  mergedSource: prepareJsoDiffsDocument({
    beforeSource: createSource(beforeSourceText),
    afterSource: createSource(afterSourceText),
    diffMetaKeys: TEST_DIFF_META_KEYS,
  }),
  initialLevel: 1,
  supportJsonSchema: true,
  embeddedSchemaDiffsComponent: JsonSchemaDiffsViewer,
  diffMetaKeys: TEST_DIFF_META_KEYS,
  hideUnchangedNodes,
});

/**
 * `defaultHideUnchangedNodes` seeds the `hideUnchangedNodes` story arg (default `false`: the property
 * suites show every row; the "Hiding Unchanged Nodes" suite passes `true`).
 */
export const createJsoCaseStoryFactory = (
  StoryComponent: (props: JsoCaseStoryComponentProps) => JSX.Element,
  sampleById: Record<string, JsoDiffSampleCase>,
  defaultHideUnchangedNodes: boolean = JSO_DIFFS_SUITE_DEFAULT_HIDE_UNCHANGED_NODES,
) => (caseId: string): JsoCaseStoryArgs => {
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
    argTypes: jsoDiffSampleReadonlyArgTypes,
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
