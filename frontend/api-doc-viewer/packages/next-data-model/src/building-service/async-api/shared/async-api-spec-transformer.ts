import { OperationKeys } from "@apihub/next-data-model/shared/async-api/types/operation-keys";
import type { v3 } from "@asyncapi/parser/esm/spec-types";
import { isObject } from "../../../utilities";
import { UNKNOWN_ADDRESS } from "../json-crawl-entities/transformers/constants/constants";
import { AsyncApiLogger } from "../logging";

export interface AsyncApiMessageOrientedSpecDataContent {
  headers?: unknown;
  extensions?: v3.SpecificationExtensions;
  bindings?: unknown;
  payload?: unknown;
  [key: string]: unknown;
}

export interface AsyncApiMessageOrientedSpecDataChannel {
  title?: string;
  summary?: string;
  description?: string;
  extensions?: v3.SpecificationExtensions;
  bindings?: unknown;
  parameters?: v3.SchemaObject;
  servers?: (v3.ServerObject | v3.ReferenceObject)[];
  [key: string]: unknown;
}

export interface AsyncApiMessageOrientedSpecDataOperation {
  id: string;
  title?: string;
  summary?: string;
  description?: string;
  bindings?: unknown;
  extensions?: v3.SpecificationExtensions;
  [key: string]: unknown;
}

export interface AsyncApiMessageOrientedSpecData {
  content: AsyncApiMessageOrientedSpecDataContent;
  channel: AsyncApiMessageOrientedSpecDataChannel;
  operation: AsyncApiMessageOrientedSpecDataOperation;
}

export interface AsyncApiMessageOrientedSpec {
  id: string;
  internalTitle?: string;
  title?: string;
  summary?: string;
  description?: string;
  action?: v3.OperationObject["action"];
  address: string;
  data: AsyncApiMessageOrientedSpecData;
  [key: string]: unknown;
}

export class AsyncApiSpecTransformer {
  constructor(
    protected readonly referenceNamePropertyKey: symbol,
    protected readonly logger: AsyncApiLogger,
  ) { }

  protected operationKeysOrDefaults(source: v3.AsyncAPIObject, operationKeys?: OperationKeys): OperationKeys | null {
    let operationKey: string
    let messageKey: string

    const operations: v3.OperationsObject = source.operations ?? {}

    let firstOperationKey: string | undefined
    let firstOperationMessageKey: string | undefined
    if (!operationKeys) {
      this.logger.error("Operation key or message key is not provided. Looking for first operation, channel and message in source...")
      firstOperationKey = Object.keys(operations).at(0)
      if (firstOperationKey) {
        const firstOperationCandidate = operations[firstOperationKey]
        const firstOperation = !this.isReferenceObject(firstOperationCandidate) ? firstOperationCandidate : null
        if (firstOperation) {
          const firstOperationMessagesCandidate = firstOperation.messages?.[0]
          const firstOperationMessage = !this.isReferenceObject(firstOperationMessagesCandidate) ? firstOperationMessagesCandidate : null
          if (firstOperationMessage) {
            const key = (firstOperationMessage as Record<PropertyKey, unknown>)[this.referenceNamePropertyKey]
            firstOperationMessageKey = typeof key === "string" ? key : undefined
          }
        }
      }
      if (!firstOperationKey || !firstOperationMessageKey) {
        !firstOperationKey && this.logger.error("Cannot find first operation in source.")
        !firstOperationMessageKey && this.logger.error("Cannot find first operation message key in source.")
        return null
      }
      this.logger.debug("[AsyncAPI] Found first operation, channel and message in source:", firstOperationKey, firstOperationMessageKey)
      operationKey = firstOperationKey
      messageKey = firstOperationMessageKey
    } else {
      operationKey = operationKeys.operationKey
      messageKey = operationKeys.messageKey
    }

    return { operationKey, messageKey }
  }

  public transformOperationOrientedSpecToMessageOrientedSpec(
    source: unknown,
    operationKeys?: OperationKeys,
  ): AsyncApiMessageOrientedSpec | null {
    if (!this.isAsyncApiSpecification(source)) {
      return null
    }

    const operations: v3.OperationsObject = source.operations ?? {}

    const resolvedOperationKeys = this.operationKeysOrDefaults(source, operationKeys)
    if (!resolvedOperationKeys) {
      return null
    }
    const { operationKey, messageKey } = resolvedOperationKeys

    const operation: v3.OperationObject | undefined = Object.entries(operations)
      .filter((currentOperationEntry): currentOperationEntry is [string, v3.OperationObject] => {
        const [currentOperationKey, currentOperation] = currentOperationEntry
        return !this.isReferenceObject(currentOperation) && currentOperationKey === operationKey
      })
      .map(([, currentOperation]) => currentOperation)
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
      this.logger.error("Cannot find channel in the operation", operation)
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

    const pickReferenceNameProperty = (value: unknown): Record<PropertyKey, unknown> | undefined => {
      return isObject(value)
        ? { [this.referenceNamePropertyKey]: value[this.referenceNamePropertyKey] }
        : undefined
    }

    const messageReferenceNameProperty = pickReferenceNameProperty(operationMessage)
    const channelReferenceNameProperty = pickReferenceNameProperty(operationChannel)
    const operationReferenceNameProperty = pickReferenceNameProperty(operation)

    const messageOrientedOperation: AsyncApiMessageOrientedSpec = {
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
          ...operationChannel.servers ? { servers: operationChannel.servers } : {},
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
      },
    }

    return messageOrientedOperation
  }

  private transformParametersToJsonSchema(parameters: v3.ParametersObject): v3.SchemaObject {
    const newParameters: Record<PropertyKey, v3.SchemaObject> = {}
    for (const [parameterName, parameterValue] of Object.entries(parameters)) {
      newParameters[parameterName] =
        this.isReferenceObject(parameterValue)
          ? parameterValue
          : { type: "string", ...parameterValue }
    }
    const parametersRawObject = parameters as Record<PropertyKey, unknown>;
    for (const key of Reflect.ownKeys(parameters)) {
      if (typeof key !== "symbol") {
        continue
      }
      Object.defineProperty(newParameters, key, {
        value: parametersRawObject[key],
        configurable: true,
        enumerable: true,
        writable: true,
      })
    }
    return {
      type: 'object',
      properties: newParameters,
    }
  }

  private copyExtensions(
    source: v3.MessageObject | v3.OperationObject | v3.ChannelObject,
  ): v3.SpecificationExtensions | undefined {
    const extensionKeys = Object.keys(source)
      .filter((key): key is keyof v3.SpecificationExtensions => key.startsWith("x-"))
    if (extensionKeys.length === 0) {
      return undefined
    }
    return extensionKeys.reduce((extensions, key) => {
      extensions[key] = source[key]
      return extensions
    }, {} as v3.SpecificationExtensions)
  }

  protected isAsyncApiSpecification(value: unknown): value is v3.AsyncAPIObject {
    return typeof value === "object" && value !== null && "asyncapi" in value && typeof value.asyncapi === "string"
  }

  private isReferenceObject(value: unknown): value is v3.ReferenceObject {
    return typeof value === "object" && value !== null && "$ref" in value && typeof value.$ref === "string"
  }
}
