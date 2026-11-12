// TODO: Rename file
import { merge } from 'lodash-es'
import { safeParse } from '@stoplight/json'
import { isObject } from './objects'

//todo copy-paste from ADV and builder
export const getJsonValue = (source: unknown, ...path: PropertyKey[]): unknown => {
  if (!isObject(source)) {
    return undefined
  }

  let result: unknown = source
  for (const pathItem of path) {
    if (isObject(result) && pathItem in result) {
      result = result[pathItem]
      continue
    }
    return undefined
  }

  return result
}

export function getSchema(content: string | undefined): object | undefined {
  if (!content) {
    return undefined
  }
  return merge(safeParse(content))
}
