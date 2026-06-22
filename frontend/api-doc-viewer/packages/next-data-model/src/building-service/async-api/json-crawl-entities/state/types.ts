import { AsyncApiTreeNodeWithDiffs } from "@apihub/next-data-model/model/async-api/types/aliases"
import { AsyncApiTreeNodeKind } from "@apihub/next-data-model/model/async-api/types/node-kind"
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta"
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value"
import { CommonState } from "../../../abstract/json-crawl-entities/state/types"

export type AsyncApiTreeCrawlState = CommonState<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiTreeNodeMeta
>

export type AsyncApiTreeWithDiffsCrawlState = CommonState<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiTreeNodeMeta,
  AsyncApiTreeNodeWithDiffs
>
