import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeCrawlState, DdlApiTreeWithDiffsCrawlState } from "../state/types";
import { DdlApiTransformFunc } from "../transformers/types/types";

export type DdlApiSchemaCrawlRule<K extends string, S> = {
  kind: K;
  complex?: boolean;
  transformers?: DdlApiTransformFunc<S>[];
};

export type DdlApiCrawlRule<S extends DdlApiTreeCrawlState = DdlApiTreeCrawlState> =
  DdlApiSchemaCrawlRule<DdlApiTreeNodeKind, S>;

export type DdlApiTreeWithDiffsCrawlRule =
  DdlApiCrawlRule<DdlApiTreeWithDiffsCrawlState>;
