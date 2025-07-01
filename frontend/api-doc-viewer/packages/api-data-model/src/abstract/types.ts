import { JsonPath } from '@netcracker/qubership-apihub-json-crawl';

export type SchemaTransformFunc<S> = (value: unknown, source: unknown, path: JsonPath, state: S) => any

export type SchemaCrawlRule<K extends string, S> = {
  kind: K
  transformers?: SchemaTransformFunc<S>[]
}
