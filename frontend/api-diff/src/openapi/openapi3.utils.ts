import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

import { type CompareContext } from '../types'
import { isString } from '../utils'

export const emptySecurity = (value?: unknown) => {
  if (!Array.isArray(value)) { return false }

  return !!value && (value.length === 0 || (value.length === 1 && Object.keys(value[0]).length === 0))
}

export const includeSecurity = (value: unknown = [], items: unknown = []) => {
  if (!Array.isArray(value) || !Array.isArray(items) || items.length === 0) { return false }

  // TODO match security schema
  const valueSet = new Set(value.map((item) => Object.keys(item)[0]))

  for (const item of items) {
    if (!valueSet.has(Object.keys(item)[0])) { return false }
  }

  return true
}

const extractPathContext = (ctx: CompareContext, jumpsToPathLevel: number): CompareContext | undefined => {
  let context: CompareContext | undefined = ctx
  for (let i = 0; i < jumpsToPathLevel; i++) {
    context = context?.parentContext
  }
  return context
}

const extractPaths = (ctx: CompareContext, jumpsToPathLevel: number): [PropertyKey, PropertyKey] | undefined => {
  const pathContext = extractPathContext(ctx, jumpsToPathLevel)
  if (!pathContext) {
    return
  }

  const { before: { key: pathBefore }, after: { key: pathAfter } } = pathContext
  return [pathBefore, pathAfter]
}

export const mapPathParams = (ctx: CompareContext, jumpsToPathLevel: number): Record<string, string> => {
  const [pathBefore, pathAfter] = extractPaths(ctx, jumpsToPathLevel) ?? []
  if (!isString(pathBefore) || !isString(pathAfter)) {
    return {}
  }

  const beforeParams = [...pathBefore.matchAll(new RegExp('{(.*?)}', 'g'))].map((arr) => arr.pop()) as string[]
  const afterParams = [...pathAfter.matchAll(new RegExp('{(.*?)}', 'g'))].map((arr) => arr.pop()) as string[]

  const result: Record<string, string> = {}
  for (let i = 0; i < beforeParams.length && i < afterParams.length; i++) {
    result[beforeParams[i]] = afterParams[i]
  }

  return result
}

export const isResponseSchema = (path: JsonPath) => {
  return path[3] === 'responses' && path[7] === 'schema'
}

export const isRequestBodySchema = (path: JsonPath) => {
  return path[3] === 'requestBody' && path[6] === 'schema'
}

export const isParameterSchema = (path: JsonPath) => {
  return (path[2] === 'parameters' && path[4] === 'schema') || (path[3] === 'parameters' && path[5] === 'schema')
}
