import { AsyncApiComplexTreeNode } from "@apihub/next-data-model/model/async-api/tree/complex-node.impl";
import { AsyncApiSimpleTreeNode } from "@apihub/next-data-model/model/async-api/tree/simple-node.impl";
import { AsyncApiTree } from "@apihub/next-data-model/model/async-api/tree/tree.impl";
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds, AsyncApiTreeNodeKindsList } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue, AsyncApiTreeNodeValueBase } from "@apihub/next-data-model/model/async-api/types/node-value";
import { OperationKeys } from "@apihub/next-data-model/shared/async-api/types/operation-keys";
import type { v3 } from "@asyncapi/parser/esm/spec-types";
import { buildPointer, JSON_SCHEMA_PROPERTY_REF } from "@netcracker/qubership-apihub-api-unifier";
import { isArray, syncCrawl, SyncCrawlHook } from "@netcracker/qubership-apihub-json-crawl";
import { ComplexTreeNodeParams, ITreeNode, SimpleTreeNodeParams, TreeNodeComplexityType, TreeNodeComplexityTypes, TreeNodeParams } from "../../../model/abstract/tree/tree-node.interface";
import { isObject, isObjectWithStringKeys } from "../../../utilities";
import { NodeId, NodeKey } from "../../../utility-types";
import { TreeBuilder } from "../../abstract/tree/builder";
import { AsyncApiLogger, createAsyncApiLogger } from "../logging";
import { getAsyncApiCrawlRules } from "../json-crawl-entities/rules/rules";
import { AsyncApiCrawlRule, SchemaCrawlRule } from "../json-crawl-entities/rules/types";
import { AsyncApiTreeCrawlState, CommonState } from "../json-crawl-entities/state/types";
import { UNKNOWN_ADDRESS } from "../json-crawl-entities/transformers/constants/constants";
import { SchemaTransformFunc } from "../json-crawl-entities/transformers/types/types";

// Union of all possible keys from all AsyncApiTreeNodeValue variants
type AnyAsyncApiNodeValueKey =
  | keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.BINDING>
  | keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.EXTENSIONS>
  | keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE>
  | keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL>
  | keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>
  | keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS>
  | keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION>
  | keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD>
  | keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.SERVER>

type SimpleAsyncApiTreeNodeParams = SimpleTreeNodeParams<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiNodeMeta
>

type ComplexAsyncApiTreeNodeParams = ComplexTreeNodeParams<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiNodeMeta
>

export class AsyncApiTreeBuilder extends TreeBuilder<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiNodeMeta
> {
  public readonly tree: AsyncApiTree;

  public static readonly ASYNC_API_TREE_NODE_META_PROPS: (keyof AsyncApiNodeMeta)[] = []

  private static readonly ASYNC_API_TREE_NODE_VALUE_COMMON_PROPS: (keyof AsyncApiTreeNodeValueBase)[] = [
    'title', 'description', 'summary'
  ]

  // Function overloads for type-safe return based on input type
  public static getAsyncApiTreeNodeValueProps(
    type:
      | typeof AsyncApiTreeNodeKinds.BINDING
      | typeof AsyncApiTreeNodeKinds.EXTENSIONS
      | typeof AsyncApiTreeNodeKinds.MESSAGE
      | typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL
      | typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS
      | typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS
      | typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION
      | typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD
      | typeof AsyncApiTreeNodeKinds.SERVER
  ): (keyof AsyncApiTreeNodeValue<
    | typeof AsyncApiTreeNodeKinds.BINDING
    | typeof AsyncApiTreeNodeKinds.EXTENSIONS
    | typeof AsyncApiTreeNodeKinds.MESSAGE
    | typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL
    | typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS
    | typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS
    | typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION
    | typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD
    | typeof AsyncApiTreeNodeKinds.SERVER
  >)[]
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.BINDING): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.BINDING>)[]
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.EXTENSIONS): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.EXTENSIONS>)[]
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL>)[]
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>)[]
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.MESSAGE): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE>)[]
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS>)[]
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION>)[]
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD>)[]
  public static getAsyncApiTreeNodeValueProps(type: typeof AsyncApiTreeNodeKinds.SERVER): (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.SERVER>)[]

  // General fallback signature
  public static getAsyncApiTreeNodeValueProps(type: AsyncApiTreeNodeKind): AnyAsyncApiNodeValueKey[] {
    switch (type) {
      case AsyncApiTreeNodeKinds.BINDING:
        return [
          'binding',
          'version',
          'protocol',
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.BINDING>)[]
      case AsyncApiTreeNodeKinds.EXTENSIONS:
      case AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS:
        return [
          'rawValues',
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.EXTENSIONS | typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>)[]
      case AsyncApiTreeNodeKinds.MESSAGE:
        return [
          ...AsyncApiTreeBuilder.ASYNC_API_TREE_NODE_VALUE_COMMON_PROPS,
          'internalTitle',
          'action',
          'address',
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE>)[]
      case AsyncApiTreeNodeKinds.MESSAGE_CHANNEL:
        return [
          ...AsyncApiTreeBuilder.ASYNC_API_TREE_NODE_VALUE_COMMON_PROPS,
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL>)[]
      case AsyncApiTreeNodeKinds.MESSAGE_OPERATION:
        return [
          ...AsyncApiTreeBuilder.ASYNC_API_TREE_NODE_VALUE_COMMON_PROPS,
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION>)[]
      case AsyncApiTreeNodeKinds.MESSAGE_HEADERS:
      case AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD:
        return [
          'schema',
          'schemaFormat',
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS | typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD>)[]
      case AsyncApiTreeNodeKinds.SERVER:
        return [
          ...AsyncApiTreeBuilder.ASYNC_API_TREE_NODE_VALUE_COMMON_PROPS,
          'host',
          'protocol',
        ]satisfies (keyof AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.SERVER>)[]
      default:
        return []
    }
  }

  constructor(
    private readonly source: unknown,
    private readonly referenceNamePropertyKey: symbol,
    private readonly operationKeys?: OperationKeys,
    private readonly logger: AsyncApiLogger = createAsyncApiLogger(),
  ) {
    super()
    this.tree = new AsyncApiTree();
  }

  public build(): AsyncApiTree {
    if (!isObject(this.source)) {
      return this.tree;
    }

    const initialState: AsyncApiTreeCrawlState = {
      parent: null,
      container: null,
      alreadyConvertedValuesCache: new Map(),
    }

    // TODO: Encapsulate this
    const initialRules: AsyncApiCrawlRule = getAsyncApiCrawlRules(AsyncApiTreeNodeKinds.MESSAGE)

    // TODO: Encapsulate this
    const preparedSource = this.transformOperationOrientedSpecToMessageOrientedSpec(this.source, this.operationKeys)

    this.logger.debug('[AsyncAPI] Prepared Source:', preparedSource)

    syncCrawl<AsyncApiTreeCrawlState, AsyncApiCrawlRule>(
      preparedSource,
      [
        this.instantiateHookPreventingTreeBuildingProcessFromInfiniteLoop(),
        this.instantiateHookUnifyingValue(preparedSource),
        this.instantiateHookCreatingAsyncApiTreeNodes(),
      ],
      {
        state: initialState,
        rules: initialRules,
      },
    )

    return this.tree;
  }

  // General transformer

  private transformOperationOrientedSpecToMessageOrientedSpec(
    source: unknown,
    operationKeys?: OperationKeys,
  ): unknown {
    if (!this.isAsyncApiSpecification(source)) {
      return null
    }

    const operations: v3.OperationsObject = source.operations ?? {}

    let operationKey: string
    let messageKey: string

    let firstOperationKey: string | undefined
    let firstOperationMessageKey: string | undefined
    if (!operationKeys) {
      this.logger.error('Operation key or message key is not provided. Looking for first operation, channel and message in source...')
      firstOperationKey = Object.keys(operations).at(0)
      if (firstOperationKey) {
        const firstOperationCandidate = operations[firstOperationKey]
        const firstOperation = !this.isReferenceObject(firstOperationCandidate) ? firstOperationCandidate : null
        if (firstOperation) {
          // First Message
          const firstOperationMessagesCandidate = firstOperation.messages?.[0]
          const firstOperationMessage = !this.isReferenceObject(firstOperationMessagesCandidate) ? firstOperationMessagesCandidate : null
          if (firstOperationMessage) {
            const key = (firstOperationMessage as Record<PropertyKey, unknown>)[this.referenceNamePropertyKey]
            firstOperationMessageKey = typeof key === 'string' ? key : undefined
          }
        }
      }
      if (!firstOperationKey || !firstOperationMessageKey) {
        !firstOperationKey && this.logger.error('Cannot find first operation in source.')
        !firstOperationMessageKey && this.logger.error('Cannot find first operation message key in source.')
        return null
      }
      this.logger.debug('[AsyncAPI] Found first operation, channel and message in source:', firstOperationKey, firstOperationMessageKey)
      operationKey = firstOperationKey
      messageKey = firstOperationMessageKey
    } else {
      operationKey = operationKeys.operationKey
      messageKey = operationKeys.messageKey
    }

    const operation: v3.OperationObject | undefined = Object.entries(operations)
      .filter((currentOperationEntry): currentOperationEntry is [string, v3.OperationObject] => {
        const [currentOperationKey, currentOperation] = currentOperationEntry
        return (
          !this.isReferenceObject(currentOperation) &&
          currentOperationKey === operationKey
        )
      })
      .map(([, operation]) => operation)
      .at(0)

    if (!operation) {
      this.logger.error(`Cannot find operation with key (id) = ${operationKey}`)
      return null
    }

    const operationChannel: v3.ChannelObject = !this.isReferenceObject(operation.channel) ? operation.channel : {}
    const operationMessages: v3.MessageObject[] = (operation.messages ?? [])
      .filter((message): message is v3.MessageObject => !this.isReferenceObject(message))
    let operationMessage: v3.MessageObject | undefined = operationMessages
      .find((message: v3.MessageObject) => isObject(message) && message[this.referenceNamePropertyKey] === messageKey)

    if (!operationChannel) {
      this.logger.error('Cannot find channel in the operation', operation)
      return null
    }

    if (!operationMessage) {
      const channelMessage = operationChannel.messages?.[messageKey]
      operationMessage = !this.isReferenceObject(channelMessage) ? channelMessage : undefined
      if (!operationMessage) {
        this.logger.error(`Cannot find message with key (id) = ${messageKey}`)
        return null
      }
    }

    const operationExtensions = this.copyExtensions(operation)
    const operationChannelExtensions = this.copyExtensions(operationChannel)
    const operationMessageExtensions = this.copyExtensions(operationMessage)

    const pickReferenceNameProperty = (source: unknown): Record<PropertyKey, unknown> | undefined => {
      return isObject(source)
        ? { [this.referenceNamePropertyKey]: source[this.referenceNamePropertyKey] }
        : undefined
    }

    const pickReferenceNamePropertyValue = (source: unknown): unknown | undefined => {
      return isObject(source) ? source[this.referenceNamePropertyKey] : undefined
    }

    const messageReferenceNameProperty = pickReferenceNameProperty(operationMessage)
    const channelReferenceNameProperty = pickReferenceNameProperty(operationChannel)
    const operationReferenceNameProperty = pickReferenceNameProperty(operation)

    const messageOrientedOperation: Record<PropertyKey, unknown> = {
      ...(messageReferenceNameProperty ?? {}),
      id: messageKey,
      ...(operationMessage.name ? { internalTitle: operationMessage.name } : {}),
      ...(operationMessage.title ? { title: operationMessage.title } : {}),
      ...(operationMessage.summary ? { summary: operationMessage.summary } : {}),
      ...(operationMessage.description ? { description: operationMessage.description } : {}),
      action: operation.action,
      address: operationChannel.address ?? UNKNOWN_ADDRESS,
      data: {
        content: {
          ...operationMessage.headers ? { headers: operationMessage.headers } : {},
          ...operationMessageExtensions ? { extensions: operationMessageExtensions } : {},
          ...operationMessage.bindings ? { bindings: operationMessage.bindings } : {},
          ...operationMessage.payload ? { payload: operationMessage.payload } : {},
        },
        channel: {
          ...(channelReferenceNameProperty ?? {}),
          ...(operationChannel.title ? { title: operationChannel.title } : {}),
          ...(operationChannel.summary ? { summary: operationChannel.summary } : {}),
          ...(operationChannel.description ? { description: operationChannel.description } : {}),
          ...operationChannelExtensions ? { extensions: operationChannelExtensions } : {},
          ...operationChannel.bindings ? { bindings: operationChannel.bindings } : {},
          ...operationChannel.parameters ? { parameters: this.transformParametersToJsonSchema(operationChannel.parameters) } : {},
          ...operationChannel.servers ? {
            servers: operationChannel.servers.map((server: v3.ServerObject | v3.ReferenceObject) => {
              if (this.isReferenceObject(server)) {
                return server
              }
              const serverTitle = server.title ?? pickReferenceNamePropertyValue(server)
              return typeof serverTitle === 'string'
                ? { ...server, title: serverTitle }
                : server
            })
          } : {},
        },
        operation: {
          ...(operationReferenceNameProperty ?? {}),
          id: operationKey,
          ...(operation.title ? { title: operation.title } : {}),
          ...(operation.summary ? { summary: operation.summary } : {}),
          ...(operation.description ? { description: operation.description } : {}),
          ...operation.bindings ? { bindings: operation.bindings } : {},
          ...operationExtensions ? { extensions: operationExtensions } : {},
        },
      }
    }
    return messageOrientedOperation
  }

  private transformParametersToJsonSchema(parameters: v3.ParametersObject): v3.SchemaObject {
    const newParameters: Record<string, v3.SchemaObject> = {}
    for (const [parameterName, parameterValue] of Object.entries(parameters)) {
      newParameters[parameterName] =
        this.isReferenceObject(parameterValue)
          ? parameterValue
          : { type: 'string', ...parameterValue }
    }
    return newParameters
  }

  private copyExtensions(source: v3.MessageObject): v3.SpecificationExtensions | undefined {
    const extensionKeys = Object.keys(source)
      .filter((key): key is keyof v3.SpecificationExtensions => key.startsWith('x-'))
    if (extensionKeys.length === 0) {
      return undefined
    }
    return extensionKeys.reduce((extensions, key) => {
      extensions[key] = source[key]
      return extensions
    }, {} as v3.SpecificationExtensions)
  }

  private isAsyncApiSpecification(value: unknown): value is v3.AsyncAPIObject {
    return typeof value === 'object' && value !== null && 'asyncapi' in value && typeof value.asyncapi === 'string'
  }

  private isReferenceObject(value: unknown): value is v3.ReferenceObject {
    return typeof value === 'object' && value !== null && '$ref' in value && typeof value.$ref === 'string'
  }

  /* Crawlhooks-builders */

  private instantiateHookPreventingTreeBuildingProcessFromInfiniteLoop<
    V extends object | null,
    K extends string,
    M extends object,
  >(): SyncCrawlHook<
    CommonState<V, K, M>,
    SchemaCrawlRule<K, CommonState<V, K, M>>
  > {
    return ({ value, state, key, path }) => {
      if (typeof key === 'symbol') {
        return;
      }

      const {
        alreadyConvertedValuesCache,
        parent,
        container,
      } = state
      const alreadyExisted: ITreeNode<V, K, M> | undefined = alreadyConvertedValuesCache.get(value)

      if (
        !alreadyExisted || (
          !this.isAsyncApiSimpleTreeNode(alreadyExisted) &&
          !this.isAsyncApiComplexTreeNode(alreadyExisted)
        )
      ) {
        return { value }
      }

      if (!parent || !this.isAsyncApiSimpleTreeNode(parent)) {
        return { value }
      }

      const nodeId = '#' + buildPointer(path)
      const nodeKey = this.resolveNodeKey(key, value);
      const cycledClone = this.tree.createCycledClone(alreadyExisted, nodeId, nodeKey, parent)
      if (container) {
        container.addNestedNode(cycledClone)
      }
      if (parent) {
        parent.addChildNode(cycledClone)
      }
      return { done: true }
    }
  }

  private instantiateHookUnifyingValue<
    V extends object | null,
    K extends string,
    M extends object
  >(
    source: unknown
  ): SyncCrawlHook<
    CommonState<V, K, M>,
    SchemaCrawlRule<K, CommonState<V, K, M>>
  > {
    return ({ key, value, path, state, rules }) => {
      if (!rules || !Array.isArray(rules.transformers)) {
        return
      }

      const transformers: SchemaTransformFunc<CommonState<V, K, M>>[] = rules.transformers ?? []
      const transformedValue = transformers.reduce(
        (accumulatedTransformedValue, transform) => transform(key, accumulatedTransformedValue, source, path, state),
        value
      )

      return { value: transformedValue }
    }
  }

  private instantiateHookCreatingAsyncApiTreeNodes(): SyncCrawlHook<AsyncApiTreeCrawlState, AsyncApiCrawlRule> {
    return ({ key, value, path, rules, state }) => {
      if (!rules) {
        return { done: true };
      }
      if (typeof key === 'symbol') {
        return { done: true };
      }
      if (value === undefined || value === null || !isObject(value) && !isArray(value)) {
        return { done: true };
      }
      // if (isObject(value) && Reflect.ownKeys(value).length === 0) {
      // return { done: true }; // exit on empty object
      // }
      if (!rules.kind || !AsyncApiTreeNodeKindsList.includes(rules.kind)) {
        // equivalent to "continue" operator within loop operators
        // means "keep going deeper in the original object"
        return;
      }

      const { parent, container } = state;
      const nodeId = '#' + buildPointer(path);
      const nodeKey = this.resolveNodeKey(key, value);
      const { kind, complex = false } = rules;

      const params = container
        ? { value: Array.isArray(value) ? null : value, newDataLevel: true, container: container, parent: container.parent }
        : { value: Array.isArray(value) ? null : value, newDataLevel: true, container: null, parent: parent }

      const treeNode = this.createNodeFromRaw(nodeId, nodeKey, kind, complex, params)

      if (!treeNode) {
        return;
      }

      if (container) {
        container.addNestedNode(treeNode);
      } else if (parent) {
        parent.addChildNode(treeNode);
      }

      if (isObject(value) && value.isPrimitive) {
        // Prevent from falling into infinite loop due to transformed primitives into objects
        return { done: true };
      }

      const newCache = new Map(state.alreadyConvertedValuesCache);
      newCache.set(value, treeNode);

      let newState: AsyncApiTreeCrawlState | undefined;
      if (this.isAsyncApiSimpleTreeNode(treeNode)) {
        newState = {
          parent: treeNode,
          container: null,
          alreadyConvertedValuesCache: newCache,
        }
      }
      if (this.isAsyncApiComplexTreeNode(treeNode)) {
        newState = {
          parent: parent,
          container: treeNode,
          alreadyConvertedValuesCache: newCache,
        }
      }

      return { value: value, state: newState };
    };
  }

  /**
   * Picks up the node key found in the reference if mapping is provided.
   * Otherwise, returns the original key.
   * @param key - crawl hook key.
   * @param value - crawl hook value.
   * @returns resolved node key.
   */
  private resolveNodeKey(key: NodeKey, value: unknown): NodeKey {
    if (!isObject(value)) {
      return key
    }
    if (this.referenceNamePropertyKey && value[this.referenceNamePropertyKey]) {
      const nodeKeyCandidate = value[this.referenceNamePropertyKey]
      if (typeof nodeKeyCandidate === 'string' || typeof nodeKeyCandidate === 'number') {
        return nodeKeyCandidate
      }
    }
    if ('id' in value && typeof value.id === 'string') {
      return value.id
    }
    return key
  }

  /* Atomic builders */

  protected createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: AsyncApiTreeNodeKind,
    complex: boolean,
    params: TreeNodeParams<object | null, string, object>
  ): AsyncApiSimpleTreeNode | AsyncApiComplexTreeNode | undefined {
    const { parent, container, newDataLevel } = params

    if (complex) {
      const nodeMeta = this.createNodeMeta(key, params)
      const extendedParams: ComplexAsyncApiTreeNodeParams = {
        type: TreeNodeComplexityTypes.COMPLEX,
        parent: parent && this.isAsyncApiSimpleTreeNode(parent) ? parent : null, // just type guard
        container: container && this.isAsyncApiComplexTreeNode(container) ? container : null,
        value: null,
        meta: nodeMeta,
        newDataLevel: newDataLevel,
      }
      return this.tree.createComplexNode(id, key, kind, false, extendedParams)
    }

    const nodeValue = this.createNodeValue(key, kind, {
      ...params,
      parent: parent,
      container: container,
    })
    const nodeMeta = this.createNodeMeta(key, params)
    const extendedParams: SimpleAsyncApiTreeNodeParams = {
      type: TreeNodeComplexityTypes.SIMPLE,
      parent: parent && this.isAsyncApiSimpleTreeNode(parent) ? parent : null, // just type guard
      container: container && this.isAsyncApiComplexTreeNode(container) ? container : null,
      value: nodeValue,
      meta: nodeMeta,
      newDataLevel: newDataLevel,
    }
    return this.tree.createSimpleNode(id, key, kind, false, extendedParams)
  }

  protected createNodeMeta(
    key: NodeKey,
    params: TreeNodeParams<object | null, string, object>,
  ): AsyncApiNodeMeta {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { value, parent = null } = params

    return {
      ...this.isValueWithBrokenRef(value) ? { brokenRef: `${value.$ref}` } : {},
      _fragment: value,
    }
  }

  protected createNodeValue(
    key: NodeKey,
    kind: AsyncApiTreeNodeKind,
    params: TreeNodeParams<object | null, string, object>,
  ): AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null {
    const { value } = params

    if (value === undefined || value === null) {
      return null
    }
    if (!isObjectWithStringKeys(value)) {
      return null
    }

    switch (kind) {
      case AsyncApiTreeNodeKinds.BINDING:
        return this.pick<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.BINDING>>(
          value,
          AsyncApiTreeBuilder.getAsyncApiTreeNodeValueProps(kind),
        )
      case AsyncApiTreeNodeKinds.EXTENSIONS:
        return this.pick<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.EXTENSIONS>>(
          value,
          AsyncApiTreeBuilder.getAsyncApiTreeNodeValueProps(kind),
        )
      case AsyncApiTreeNodeKinds.MESSAGE:
        return this.pick<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE>>(
          value,
          AsyncApiTreeBuilder.getAsyncApiTreeNodeValueProps(kind),
        )
      case AsyncApiTreeNodeKinds.MESSAGE_CHANNEL:
        return this.pick<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL>>(
          value,
          AsyncApiTreeBuilder.getAsyncApiTreeNodeValueProps(kind),
        )
      case AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS:
        return this.pick<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>>(
          value,
          AsyncApiTreeBuilder.getAsyncApiTreeNodeValueProps(kind),
        )
      case AsyncApiTreeNodeKinds.MESSAGE_HEADERS:
        return this.pick<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS>>(
          value,
          AsyncApiTreeBuilder.getAsyncApiTreeNodeValueProps(kind),
        )
      case AsyncApiTreeNodeKinds.MESSAGE_OPERATION:
        return this.pick<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION>>(
          value,
          AsyncApiTreeBuilder.getAsyncApiTreeNodeValueProps(kind),
        )
      case AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD:
        return this.pick<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD>>(
          value,
          AsyncApiTreeBuilder.getAsyncApiTreeNodeValueProps(kind),
        )
      case AsyncApiTreeNodeKinds.SERVER:
        return this.pick<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.SERVER>>(
          value,
          AsyncApiTreeBuilder.getAsyncApiTreeNodeValueProps(kind),
        )
      default:
        return null
    }
  }

  /* Type guards */

  private isAsyncApiSimpleTreeNode(node: ITreeNode<object | null, string, object>): node is AsyncApiSimpleTreeNode {
    return node.type === TreeNodeComplexityTypes.SIMPLE
  }

  private isAsyncApiComplexTreeNode(node: ITreeNode<object | null, string, object>): node is AsyncApiComplexTreeNode {
    return !this.isAsyncApiSimpleTreeNode(node)
  }

  private isValueWithBrokenRef(value: unknown): value is Record<typeof JSON_SCHEMA_PROPERTY_REF, unknown> {
    return isObject(value) && JSON_SCHEMA_PROPERTY_REF in value
  }

  /* Specific utilities */

  // Complexity type detection

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getNodeComplexityType(value: unknown): TreeNodeComplexityType {
    return TreeNodeComplexityTypes.SIMPLE
  }
}

