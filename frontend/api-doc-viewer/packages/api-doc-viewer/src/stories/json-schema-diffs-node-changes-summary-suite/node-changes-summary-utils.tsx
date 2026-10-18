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
import { switchCombinerNodesToChangedVariant } from '@apihub/utils/combiner-changed-variant'

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

type NodeChangesSummaryStoryArgs = {
  beforeYaml: string;
  afterYaml: string;
};

/** `meta.component` for the per-case files; every story overrides `render` with its own depth. */
export const NodeChangesSummarySampleStory = ({ beforeYaml, afterYaml }: NodeChangesSummaryStoryArgs) => (
  <JsonSchemaDiffsViewer {...createJsonSchemaDiffsViewerArgs(beforeYaml, afterYaml)} hideUnchangedNodes={false} />
)

type NodeChangesSummaryCaseStoryResult = {
  name: string;
  args: NodeChangesSummaryStoryArgs;
  argTypes: typeof jsonSchemaDiffSampleReadonlyArgTypes;
  render: (args: NodeChangesSummaryStoryArgs) => JSX.Element;
};

/** Renders one node-changes-summary sample case at a specific expand depth. */
export const createNodeChangesSummaryCaseStory = (
  caseSlug: string,
  variantName: string,
  expandedDepth: number,
): NodeChangesSummaryCaseStoryResult => {
  const beforeYaml = beforeBySlug[caseSlug]
  const afterYaml = afterBySlug[caseSlug]
  if (!beforeYaml || !afterYaml) {
    throw new Error(`Sample case not found: ${caseSlug}`)
  }

  return {
    name: variantName,
    args: { beforeYaml, afterYaml },
    argTypes: jsonSchemaDiffSampleReadonlyArgTypes,
    render: (args) => {
      const viewerArgs = createJsonSchemaDiffsViewerArgs(args.beforeYaml, args.afterYaml)
      return <JsonSchemaDiffsViewer {...viewerArgs} expandedDepth={expandedDepth} hideUnchangedNodes={false}/>
    },
  }
}

type NodeChangesSummaryCaseStoryResultWithChangedVariant = NodeChangesSummaryCaseStoryResult & {
  play: (context: { canvasElement: HTMLElement }) => Promise<void>;
};

/**
 * Same as `createNodeChangesSummaryCaseStory`, but also switches oneOf/anyOf combiner nodes to
 * their changed variant on mount (recursing into nested combiners until a leaf is reached), so
 * the story opens accented on the change instead of the combiner's default first option. Use
 * for cases that contain a oneOf/anyOf combiner (cases 5-7) — a safe no-op otherwise. Screenshot
 * ITs do not rely on this `play` function (it does not run under the Puppeteer iframe.html
 * harness); they call `switchCombinerNodesToChangedVariant` directly via `page.evaluate`.
 */
export const createNodeChangesSummaryCaseStoryWithChangedVariant = (
  caseSlug: string,
  variantName: string,
  expandedDepth: number,
): NodeChangesSummaryCaseStoryResultWithChangedVariant => ({
  ...createNodeChangesSummaryCaseStory(caseSlug, variantName, expandedDepth),
  play: async ({ canvasElement }) => {
    await switchCombinerNodesToChangedVariant(canvasElement)
  },
})
