import { OpenApiTreeNodeKind } from "../../../../model/openapi/types/node-kind"
import { OpenApiTreeNodeMeta } from "../../../../model/openapi/types/node-meta"
import { OpenApiTreeNodeValue } from "../../../../model/openapi/types/node-value"
import { CommonState } from "../../../abstract/json-crawl-entities/state/types"

export type OpenApiTreeCrawlState = CommonState<
  OpenApiTreeNodeValue<OpenApiTreeNodeKind> | null,
  OpenApiTreeNodeKind,
  OpenApiTreeNodeMeta
>
