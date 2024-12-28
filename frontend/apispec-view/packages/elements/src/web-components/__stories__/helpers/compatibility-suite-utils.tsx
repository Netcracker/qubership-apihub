import { isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from '@netcracker/qubership-apihub-api-diff'
import { stringifyCyclicJso } from '@netcracker/qubership-apihub-api-unifier'
import { getCompatibilitySuite, TestSpecType } from '@netcracker/qubership-apihub-compatibility-suites'
import { DiffOperationAPI } from '@stoplight/elements/containers/DiffOperationAPI'
import { getCompareResult } from '@stoplight/elements/web-components/__stories__/helpers/getMergedDocument'
import { parse } from '@stoplight/yaml'
import { diffMetaKey } from 'diff-block'
import FontFaceObserver from 'fontfaceobserver'
import { isEmpty } from 'lodash'
import React, { useState } from 'react'

export type OpenapiCompatibilitySuiteStoryArgs = { before: string, after: string }

const FONT_FAMILIES: string[] = ['Inter']

export function StoryComponent({ before, after }: OpenapiCompatibilitySuiteStoryArgs) {
  const { diffs, merged } = getCompareResult(parse(before), parse(after))

  const [fontLoaded, setFontLoaded] = useState(false)

  const promises = FONT_FAMILIES.map(fontFamily => new FontFaceObserver(fontFamily).load(null, 10_000))
  Promise.all(promises).then(() => {
    setFontLoaded(true)
  })

  console.log(stringifyCyclicJso(
    diffs.map(diff => {
      if (isDiffAdd(diff)) {
        const {
          afterDeclarationPaths = [],
          ...rest
        } = diff

        return {
          ...rest,
          ...(!isEmpty(afterDeclarationPaths) ? { afterDeclarationPaths: `[${afterDeclarationPaths.map(path => `[${path.join()}]`).join()}]` } : {}),
        }
      }
      if (isDiffRemove(diff)) {
        const {
          beforeDeclarationPaths = [],
          ...rest
        } = diff

        return {
          ...rest,
          ...(!isEmpty(beforeDeclarationPaths) ? { beforeDeclarationPaths: `[${beforeDeclarationPaths.map(path => `[${path.join()}]`).join()}]` } : {}),
        }
      }
      if (isDiffReplace(diff) || isDiffRename(diff)) {
        const {
          beforeDeclarationPaths = [],
          afterDeclarationPaths = [],
          ...rest
        } = diff

        return {
          ...rest,
          ...(!isEmpty(beforeDeclarationPaths) ? { beforeDeclarationPaths: `[${beforeDeclarationPaths.map(path => `[${path.join()}]`).join()}]` } : {}),
          ...(!isEmpty(afterDeclarationPaths) ? { afterDeclarationPaths: `[${afterDeclarationPaths.map(path => `[${path.join()}]`).join()}]` } : {}),
        }
      }
      return null
    }),
  ))

  if (!fontLoaded) {
    return <></>
  }

  return <DiffOperationAPI mergedDocument={merged} filters={[]} diffMetaKey={diffMetaKey} />
}

export function getStoryArgs(suiteType: TestSpecType, suitId: string, testId: string): OpenapiCompatibilitySuiteStoryArgs {
  const [before, after] = getCompatibilitySuite(suiteType, suitId, testId)
  return { before, after }
}
