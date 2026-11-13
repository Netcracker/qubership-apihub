import { isObject } from '@netcracker/qubership-apihub-api-data-model'

export function safePropertyIn(value: unknown, key: PropertyKey, context?: string): boolean {
  try {
    return !!value && typeof value === 'object' && key in value
  } catch (error) {
    console.error(`[Caught Error] In ${context ?? 'safePropertyIn'}:`, error, 'on value:', value)
    return false
  }
}

export class ObjectUtils {

  public static get(source: unknown, path: PropertyKey[] = []): unknown {
    if (!isObject(source)) {
      return undefined
    }

    let result: unknown = source
    for (const pathItem of path) {
      if (isObject(result) && safePropertyIn(result, pathItem, 'ObjectUtils.get')) {
        result = result[pathItem]
        continue
      }
      return undefined
    }
    return result
  }

}