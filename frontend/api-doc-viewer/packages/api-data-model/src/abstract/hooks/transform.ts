import { isObject, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl'
import { TRANSFORMED_FROM } from '../constants'
import { SchemaCrawlRule, SchemaTransformFunc } from '../types'

export function createTransformCrawlHook<T extends object>(
  source: unknown
): SyncCrawlHook<T, SchemaCrawlRule<any, any>> {
  return ({ value, path, state, rules }) => {
    if (!rules || !Array.isArray(rules.transformers) || Array.isArray(value)) {
      return
    }

    const jsonSchemaTransformers: SchemaTransformFunc<any>[] = rules.transformers ?? []
    const _value = jsonSchemaTransformers.reduce(
      (current, transformer) => {
        return transformer(current, source, path, state)
      },
      value as any
    )

    if (_value !== value && isObject(_value) && isObject(value)) {
      // keep the link to the crawled value, otherwise cycle detection (which is identity based) breaks
      Object.defineProperty(_value, TRANSFORMED_FROM, { value: value, enumerable: false })
    }

    return { value: _value }
  }
}
