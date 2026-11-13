import { AbstractNodeDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-summary-aggregator";
import { AsyncApiTreeNodeKind } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiNodeDiffsSummaryKindAny } from "./kind-any";
import { isSecurityTreeNodeKind } from "@apihub/next-data-model/model/security/types/node-kind";
import { ASYNC_API_SECURITY_NODE_AGGREGATORS } from "../security-node-aggregators";

export class AsyncApiNodeDiffsSummaryAggregatorFactory {

  public static instance(kind: AsyncApiTreeNodeKind): AbstractNodeDiffsSummaryAggregator {
    // Security sections: record-driven, shared with OpenAPI (records prepared by the security builders).
    if (isSecurityTreeNodeKind(kind)) {
      return ASYNC_API_SECURITY_NODE_AGGREGATORS.diffsSummary();
    }
    switch (kind) {
      default:
        return new AsyncApiNodeDiffsSummaryKindAny()
    }
  }
}