import { JsonPath } from "@netcracker/qubership-apihub-json-crawl"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeCrawlState } from "../state/types"

export type SchemaTransformFunc<S> = (
  key: PropertyKey,
  value: unknown,
  source: unknown,
  path: JsonPath,
  state: S,
) => unknown

export type JsonSchemaSchemaCrawlRule<K extends string, S> = {
  kind: K
  complex?: boolean
  transformers?: SchemaTransformFunc<S>[]
}

export type JsonSchemaCrawlRule<S extends JsonSchemaTreeCrawlState = JsonSchemaTreeCrawlState> =
  JsonSchemaSchemaCrawlRule<JsonSchemaTreeNodeKind, S>
