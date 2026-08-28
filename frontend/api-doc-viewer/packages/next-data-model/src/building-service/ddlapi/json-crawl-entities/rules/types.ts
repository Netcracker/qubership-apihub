import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeCrawlState } from "../state/types";
import { DdlApiTransformFunc } from "../transformers/types/types";

export type DdlApiSchemaCrawlRule<K extends string, S> = {
  kind: K;
  complex?: boolean;
  transformers?: DdlApiTransformFunc<S>[];
};

export type DdlApiCrawlRule<S extends DdlApiTreeCrawlState = DdlApiTreeCrawlState> =
  DdlApiSchemaCrawlRule<DdlApiTreeNodeKind, S>;
