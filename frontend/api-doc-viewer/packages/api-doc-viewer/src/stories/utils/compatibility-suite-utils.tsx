/* eslint-disable react-refresh/only-export-components */
import { FONT_FAMILY_INTER_NAME } from '@apihub/constants/fonts'
import { DiffMetaKeys } from '@netcracker/qubership-apihub-api-data-model'
import { Diff, DIFF_META_KEY, DiffReplace, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import { stringifyCyclicJso } from '@netcracker/qubership-apihub-api-unifier'
import { getCompatibilitySuite, SpecificationVersionPair, TestSpecType } from '@netcracker/qubership-apihub-compatibility-suites'
import type { Realm } from '@netcracker/qubership-apihub-ddlapi'
import type { TableKey } from '@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key'
import FontFaceObserver from 'fontfaceobserver'
import { buildSchema, findBreakingChanges, findDangerousChanges } from 'graphql'
import { useEffect, useMemo, useState } from 'react'
import { DdlTableDiffsViewer } from '../../components/DdlTableViewer/DdlTableDiffsViewer'
import { GraphQLOperationDiffViewer } from '../../components/GraphQLOperationViewer/GraphQLOperationDiffViewer'
import { OpenApiOperationDiffsViewer } from '../../components/OpenApiOperationViewer/OpenApiOperationDiffsViewer'
import { buildGraphApiSchema } from '../../mocks/utils/graph-api-transformers'
import { DETAILED_DISPLAY_MODE, DisplayMode } from '../../types/DisplayMode'
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from '../../types/LayoutMode'
import { ArrayUtils } from '../../utils/common/arrays'
import { ddlStoryNavigationLinkBuilder } from '../ddlapi-suite/ddl-story-navigation'
import { AUTO_SWITCH_DEFAULT_ARGS, type AutoSwitchArgs } from '../shared/auto-switch'
import { TEST_DIFF_META_KEYS } from '../shared/test-diff-meta-keys'
import {
  prepareDdlCompatibilitySuiteMergedSource,
  resolveDdlCompatibilitySuiteTableKey,
} from './compatibility-suite-utils-ddl'
import { mergeOpenApiDocuments } from '../preprocess'
import { resolveOpenApiCompatibilitySuiteOperationKeys } from './compatibility-suite-utils-openapi'
import { getCompareResult } from './merged-document'
import { parseYamlSource } from './parse-yaml-source'

// The renamed @font-face family (CSS isolation): waiting for plain 'Inter' never resolves.
const FONT_FAMILIES: string[] = [FONT_FAMILY_INTER_NAME]

function useFontLoaded(): boolean {
  const [fontLoaded, setFontLoaded] = useState(false)
  const promises = FONT_FAMILIES.map(fontFamily => new FontFaceObserver(fontFamily).load(null, 10_000))
  Promise.all(promises).then(() => {
    setFontLoaded(true)
  })
  return fontLoaded
}

// GraphQL

export type GraphQLCompatibilitySuiteStoryArgs = { before: string; after: string }

const DIFF_META_KEYS: DiffMetaKeys = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

export function GraphQLStoryComponent({ before, after }: GraphQLCompatibilitySuiteStoryArgs) {
  const { merged } = getCompareResult(
    buildGraphApiSchema(before),
    buildGraphApiSchema(after),
  )

  const fontLoaded = useFontLoaded()

  if (!fontLoaded) {
    return <></>
  }

  return (
    <GraphQLOperationDiffViewer
      layoutMode={SIDE_BY_SIDE_DIFFS_LAYOUT_MODE}
      metaKeys={DIFF_META_KEYS}
      source={merged}
    />
  )
}

export function getGraphQLStoryArgs(
  suiteType: TestSpecType,
  suiteId: string,
  testId: string,
): GraphQLCompatibilitySuiteStoryArgs {
  const [before, after] = getCompatibilitySuite(suiteType, suiteId, testId)
  return { before, after }
}

// DDL API

export type DdlCompatibilitySuiteStoryArgs = {
  before: string
  after: string
}

export function DdlStoryComponent({ before, after }: DdlCompatibilitySuiteStoryArgs) {
  const [mergedSource, setMergedSource] = useState<Realm | undefined>(undefined)
  const [tableKey, setTableKey] = useState<TableKey | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    setMergedSource(undefined)
    setTableKey(undefined)

    void prepareDdlCompatibilitySuiteMergedSource(before, after)
      .then(merged => {
        if (!cancelled) {
          setMergedSource(merged)
          setTableKey(resolveDdlCompatibilitySuiteTableKey(merged))
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          console.error(cause)
        }
      })

    return () => {
      cancelled = true
    }
  }, [before, after])

  if (!mergedSource || !tableKey) {
    return <></>
  }

  return (
    <DdlTableDiffsViewer
      mergedSource={mergedSource}
      tableKey={tableKey}
      navigationLinkBuilder={ddlStoryNavigationLinkBuilder}
      diffMetaKeys={TEST_DIFF_META_KEYS}
      devMode
    />
  )
}

export function getDdlStoryArgs(
  suiteType: TestSpecType,
  suiteId: string,
  testId: string,
): DdlCompatibilitySuiteStoryArgs {
  const [before, after] = getCompatibilitySuite(suiteType, suiteId, testId)
  return { before, after }
}

// OpenAPI

export type OpenApiCompatibilitySuiteStoryArgs = AutoSwitchArgs & {
  before: string
  after: string
  displayMode: DisplayMode
  /** `false`: every row shows, as in the OpenAPI Operation Diffs Suite. */
  hideUnchangedNodes: boolean
}

/**
 * One operation of the merged case (the added / removed one when the case has two), side by side.
 * Design: docs/design/openapi/features/compatibility-suite.md
 */
export function OpenApiStoryComponent({ before, after, displayMode, hideUnchangedNodes }: OpenApiCompatibilitySuiteStoryArgs) {
  const { mergedSource, operationKeys } = useMemo(() => {
    const merged = mergeOpenApiDocuments(parseYamlSource(before), parseYamlSource(after))
    return { mergedSource: merged, operationKeys: resolveOpenApiCompatibilitySuiteOperationKeys(merged) }
  }, [before, after])

  const fontLoaded = useFontLoaded()

  if (!fontLoaded) {
    return <></>
  }

  return (
    <OpenApiOperationDiffsViewer
      mergedSource={mergedSource}
      operationKeys={operationKeys}
      diffMetaKeys={DIFF_META_KEYS}
      displayMode={displayMode}
      hideUnchangedNodes={hideUnchangedNodes}
      devMode
    />
  )
}

/** `specificationVersionPair`: the OAS versions the case is patched to (its version-pair group). */
export function getOpenApiStoryArgs(
  suiteType: TestSpecType,
  suiteId: string,
  testId: string,
  specificationVersionPair?: SpecificationVersionPair,
): OpenApiCompatibilitySuiteStoryArgs {
  const [before, after] = getCompatibilitySuite(suiteType, suiteId, testId, specificationVersionPair)
  return { before, after, displayMode: DETAILED_DISPLAY_MODE, hideUnchangedNodes: false, ...AUTO_SWITCH_DEFAULT_ARGS }
}

// Debug helpers

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printDiffs(diffs: Diff[]) {
  console.log(
    'apihub-diff:',
    stringifyCyclicJso(
      diffs.map(diff => {
        const {
          beforeDeclarationPaths = [],
          afterDeclarationPaths = [],
          ...rest
        } = { ...diff } as DiffReplace // TODO 14.10.25 // Get rid of this because casting isn't a good solution

        return {
          ...rest,
          ...(ArrayUtils.isNotEmpty(beforeDeclarationPaths)
            ? { beforeDeclarationPaths: `[${beforeDeclarationPaths.map(path => `[${path.join()}]`).join()}]` }
            : {}),
          ...(ArrayUtils.isNotEmpty(afterDeclarationPaths)
            ? { afterDeclarationPaths: `[${afterDeclarationPaths.map(path => `[${path.join()}]`).join()}]` }
            : {}),
        }
      }),
    ),
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printGraphQLChanges(before: string, after: string) {
  const beforeSchema = buildSchema(before, { noLocation: true })
  const afterSchema = buildSchema(after, { noLocation: true })

  const breakingChanges = findBreakingChanges(beforeSchema, afterSchema)
  const dangerousChanges = findDangerousChanges(beforeSchema, afterSchema)

  console.log('GraphQL Changes:')
  if (ArrayUtils.isNotEmpty(breakingChanges)) {
    console.log('Breaking Changes:', breakingChanges.map(change => `\n${change.description}`).join())
  } else {
    console.log('No Breaking Changes')
  }
  if (ArrayUtils.isNotEmpty(dangerousChanges)) {
    console.log('Dangerous Changes:', dangerousChanges.map(change => `\n${change.description}`).join())
  } else {
    console.log('No Dangerous Changes')
  }
}
