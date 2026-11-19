import { CrawlRules } from "@netcracker/qubership-apihub-json-crawl"
import { OpenApiTreeNodeKind, OpenApiTreeNodeKinds } from "../../../../model/openapi/types/node-kind"
import { getSecurityCrawlRules } from "../../../security/json-crawl-entities/rules"
import { OpenApiTreeCrawlState } from "../state/types"
import { collectOpenApiRawValues } from "../transformers/collect-raw-values"
import { OpenApiCrawlRule } from "./types"

/**
 * Crawl rules over the operation-oriented spec. Segments without `kind` only route the crawl;
 * keys without rules stop it, so schemas and extension values stay raw on their nodes.
 * Selector containers are COMPLEX and their options nested nodes: `responses` (codes), `content`
 * (media types) and the shared `securityAlternatives` (docs/design/shared/features/selector-options.md).
 */
export function getOpenApiCrawlRules<S extends OpenApiTreeCrawlState = OpenApiTreeCrawlState>(
  kind: OpenApiTreeNodeKind,
): CrawlRules<OpenApiCrawlRule<S>> {
  const extensionsRule = { kind: OpenApiTreeNodeKinds.EXTENSIONS, transformers: [collectOpenApiRawValues] }
  const contentRule = {
    '/*': { kind: OpenApiTreeNodeKinds.MEDIA_TYPE },
    kind: OpenApiTreeNodeKinds.CONTENT,
    complex: true,
  }
  return {
    '/data': {
      '/security': getSecurityCrawlRules(),
      '/extensions': extensionsRule,
      '/request': {
        '/parameters': {
          '/*': { kind: OpenApiTreeNodeKinds.PARAMETERS },
        },
        '/requestBody': {
          '/content': contentRule,
          kind: OpenApiTreeNodeKinds.REQUEST_BODY,
        },
        kind: OpenApiTreeNodeKinds.REQUEST,
      },
      '/responses': {
        '/*': {
          '/headers': { kind: OpenApiTreeNodeKinds.RESPONSE_HEADERS },
          '/extensions': extensionsRule,
          '/content': contentRule,
          kind: OpenApiTreeNodeKinds.RESPONSE,
        },
        kind: OpenApiTreeNodeKinds.RESPONSES,
        complex: true,
      },
      '/responsesExtensions': extensionsRule,
    },
    kind,
  }
}
