/**
 * Shared render helper for the node-changes-summary case files in this suite. Each
 * `case-N-*.stories.tsx` file owns exactly one sample case (see
 * packages/samples/json-schema-diffs/node-changes-summary/README.md) and renders it at 2-4
 * `expandedDepth` values - one story per variant. Splitting "Case N" and its semantic title into
 * the file's own `meta.title` (see the per-case files) keeps each story's own `name` down to just
 * the variant (e.g. "Expanded root"), instead of repeating the case identity in every story name.
 */
import {
  createJsonSchemaDiffsViewerArgs,
  jsonSchemaDiffSampleReadonlyArgTypes,
} from '../json-schema-diffs-suite/json-schema-diffs-utils'
import { JsonSchemaDiffsViewer } from '@apihub/components/JsonSchemaViewer/JsonSchemaDiffsViewer'
import { AUTO_SWITCH_ARG_TYPES, type AutoSwitchArgs, playAutoSwitch } from '../shared/auto-switch'

const beforeFiles = import.meta.glob(
  '../../../../samples/json-schema-diffs/node-changes-summary/*/before.yaml',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

const afterFiles = import.meta.glob(
  '../../../../samples/json-schema-diffs/node-changes-summary/*/after.yaml',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

const CASE_SLUG_PATTERN = /node-changes-summary\/case-([^/]+)\//

const extractCaseSlug = (path: string): string => {
  const match = path.match(CASE_SLUG_PATTERN)
  if (!match) {
    throw new Error(`Cannot resolve node-changes-summary case slug from path: ${path}`)
  }
  return match[1]
}

const indexBySlug = (files: Record<string, string>): Record<string, string> =>
  Object.entries(files).reduce<Record<string, string>>((accumulator, [path, content]) => {
    accumulator[extractCaseSlug(path)] = content
    return accumulator
  }, {})

const beforeBySlug = indexBySlug(beforeFiles)
const afterBySlug = indexBySlug(afterFiles)

type NodeChangesSummaryStoryArgs = AutoSwitchArgs & {
  beforeYaml: string;
  afterYaml: string;
};

/** `meta.component` for the per-case files; every story overrides `render` with its own depth. */
export const NodeChangesSummarySampleStory = ({ beforeYaml, afterYaml }: NodeChangesSummaryStoryArgs) => (
  <JsonSchemaDiffsViewer {...createJsonSchemaDiffsViewerArgs(beforeYaml, afterYaml)} hideUnchangedNodes={false} />
)

const NODE_CHANGES_SUMMARY_ARG_TYPES = {
  ...jsonSchemaDiffSampleReadonlyArgTypes,
  ...AUTO_SWITCH_ARG_TYPES,
}

type NodeChangesSummaryCaseStoryResult = {
  name: string;
  args: NodeChangesSummaryStoryArgs;
  argTypes: typeof NODE_CHANGES_SUMMARY_ARG_TYPES;
  render: (args: NodeChangesSummaryStoryArgs) => JSX.Element;
  play: typeof playAutoSwitch;
};

/**
 * Renders one node-changes-summary sample case at a specific expand depth. On load, the story
 * switches oneOf/anyOf combiners to a wholly added or removed variant (`playAutoSwitch`); pass
 * `autoSwitch: false` for a story that shows the combiner's default variant.
 */
export const createNodeChangesSummaryCaseStory = (
  caseSlug: string,
  variantName: string,
  expandedDepth: number,
  autoSwitch: boolean = true,
): NodeChangesSummaryCaseStoryResult => {
  const beforeYaml = beforeBySlug[caseSlug]
  const afterYaml = afterBySlug[caseSlug]
  if (!beforeYaml || !afterYaml) {
    throw new Error(`Sample case not found: ${caseSlug}`)
  }

  return {
    name: variantName,
    args: { beforeYaml, afterYaml, autoSwitch },
    argTypes: NODE_CHANGES_SUMMARY_ARG_TYPES,
    render: (args) => {
      const viewerArgs = createJsonSchemaDiffsViewerArgs(args.beforeYaml, args.afterYaml)
      return <JsonSchemaDiffsViewer {...viewerArgs} expandedDepth={expandedDepth} hideUnchangedNodes={false}/>
    },
    play: playAutoSwitch,
  }
}
