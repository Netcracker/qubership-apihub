import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { JsonPath } from "@netcracker/qubership-apihub-json-crawl"
import { AbstractNodeDiffsAggregator } from "./building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator"

export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return isObjective(value) && !Array.isArray(value)
}

export function isObjective(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null
}

export function isObjectWithStringKeys(value: unknown): value is Record<string, unknown> {
  return isObject(value) && Object.keys(value).every(key => typeof key === 'string')
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function getValueByPath(source: unknown, path: JsonPath, referenceNamePropertyKey?: symbol): unknown {
  let currentValue: unknown = source
  let isArrayTraversal = false

  for (const pathSegment of path) {
    if (!isObject(currentValue) && !isArray(currentValue)) {
      return undefined
    }

    if (isArrayTraversal) {
      let matchedElement
      if (isObjective(currentValue)) {
        matchedElement = currentValue[pathSegment]
      }
      if (!matchedElement && isArray(currentValue) && referenceNamePropertyKey) {
        matchedElement = currentValue.find((element) =>
          isObject(element) && element[referenceNamePropertyKey] === pathSegment
        )
      }
      currentValue = matchedElement
      isArrayTraversal = false
      continue
    }

    const currentNode = currentValue as Record<PropertyKey, unknown>
    currentValue = currentNode[pathSegment]
    if (isArray(currentValue)) {
      isArrayTraversal = true
    }
  }

  return currentValue
}

export function findKeyByValue(object: Record<PropertyKey, unknown>, value: unknown): PropertyKey | undefined {
  return Object.keys(object).find((key) => object[key] === value)
}

export function takeIfDiffsRecord(maybeDiffsRecord: unknown): Partial<Record<string, Diff>> | undefined {
  if (!AbstractNodeDiffsAggregator.isDiffsRecord(maybeDiffsRecord)) {
    return undefined
  }
  return maybeDiffsRecord
}
