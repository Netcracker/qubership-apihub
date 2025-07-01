import { SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl'
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

    return { value: _value }
  }
}
