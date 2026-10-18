import { AbstractNodeDescendantsDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-summary-aggregator";
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiNodeDescendantDiffsSummaryAggregatorKindAny } from "./kind-any";
import { AsyncApiNodeDescendantDiffsSummaryAggregatorKindBinding } from "./kind-binding";
import { AsyncApiNodeDescendantDiffsSummaryAggregatorKindChannel } from "./kind-channel";
import { AsyncApiNodeDescendantDiffsSummaryAggregatorKindMessageContent } from "./kind-message-content";
import { AsyncApiNodeDescendantDiffsSummaryAggregatorKindOperation } from "./kind-operation";

export class AsyncApiNodeDescendantDiffsAggregatorFactory {
  private static readonly instances = new Map<AsyncApiTreeNodeKind | null, AbstractNodeDescendantsDiffsSummaryAggregator>();

  public static instance(
    kind: AsyncApiTreeNodeKind,
  ): AbstractNodeDescendantsDiffsSummaryAggregator {
    switch (kind) {
      case AsyncApiTreeNodeKinds.BINDING:
        if (!this.instances.has(AsyncApiTreeNodeKinds.BINDING)) {
          const instance = new AsyncApiNodeDescendantDiffsSummaryAggregatorKindBinding();
          this.instances.set(AsyncApiTreeNodeKinds.BINDING, instance);
        }
        return this.instances.get(AsyncApiTreeNodeKinds.BINDING)!;
      case AsyncApiTreeNodeKinds.MESSAGE_CONTENT:
        if (!this.instances.has(AsyncApiTreeNodeKinds.MESSAGE_CONTENT)) {
          const instance = new AsyncApiNodeDescendantDiffsSummaryAggregatorKindMessageContent();
          this.instances.set(AsyncApiTreeNodeKinds.MESSAGE_CONTENT, instance);
        }
        return this.instances.get(AsyncApiTreeNodeKinds.MESSAGE_CONTENT)!;
      case AsyncApiTreeNodeKinds.MESSAGE_CHANNEL:
        if (!this.instances.has(AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)) {
          const instance = new AsyncApiNodeDescendantDiffsSummaryAggregatorKindChannel();
          this.instances.set(AsyncApiTreeNodeKinds.MESSAGE_CHANNEL, instance);
        }
        return this.instances.get(AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)!;
      case AsyncApiTreeNodeKinds.MESSAGE_OPERATION:
        if (!this.instances.has(AsyncApiTreeNodeKinds.MESSAGE_OPERATION)) {
          const instance = new AsyncApiNodeDescendantDiffsSummaryAggregatorKindOperation();
          this.instances.set(AsyncApiTreeNodeKinds.MESSAGE_OPERATION, instance);
        }
        return this.instances.get(AsyncApiTreeNodeKinds.MESSAGE_OPERATION)!;
      default:
        if (!this.instances.has(null)) {
          const instance = new AsyncApiNodeDescendantDiffsSummaryAggregatorKindAny();
          this.instances.set(null, instance);
        }
        return this.instances.get(null)!;
    }
  }
}
