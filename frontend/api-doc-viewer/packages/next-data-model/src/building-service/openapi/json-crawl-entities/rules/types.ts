import { JsonPath } from "@netcracker/qubership-apihub-json-crawl"
import { OpenApiTreeNodeKind } from "../../../../model/openapi/types/node-kind"
import { OpenApiTreeCrawlState } from "../state/types"

export type OpenApiSchemaTransformFunc<S> = (
  key: PropertyKey,
  value: unknown,
  source: unknown,
  path: JsonPath,
  state: S,
) => unknown

export type OpenApiCrawlRule<S extends OpenApiTreeCrawlState = OpenApiTreeCrawlState> = {
  kind: OpenApiTreeNodeKind
  complex?: boolean
  transformers?: OpenApiSchemaTransformFunc<S>[]
}
