import { isDiff } from "@netcracker/qubership-apihub-api-data-model";
import { DiffMetaRecord, Diff } from "@netcracker/qubership-apihub-api-diff";
import { GRAPH_API_DIRECTIVE_DEPRECATED_DEFAULT_REASON } from "@netcracker/qubership-apihub-graphapi";
import { isObject } from "@netcracker/qubership-apihub-json-crawl";

export function changesToChange(valuesLength: number, changes: DiffMetaRecord): Diff | undefined {
  const changeValues: (Diff | DiffMetaRecord)[] = Object.values(changes)
  if (!changeValues.length || changeValues.length !== valuesLength) {
    return undefined
  }
  const first = changeValues[0]
  // TODO 04.12.24 // What should we do?
  if (!isDiff(first)) {
    return undefined
  }
  for (let i = 1; i < changeValues.length; i++) {
    if (changeValues[i].action !== first.action) {
      return undefined
    }
  }
  return first
}

export function isObjectWithoutPayload(value: unknown): boolean {
  if (!isObject(value)) {
    return false
  }
  return Object
    .values(value)
    .every(v => (
      isObject(v) && (
        Object.keys(v).length === 0 ||
        isObjectWithoutPayload(v)
      )
    ))
}

export function isDefaultDeprecationReason(value?: string): boolean {
  return value === GRAPH_API_DIRECTIVE_DEPRECATED_DEFAULT_REASON
}
