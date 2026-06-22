import { AbstractNodeDescendantsDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-aggregator";
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiNodeDescendantDiffsAggregatorKindAny } from "./kind-any";
import { AsyncApiNodeDescendantDiffsAggregatorKindBindings } from "./kind-bindings";
import { AsyncApiNodeDescendantDiffsAggregatorKindMessageContent } from "./kind-message-content";
import { AsyncApiNodeDescendantDiffsAggregatorKindServers } from "./kind-servers";

export class AsyncApiNodeDescendantDiffsAggregatorFactory {
  private static readonly instances = new Map<AsyncApiTreeNodeKind | null, AbstractNodeDescendantsDiffsAggregator>();

  public static instance(
    kind: AsyncApiTreeNodeKind,
  ): AbstractNodeDescendantsDiffsAggregator {
    switch (kind) {
      case AsyncApiTreeNodeKinds.BINDINGS:
        if (!this.instances.has(AsyncApiTreeNodeKinds.BINDINGS)) {
          this.instances.set(AsyncApiTreeNodeKinds.BINDINGS, new AsyncApiNodeDescendantDiffsAggregatorKindBindings());
        }
        return this.instances.get(AsyncApiTreeNodeKinds.BINDINGS)!;
      case AsyncApiTreeNodeKinds.SERVERS:
        if (!this.instances.has(AsyncApiTreeNodeKinds.SERVERS)) {
          this.instances.set(AsyncApiTreeNodeKinds.SERVERS, new AsyncApiNodeDescendantDiffsAggregatorKindServers());
        }
        return this.instances.get(AsyncApiTreeNodeKinds.SERVERS)!;
      case AsyncApiTreeNodeKinds.MESSAGE_CONTENT:
        if (!this.instances.has(AsyncApiTreeNodeKinds.MESSAGE_CONTENT)) {
          this.instances.set(AsyncApiTreeNodeKinds.MESSAGE_CONTENT, new AsyncApiNodeDescendantDiffsAggregatorKindMessageContent());
        }
        return this.instances.get(AsyncApiTreeNodeKinds.MESSAGE_CONTENT)!;
      default:
        if (!this.instances.has(null)) {
          const instance = new AsyncApiNodeDescendantDiffsAggregatorKindAny();
          this.instances.set(null, instance);
        }
        return this.instances.get(null)!;
    }
  }
}
