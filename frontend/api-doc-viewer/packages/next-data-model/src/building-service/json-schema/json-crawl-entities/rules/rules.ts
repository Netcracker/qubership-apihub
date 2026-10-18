import { CrawlRules } from "@netcracker/qubership-apihub-json-crawl"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { jsonSchemaNodeKind } from "@apihub/next-data-model/shared/json-schema/constants"
import { isNumber } from "@apihub/next-data-model/utilities"
import { jsonSchemaTransformers } from "../transformers/transformers"
import { JsonSchemaCrawlRule } from "./types"
import { JsonSchemaTreeCrawlState } from "../state/types"

export function getJsonSchemaCrawlRules<S extends JsonSchemaTreeCrawlState = JsonSchemaTreeCrawlState>(
  kind: JsonSchemaTreeNodeKind = jsonSchemaNodeKind.root,
): CrawlRules<JsonSchemaCrawlRule<S>> {
  return {
    "/allOf": {
      "/*": () => getJsonSchemaCrawlRules(jsonSchemaNodeKind.allOf),
    },
    "/oneOf": {
      "/*": () => getJsonSchemaCrawlRules(jsonSchemaNodeKind.oneOf),
    },
    "/anyOf": {
      "/*": () => getJsonSchemaCrawlRules(jsonSchemaNodeKind.anyOf),
    },
    "/properties": {
      "/*": () => getJsonSchemaCrawlRules(jsonSchemaNodeKind.property),
    },
    "/items": () => ({
      ...getJsonSchemaCrawlRules(jsonSchemaNodeKind.items),
      "/*": ({ key }) => isNumber(key) ? getJsonSchemaCrawlRules(jsonSchemaNodeKind.item) : {},
    }),
    "/additionalProperties": () => getJsonSchemaCrawlRules(jsonSchemaNodeKind.additionalProperties),
    "/additionalItems": () => getJsonSchemaCrawlRules(jsonSchemaNodeKind.additionalItems),
    "/patternProperties": {
      "/*": () => getJsonSchemaCrawlRules(jsonSchemaNodeKind.patternProperty),
    },
    kind,
    transformers: jsonSchemaTransformers,
  }
}
