import { SpecificationExtensionKey } from "../../specification-extension-key"
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds } from "./node-kind"

export type AsyncApiTreeNodeValue<T extends AsyncApiTreeNodeKind> =
  T extends typeof AsyncApiTreeNodeKinds.BINDING
  ? AsyncApiTreeNodeValueTypeBinding
  : T extends typeof AsyncApiTreeNodeKinds.EXTENSIONS
  ? AsyncApiTreeNodeValueTypeExtensions
  : T extends typeof AsyncApiTreeNodeKinds.MESSAGE
  ? AsyncApiTreeNodeValueTypeMessage
  : T extends typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL
  ? AsyncApiTreeNodeValueTypeMessageChannel
  : T extends typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS
  ? AsyncApiTreeNodeValueTypeChannelParameters
  : T extends typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION
  ? AsyncApiTreeNodeValueTypeMessageOperation
  : T extends typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS
  ? AsyncApiTreeNodeValueTypeMessageHeaders
  : T extends typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD
  ? AsyncApiTreeNodeValueTypeMessagePayload
  : T extends typeof AsyncApiTreeNodeKinds.SERVER
  ? AsyncApiTreeNodeValueTypeServer
  : never

export interface AsyncApiTreeNodeValueBase {
  readonly title?: string
  readonly description?: string
  readonly summary?: string
}

export interface AsyncApiTreeNodeValueTypeBinding {
  readonly binding: Record<string, unknown>
  readonly version?: string
  readonly protocol: string
}

interface AsyncApiTreeNodeValueWithRawValues {
  readonly rawValues: Record<string, unknown>
}

export interface AsyncApiTreeNodeValueTypeExtensions extends AsyncApiTreeNodeValueWithRawValues {
  readonly rawValues: Record<SpecificationExtensionKey, unknown>
}

export interface AsyncApiTreeNodeValueTypeMessage extends AsyncApiTreeNodeValueBase {
  readonly internalTitle: string
  readonly action: string
  readonly address: string | null
}

export interface AsyncApiTreeNodeValueTypeMessageChannel extends AsyncApiTreeNodeValueBase { }

export interface AsyncApiTreeNodeValueTypeChannelParameters extends AsyncApiTreeNodeValueWithRawValues {
  readonly rawValues: Record<string, unknown>
}

export interface AsyncApiTreeNodeValueTypeMessageOperation extends AsyncApiTreeNodeValueBase { }

interface AsyncApiTreeNodeValueTypeMultiSchema extends AsyncApiTreeNodeValueBase {
  readonly schema: object
  readonly schemaFormat?: string
}

export interface AsyncApiTreeNodeValueTypeMessageHeaders extends AsyncApiTreeNodeValueTypeMultiSchema { }

export interface AsyncApiTreeNodeValueTypeMessagePayload extends AsyncApiTreeNodeValueTypeMultiSchema { }

export interface AsyncApiTreeNodeValueTypeServer extends AsyncApiTreeNodeValueBase {
  readonly host: string
  readonly protocol: string
}
