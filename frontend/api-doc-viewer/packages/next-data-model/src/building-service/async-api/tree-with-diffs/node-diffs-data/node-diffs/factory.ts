import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { AsyncApiNodeDiffsAggregatorKindAny } from "./kind-any";
import { AsyncApiNodeDiffsAggregatorKindBinding } from "./kind-binding";
import { AsyncApiNodeDiffsAggregatorKindBindings } from "./kind-bindings";
import { AsyncApiNodeDiffsAggregatorKindExtensions } from "./kind-extensions";
import { AsyncApiNodeDiffsAggregatorKindMessage } from "./kind-message";
import { AsyncApiNodeDiffsAggregatorKindParameters } from "./kind-parameters";
import { AsyncApiNodeDiffsAggregatorKindServer } from "./kind-server";
import { AsyncApiNodeDiffsAggregatorKindServers } from "./kind-servers";

export class AsyncApiNodeDiffsAggregatorFactory {
  private static readonly instances = new Map<
    AsyncApiTreeNodeKind | null,
    AbstractNodeDiffsAggregator<
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
      AsyncApiTreeNodeKind,
      AsyncApiTreeNodeMeta,
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
    >
  >();

  public static instance(
    kind: AsyncApiTreeNodeKind,
  ): AbstractNodeDiffsAggregator<
    AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
    AsyncApiTreeNodeKind,
    AsyncApiTreeNodeMeta,
    AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
  > {
    switch (kind) {
      case AsyncApiTreeNodeKinds.BINDING:
        if (!this.instances.has(AsyncApiTreeNodeKinds.BINDING)) {
          this.instances.set(AsyncApiTreeNodeKinds.BINDING, new AsyncApiNodeDiffsAggregatorKindBinding());
        }
        return this.instances.get(AsyncApiTreeNodeKinds.BINDING)!;
      case AsyncApiTreeNodeKinds.BINDINGS:
        if (!this.instances.has(AsyncApiTreeNodeKinds.BINDINGS)) {
          this.instances.set(AsyncApiTreeNodeKinds.BINDINGS, new AsyncApiNodeDiffsAggregatorKindBindings());
        }
        return this.instances.get(AsyncApiTreeNodeKinds.BINDINGS)!;
      case AsyncApiTreeNodeKinds.EXTENSIONS:
        if (!this.instances.has(AsyncApiTreeNodeKinds.EXTENSIONS)) {
          this.instances.set(AsyncApiTreeNodeKinds.EXTENSIONS, new AsyncApiNodeDiffsAggregatorKindExtensions());
        }
        return this.instances.get(AsyncApiTreeNodeKinds.EXTENSIONS)!;
      case AsyncApiTreeNodeKinds.MESSAGE:
        if (!this.instances.has(AsyncApiTreeNodeKinds.MESSAGE)) {
          this.instances.set(AsyncApiTreeNodeKinds.MESSAGE, new AsyncApiNodeDiffsAggregatorKindMessage());
        }
        return this.instances.get(AsyncApiTreeNodeKinds.MESSAGE)!;
      case AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS:
        if (!this.instances.has(AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS)) {
          this.instances.set(AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS, new AsyncApiNodeDiffsAggregatorKindParameters());
        }
        return this.instances.get(AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS)!;
      case AsyncApiTreeNodeKinds.SERVER:
        if (!this.instances.has(AsyncApiTreeNodeKinds.SERVER)) {
          this.instances.set(AsyncApiTreeNodeKinds.SERVER, new AsyncApiNodeDiffsAggregatorKindServer());
        }
        return this.instances.get(AsyncApiTreeNodeKinds.SERVER)!;
      case AsyncApiTreeNodeKinds.SERVERS:
        if (!this.instances.has(AsyncApiTreeNodeKinds.SERVERS)) {
          this.instances.set(AsyncApiTreeNodeKinds.SERVERS, new AsyncApiNodeDiffsAggregatorKindServers());
        }
        return this.instances.get(AsyncApiTreeNodeKinds.SERVERS)!;
      default:
        if (!this.instances.has(null)) {
          this.instances.set(null, new AsyncApiNodeDiffsAggregatorKindAny());
        }
        return this.instances.get(null)!;
    }
  }
}