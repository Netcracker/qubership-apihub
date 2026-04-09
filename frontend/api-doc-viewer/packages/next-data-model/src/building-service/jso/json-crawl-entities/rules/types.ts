import { JsoTreeNodeKind } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoTreeCrawlState } from "../state/types";
import { SchemaTransformFunc } from "@apihub/next-data-model/building-service/async-api/json-crawl-entities/transformers/types/types";

export type SchemaCrawlRule<K extends string, S> = {
  kind: K;
  complex?: boolean;
  transformers?: SchemaTransformFunc<S>[];
};

export type JsoCrawlRule = SchemaCrawlRule<JsoTreeNodeKind, JsoTreeCrawlState>;
