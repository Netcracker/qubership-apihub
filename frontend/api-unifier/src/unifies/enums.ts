import { UnifyFunction } from '../types'
import { isArray } from '@netcracker/qubership-apihub-json-crawl'
import { deepEqual } from 'fast-equals'
import { removeDuplicatesWithMergeOrigins } from '../utils'

export const unifyJsonSchemaEnums: UnifyFunction = (jso, ctx) => {
  if (!isArray(jso)) {
    return jso
  }

  return removeDuplicatesWithMergeOrigins(jso, ctx.options.originsFlag, deepEqual)
}

