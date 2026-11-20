import { RecordDrivenAggregatorRegistry } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/record-driven-aggregators";
import { SECURITY_AGGREGATION_TABLES } from "@apihub/next-data-model/building-service/security/tree-with-diffs/aggregation-tables";
import { AsyncApiTreeNodeKind } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { SecurityTreeNodeKind } from "@apihub/next-data-model/model/security/types/node-kind";

/** Record-driven aggregators of the Security section kinds in the AsyncAPI tree (shared by the five factories). */
export const ASYNC_API_SECURITY_NODE_AGGREGATORS = new RecordDrivenAggregatorRegistry<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiTreeNodeMeta,
  SecurityTreeNodeKind
>(SECURITY_AGGREGATION_TABLES);
