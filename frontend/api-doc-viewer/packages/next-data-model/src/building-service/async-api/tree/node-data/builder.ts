import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue, AsyncApiTreeNodeValueBase } from "@apihub/next-data-model/model/async-api/types/node-value";
import { JSON_SCHEMA_PROPERTY_REF } from "@netcracker/qubership-apihub-api-unifier";
import { isObject, isObjectWithStringKeys } from "../../../../utilities";
import { AbstractNodeDataBuilder, NodeDataPickFunction } from "../../../abstract/tree/node-data/builder";

const ASYNC_API_NODE_KINDS_WITH_NODE_VALUE: ReadonlySet<string> = new Set([
  AsyncApiTreeNodeKinds.BINDING,
  AsyncApiTreeNodeKinds.EXTENSIONS,
  AsyncApiTreeNodeKinds.MESSAGE,
  AsyncApiTreeNodeKinds.MESSAGE_CHANNEL,
  AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS,
  AsyncApiTreeNodeKinds.MESSAGE_HEADERS,
  AsyncApiTreeNodeKinds.MESSAGE_OPERATION,
  AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD,
  AsyncApiTreeNodeKinds.SERVER,
]);
const ASYNC_API_TREE_NODE_VALUE_COMMON_PROPS: (keyof AsyncApiTreeNodeValueBase)[] = [
  'title', 'description', 'summary'
];
type AnyAsyncApiNodeValueKey =
  keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.BINDING> |
  keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.EXTENSIONS> |
  keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE> |
  keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL> |
  keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS> |
  keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS> |
  keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION> |
  keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD> |
  keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.SERVER>;

export class AsyncApiNodeDataBuilder extends AbstractNodeDataBuilder<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null, AsyncApiTreeNodeMeta
> {
  public override createNodeMeta(value: unknown): AsyncApiTreeNodeMeta {
    return {
      ...isObject(value) && JSON_SCHEMA_PROPERTY_REF in value ? { brokenRef: `${value.$ref}` } : {},
      _fragment: value,
    };
  }

  public override createNodeValue(
    kind: string,
    key: PropertyKey,
    value: unknown,
    pick: NodeDataPickFunction
  ): AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null {
    if (!isObjectWithStringKeys(value)) {
      return null;
    }
    if (!this.isAsyncApiTreeNodeKindWithNodeValue(kind)) {
      return null;
    }

    return pick<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind>>(
      value,
      AsyncApiNodeDataBuilder.getAsyncApiTreeNodeValueProps(kind)
    );
  }

  private isAsyncApiTreeNodeKindWithNodeValue(kind: string): kind is AsyncApiTreeNodeKind {
    return ASYNC_API_NODE_KINDS_WITH_NODE_VALUE.has(kind);
  }

  // Function overloads for type-safe return based on input type
  public static getAsyncApiTreeNodeValueProps(type: AsyncApiTreeNodeKind): (keyof AsyncApiTreeNodeValue<AsyncApiTreeNodeKind>)[];
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.BINDING): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.BINDING>)[];
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.EXTENSIONS): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.EXTENSIONS>)[];
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL>)[];
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>)[];
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.MESSAGE): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE>)[];
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS>)[];
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION>)[];
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD>)[];
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.SERVER): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.SERVER>)[];
  public static getAsyncApiTreeNodeValueProps(type: AsyncApiTreeNodeKind): AnyAsyncApiNodeValueKey[] {
    switch (type) {
      case AsyncApiTreeNodeKinds.BINDING:
        return [
          'binding',
          'version',
          'protocol',
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.BINDING>)[];
      case AsyncApiTreeNodeKinds.EXTENSIONS:
      case AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS:
        return [
          'rawValues',
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.EXTENSIONS | typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>)[];
      case AsyncApiTreeNodeKinds.MESSAGE:
        return [
          ...ASYNC_API_TREE_NODE_VALUE_COMMON_PROPS,
          'internalTitle',
          'action',
          'address',
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE>)[];
      case AsyncApiTreeNodeKinds.MESSAGE_CHANNEL:
        return [
          ...ASYNC_API_TREE_NODE_VALUE_COMMON_PROPS,
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL>)[];
      case AsyncApiTreeNodeKinds.MESSAGE_OPERATION:
        return [
          ...ASYNC_API_TREE_NODE_VALUE_COMMON_PROPS,
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION>)[];
      case AsyncApiTreeNodeKinds.MESSAGE_HEADERS:
      case AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD:
        return [
          'schema',
          'schemaFormat',
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS | typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD>)[];
      case AsyncApiTreeNodeKinds.SERVER:
        return [
          ...ASYNC_API_TREE_NODE_VALUE_COMMON_PROPS,
          'host',
          'protocol',
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.SERVER>)[];
      default:
        return [];
    }
  }
}
