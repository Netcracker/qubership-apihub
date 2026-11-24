import { OperationKeys } from "@apihub/next-data-model/shared/async-api/types/operation-keys";
import type { v3 } from "@asyncapi/parser/esm/spec-types";
import { isObject } from "../../../utilities";
import { UNKNOWN_ADDRESS } from "../json-crawl-entities/transformers/constants/constants";
import { BuildingServiceLogger } from "../../../loggers";
import { SecuritySpec } from "../../security/security-spec";
import { AsyncApiSecuritySpecBuilder } from "./async-api-security-spec-builder";

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
  /** The operation's Security section (a child of the message root). */
  security?: SecuritySpec;
  data: AsyncApiMessageOrientedSpecData;
  [key: string]: unknown;
}

export class AsyncApiSpecTransformer {
  private securitySpecBuilder?: AsyncApiSecuritySpecBuilder

  constructor(
    protected readonly referenceNamePropertyKey: symbol,
    protected readonly logger: BuildingServiceLogger,
  ) { }

  /** The Security section of an operation or a server (created once per transformer). */
  protected buildSecurity(source: unknown, owner: unknown): SecuritySpec | undefined {
    this.securitySpecBuilder ??= this.createSecuritySpecBuilder()
    return this.securitySpecBuilder.build({ source, owner })
  }

  protected createSecuritySpecBuilder(): AsyncApiSecuritySpecBuilder {
    return new AsyncApiSecuritySpecBuilder(this.logger, this.referenceNamePropertyKey)
  }

  /** The channel servers with their Security sections; the list keeps its own symbol-keyed records (diffs). */
  private withServersSecurity(source: unknown, servers: (v3.ServerObject | v3.ReferenceObject)[]): (v3.ServerObject | v3.ReferenceObject)[] {
    const mapped = servers.map(server => this.withServerSecurity(source, server))
    for (const symbolKey of Object.getOwnPropertySymbols(servers)) {
      Reflect.set(mapped, symbolKey, Reflect.get(servers, symbolKey))
    }
    return mapped
  }

  /** A channel server with its Security section in place of its raw `security` list. */
  private withServerSecurity(source: unknown, server: v3.ServerObject | v3.ReferenceObject): v3.ServerObject | v3.ReferenceObject {
    if (!isObject(server) || !("security" in server)) {
      return server
    }
    const security = this.buildSecurity(source, server)
    // Object rest keeps the symbol-keyed records (diffs, reference names) of the merged server.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { security: rawSecurity, ...rest } = server
    return { ...rest, ...(security ? { security } : {}) } as v3.ServerObject
  }

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

    const operationSecurity = this.buildSecurity(source, operation)

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
      ...(operationSecurity ? { security: operationSecurity } : {}),
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
          ...operationChannel.servers ? { servers: this.withServersSecurity(source, operationChannel.servers) } : {},
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
