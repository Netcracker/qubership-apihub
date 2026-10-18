import { JsoTreeNodeKinds } from "@apihub/next-data-model/model/jso/types/node-kind";
import { CrawlRules } from "@netcracker/qubership-apihub-json-crawl";
import { JsoWithDiffsCrawlRule } from "./types";
import { mergeComparisonBetweenArrayAndObject } from "../transformers/merge-comparison-between-array-and-object.json-crawl-transformer";

export function getJsoWithDiffsCrawlRules(): CrawlRules<JsoWithDiffsCrawlRule> {
  return {
    '/*': () => getJsoWithDiffsCrawlRules(),
    transformers: [mergeComparisonBetweenArrayAndObject],
    kind: JsoTreeNodeKinds.PROPERTY,
  }
}
