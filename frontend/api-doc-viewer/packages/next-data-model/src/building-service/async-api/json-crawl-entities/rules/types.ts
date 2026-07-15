import { AsyncApiTreeNodeKind } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeCrawlState, AsyncApiTreeWithDiffsCrawlState } from "../state/types";
import { SchemaTransformFunc } from "../transformers/types/types";

export type SchemaCrawlRule<K extends string, S> = {
  kind: K;
  complex?: boolean;
  transformers?: SchemaTransformFunc<S>[];
};

export type AsyncApiCrawlRule<S extends AsyncApiTreeCrawlState = AsyncApiTreeCrawlState> =
  SchemaCrawlRule<AsyncApiTreeNodeKind, S>;

export type AsyncApiTreeWithDiffsCrawlRule =
  AsyncApiCrawlRule<AsyncApiTreeWithDiffsCrawlState>;
