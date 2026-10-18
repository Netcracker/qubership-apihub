/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable react-refresh/only-export-components */
import { DiffMetaKeys } from '@netcracker/qubership-apihub-api-data-model'
import { Diff, DIFF_META_KEY, DiffReplace, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import { stringifyCyclicJso } from '@netcracker/qubership-apihub-api-unifier'
import { getCompatibilitySuite, TestSpecType } from '@netcracker/qubership-apihub-compatibility-suites'
import FontFaceObserver from 'fontfaceobserver'
import { buildSchema, findBreakingChanges, findDangerousChanges } from 'graphql'
import { useState } from 'react'
import { GraphQLOperationDiffViewer } from '../../components/GraphQLOperationViewer/GraphQLOperationDiffViewer'
import { buildGraphApiSchema } from '../../mocks/utils/graph-api-transformers'
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from '../../types/LayoutMode'
import { ArrayUtils } from '../../utils/common/arrays'
import { getCompareResult } from './merged-document'

const FONT_FAMILIES: string[] = ['Inter']

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
