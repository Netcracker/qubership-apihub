import { JsoTreeNodeKinds } from "@apihub/next-data-model/model/jso/types/node-kind";
import { CrawlRules } from "@netcracker/qubership-apihub-json-crawl";
import { JsoCrawlRule } from "./types";
import { inlineJsoPropertyParameters } from "../transformers/inline-jso-property-params";

export function getJsoCrawlRules(): CrawlRules<JsoCrawlRule> {
  return {
    '/value': () => ({
      '/*': () => getJsoCrawlRules(),
    }),
    transformers: [inlineJsoPropertyParameters],
    kind: JsoTreeNodeKinds.PROPERTY,
  }
}
