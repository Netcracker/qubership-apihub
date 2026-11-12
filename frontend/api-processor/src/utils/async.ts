import { normalize } from '@netcracker/qubership-apihub-api-unifier'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { FIRST_REFERENCE_KEY_PROPERTY, INLINE_REFS_FLAG } from '../consts'
import { removeComponents } from './operations.utils'

export async function asyncFunction(fun: () => void): Promise<null> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        fun()
        resolve(null)
      } catch (error) {
        reject(error)
      }
    }),
  )
}

export function normalizeAsyncApiToRefsDocument(sourceDocument: AsyncAPIV3.AsyncAPIObject): AsyncAPIV3.AsyncAPIObject {
  return normalize(
    removeComponents(sourceDocument),
    {
      mergeAllOf: false,
      firstReferenceKeyProperty: FIRST_REFERENCE_KEY_PROPERTY,
      inlineRefsFlag: INLINE_REFS_FLAG,
      source: sourceDocument,
    },
  ) as AsyncAPIV3.AsyncAPIObject
}
