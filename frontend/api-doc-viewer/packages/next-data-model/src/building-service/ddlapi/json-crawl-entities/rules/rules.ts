import { CrawlRules } from "@netcracker/qubership-apihub-json-crawl";
import { DdlApiTreeNodeKind, DdlApiTreeNodeKinds } from "../../../../model/ddlapi/types/node-kind";
import { DdlApiTreeCrawlState } from "../state/types";
import { DdlApiCrawlRule } from "./types";

export function getDdlApiCrawlRules<S extends DdlApiTreeCrawlState = DdlApiTreeCrawlState>(
  kind: DdlApiTreeNodeKind = DdlApiTreeNodeKinds.TABLE
): CrawlRules<DdlApiCrawlRule<S>> {
  return {
    '/columns': {
      '/items': {
        '/*': () => getDdlApiCrawlRules(DdlApiTreeNodeKinds.COLUMN),
      },
      kind: DdlApiTreeNodeKinds.COLUMNS,
    },
    '/indexes': {
      '/items': {
        '/*': () => getDdlApiCrawlRules(DdlApiTreeNodeKinds.INDEX),
      },
      kind: DdlApiTreeNodeKinds.INDEXES,
    },
    kind,
  }
}
