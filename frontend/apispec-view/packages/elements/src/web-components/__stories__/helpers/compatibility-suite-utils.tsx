import { getCompatibilitySuite, TestSpecType } from '@netcracker/qubership-apihub-compatibility-suites'
import { DiffOperationAPI } from '@stoplight/elements/containers/DiffOperationAPI'
import { getCompareResult } from '@stoplight/elements/web-components/__stories__/helpers/getMergedDocument'
import { parse } from '@stoplight/yaml'
import { aggregatedDiffMetaKey, diffMetaKey } from 'diff-block'
import FontFaceObserver from 'fontfaceobserver'
import React, { useState } from 'react'
import { stringifyDiffs } from '@stoplight/elements/web-components/__stories__/helpers/stringifyDiffs'

export type OpenapiCompatibilitySuiteStoryArgs = { before: string, after: string }

const FONT_FAMILIES: string[] = ['Inter']

export function StoryComponent({ before, after }: OpenapiCompatibilitySuiteStoryArgs) {
  const { diffs, merged } = getCompareResult(parse(before), parse(after))

  const [fontLoaded, setFontLoaded] = useState(false)

  const promises = FONT_FAMILIES.map(fontFamily => new FontFaceObserver(fontFamily).load(null, 10_000))
  Promise.all(promises).then(() => {
    setFontLoaded(true)
  })

  console.log(stringifyDiffs(diffs))

  if (!fontLoaded) {
    return <></>
  }

  return (
    <DiffOperationAPI
      mergedDocument={merged}
      filters={[]}
      metaKeys={{
        diffsMetaKey: diffMetaKey,
        aggregatedDiffsMetaKey: aggregatedDiffMetaKey
      }}
    />
  )
}

export function getStoryArgs(suiteType: TestSpecType, suitId: string, testId: string): OpenapiCompatibilitySuiteStoryArgs {
  const [before, after] = getCompatibilitySuite(suiteType, suitId, testId)
  return { before, after }
}
