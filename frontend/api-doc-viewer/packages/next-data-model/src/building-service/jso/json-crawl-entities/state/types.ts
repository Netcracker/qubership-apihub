import { CommonState } from "@apihub/next-data-model/building-service/abstract/json-crawl-entities/state/types"
import { JsoTreeNodeValueWithDiffs } from "@apihub/next-data-model/model/jso/tree-with-diffs/node-value"
import { JsoTreeNodeValue } from "@apihub/next-data-model/model/jso/tree/node-value"
import { JsoTreeNodeWithDiffs } from "@apihub/next-data-model/model/jso/types/aliases"
import { JsoTreeNodeKind } from "@apihub/next-data-model/model/jso/types/node-kind"
import { JsoTreeNodeMeta } from "@apihub/next-data-model/model/jso/types/node-meta"

type DiffMetaKeys = {
  diffsMetaKey: symbol;
  aggregatedDiffsMetaKey: symbol;
}

export type JsoTreeCrawlState = CommonState<
  JsoTreeNodeValue | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta
>

export type JsoTreeWithDiffsCrawlState = CommonState<
  JsoTreeNodeValueWithDiffs | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta,
  JsoTreeNodeWithDiffs
> & {
  diffMetaKeys: DiffMetaKeys
}