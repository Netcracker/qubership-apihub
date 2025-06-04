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

import { stringifyCyclicJso } from '@netcracker/qubership-apihub-api-unifier'
import React, { useState } from 'react'
import FontFaceObserver from 'fontfaceobserver'
import { getCompatibilitySuite, TestSpecType } from '@netcracker/qubership-apihub-compatibility-suites'
import { getCompareResult } from './merged-document'
import { GraphQLOperationDiffViewer } from '../../components/GraphQLOperationViewer/GraphQLOperationDiffViewer'
import { DIFF_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from '../../types/LayoutMode'
import { buildGraphApiSchema } from '../../mocks/utils/graph-api-transformers'
import { buildSchema, findBreakingChanges, findDangerousChanges } from 'graphql'
import { ArrayUtils } from '../../utils/common/arrays'

export type GraphQLCompatibilitySuiteStoryArgs = { before: string, after: string }

const FONT_FAMILIES: string[] = ['Inter']

export function GraphQLStoryComponent({ before, after }: GraphQLCompatibilitySuiteStoryArgs) {
  const { diffs, merged } = getCompareResult(buildGraphApiSchema(before), buildGraphApiSchema(after))

  const [fontLoaded, setFontLoaded] = useState(false)

  const promises = FONT_FAMILIES.map(fontFamily => new FontFaceObserver(fontFamily).load(null, 10_000))
  Promise.all(promises).then(() => {
    setFontLoaded(true)
  })

  if (!fontLoaded) {
    return <></>
  }

  console.log('apihub-diff:', stringifyCyclicJso(
    diffs.map(diff => {
      const {
        beforeDeclarationPaths = [],
        afterDeclarationPaths = [],
        ...rest
      } = { ...diff }

      return {
        ...rest,
        ...(ArrayUtils.isNotEmpty(beforeDeclarationPaths) ? { beforeDeclarationPaths: `[${beforeDeclarationPaths.map(path => `[${path.join()}]`).join()}]` } : {}),
        ...(ArrayUtils.isNotEmpty(afterDeclarationPaths) ? { afterDeclarationPaths: `[${afterDeclarationPaths.map(path => `[${path.join()}]`).join()}]` } : {}),
      }
    }),
  ))

  printGraphQLChanges(before, after)

  return <GraphQLOperationDiffViewer layoutMode={SIDE_BY_SIDE_DIFFS_LAYOUT_MODE} diffMetaKey={DIFF_META_KEY} source={merged} />
}

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

export function getStoryArgs(suiteType: TestSpecType, suitId: string, testId: string): GraphQLCompatibilitySuiteStoryArgs {
  const [before, after] = getCompatibilitySuite(suiteType, suitId, testId)
  return { before, after }
}
