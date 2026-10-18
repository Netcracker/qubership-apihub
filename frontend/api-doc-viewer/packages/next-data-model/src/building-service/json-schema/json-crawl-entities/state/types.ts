import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeMeta } from "@apihub/next-data-model/model/json-schema/types/node-meta"
import { CommonState } from "@apihub/next-data-model/building-service/abstract/json-crawl-entities/state/types"

export type JsonSchemaTreeCrawlState = CommonState<
  JsonSchemaTreeNodeStoredValue | null,
  JsonSchemaTreeNodeKind,
  JsonSchemaTreeNodeMeta
>
