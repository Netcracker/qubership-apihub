import { DdlApiTreeNodeWithDiffs } from "@apihub/next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind"
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta"
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value"
import { CommonState } from "../../../abstract/json-crawl-entities/state/types"

export type DdlApiTreeCrawlState = CommonState<
  DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta
>

export type DdlApiTreeWithDiffsCrawlState = CommonState<
  DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta,
  DdlApiTreeNodeWithDiffs
>
