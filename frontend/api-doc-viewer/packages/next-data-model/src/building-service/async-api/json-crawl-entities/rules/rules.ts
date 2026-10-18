import { CrawlRules } from "@netcracker/qubership-apihub-json-crawl";
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds } from "../../../../model/async-api/types/node-kind";
import { AsyncApiTreeCrawlState } from "../state/types";
import { collectRawValues } from "../transformers/collect-raw-values";
import { inlineBindingParameters } from "../transformers/inline-binding-params";
import { unifyParamsWithSchema } from "../transformers/unify-params-with-schema";
import { AsyncApiCrawlRule } from "./types";

export function getAsyncApiCrawlRules<S extends AsyncApiTreeCrawlState = AsyncApiTreeCrawlState>(
  kind: AsyncApiTreeNodeKind
): CrawlRules<AsyncApiCrawlRule<S>> {
  return {
    '/data': {
      '/content': () => getAsyncApiCrawlRules(AsyncApiTreeNodeKinds.MESSAGE_CONTENT),
      '/channel': () => getAsyncApiCrawlRules(AsyncApiTreeNodeKinds.MESSAGE_CHANNEL),
      '/operation': () => getAsyncApiCrawlRules(AsyncApiTreeNodeKinds.MESSAGE_OPERATION),
      kind: AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR,
      complex: true,
    },
    // Channel Parameters
    '/parameters': {
      kind: AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS,
      transformers: [collectRawValues],
    },
    '/servers': {
      '/*': () => getAsyncApiCrawlRules(AsyncApiTreeNodeKinds.SERVER),
      kind: AsyncApiTreeNodeKinds.SERVERS,
    },
    // Message/Channel/Operation Extensions
    '/extensions': {
      kind: AsyncApiTreeNodeKinds.EXTENSIONS,
      transformers: [collectRawValues],
    },
    // Message/Channel/Operation Bindings
    '/bindings': {
      '/*': {
        kind: AsyncApiTreeNodeKinds.BINDING,
        transformers: [inlineBindingParameters],
      },
      kind: AsyncApiTreeNodeKinds.BINDINGS,
      complex: true,
    },
    // Message Content
    '/headers': {
      kind: AsyncApiTreeNodeKinds.MESSAGE_HEADERS,
      transformers: [unifyParamsWithSchema],
    },
    '/payload': {
      kind: AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD,
      transformers: [unifyParamsWithSchema],
    },
    kind,
  }
}
