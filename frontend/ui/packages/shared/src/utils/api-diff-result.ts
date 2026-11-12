import type { CompareResult, Diff } from '@netcracker/qubership-apihub-api-diff'
import { apiDiff, COMPARE_MODE_OPERATION } from '@netcracker/qubership-apihub-api-diff'
import { removeComponents } from '@netcracker/qubership-apihub-api-processor'
import { isObject } from 'lodash-es'
import type { Dispatch, SetStateAction } from 'react'
import type { OperationChange } from '../entities/operation-changelog'
import { NORMALIZE_OPTIONS } from './normalize'

//todo think about types instead any
/* eslint-disable @typescript-eslint/no-explicit-any */

type DiffResultOptions = {
  beforeData?: object
  afterData?: object
  metaKey?: symbol
  setApiDiffLoading?: Dispatch<SetStateAction<boolean>>
}

export const getApiDiffResult = (options: DiffResultOptions): CompareResult | undefined => {
  const {
    beforeData,
    afterData,
    metaKey,
    setApiDiffLoading,
  } = options
  if (!beforeData && !afterData) {
    setApiDiffLoading?.(false)
    return undefined
  }
  let beforeOperation = removeComponents(beforeData)
  let afterOperation = removeComponents(afterData)

  if (!beforeData && afterData) {
    beforeOperation = getCopyWithEmptyPath(afterOperation)
  }

  if (beforeData && !afterData) {
    afterOperation = getCopyWithEmptyPath(beforeOperation)
  }

  // Used similar options like in builder
  const diffResult = apiDiff(
    beforeOperation,
    afterOperation,
    {
      ...NORMALIZE_OPTIONS,
      metaKey: metaKey,
      mode: COMPARE_MODE_OPERATION,
      beforeSource: beforeData,
      afterSource: afterData,
    },
  )

  // due to the fact that we should not see the placeholder at the moment when apiDiff completes the comparison,
  // but BE has not yet sent semi-breaking changes
  setTimeout(() => setApiDiffLoading?.(false), 50)
  return diffResult
}

function getCopyWithEmptyPath(template: unknown): unknown {
  if (isObject(template)) {
    // REST API
    if ('paths' in template) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { paths, ...rest } = template
      const emptyOperation: any = rest
      emptyOperation.paths = {}
      return rest
    }

    // Graph API
    if ('queries' in template) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { queries, ...rest } = template
      const emptyOperation: any = rest
      emptyOperation.queries = {}
      return rest
    }
    if ('mutations' in template) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mutations, ...rest } = template
      const emptyOperation: any = rest
      emptyOperation.mutations = {}
      return rest
    }
    if ('subscriptions' in template) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { subscriptions, ...rest } = template
      const emptyOperation: any = rest
      emptyOperation.subscriptions = {}
      return rest
    }
  }

  return template
}

export const createDiffMap = (
  originalArray: Diff[] | OperationChange[],
  by: ((item: any) => any)): Map<string[], Diff | OperationChange[]> => {
  const diffMap = new Map()

  for (const item of originalArray) {
    const key = by(item)
    if (!key || diffMap.has(key)) {
      continue
    }

    diffMap.set(key, item)
  }

  return diffMap
}
