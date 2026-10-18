import { JSONSchema4, JSONSchema6, JSONSchema7 } from 'json-schema';

import {
  Amqp1ServerBinding,
  AmqpServerBinding,
  HttpServerBinding,
  JmsServerBinding,
  KafkaServerBinding,
  Mqtt5ServerBinding,
  MqttServerBinding,
  NatsServerBinding,
  RedisServerBinding,
  SnsServerBinding,
  SqsServerBinding,
  StompServerBinding,
  WebSocketsServerBinding,
} from './serverBindings';

type Key = string;
export type PatternField<T> = Record<Key, T>;
type JSONSchema = JSONSchema4 | JSONSchema6 | JSONSchema7;

// TODO: Extract to Open-source
export type AsyncApiDocument = Record<Key, never> &
  JSONSchema & {
    asyncapi: string;
    id?: string;
    info: InfoObject;
    servers?: PatternField<ServerObject>;
    channels: PatternField<ChannelItemObject>;
    components?: {
      schemas?: Record<Key, ReferenceObject | SchemaObject>;
      messages?: Record<Key, ReferenceObject | SchemaObject>;
      securitySchemes?: Record<Key, ReferenceObject | SchemaObject>;
      parameters?: Record<Key, ReferenceObject | SchemaObject>;
      correlationIds?: Record<Key, SchemaObject>;
      operationTraits?: Record<Key, SchemaObject>;
      messageTraits?: Record<Key, SchemaObject>;
      serverBindings?: Record<Key, SchemaObject>;
      channelBindings?: Record<Key, SchemaObject>;
      operationBindings?: Record<Key, SchemaObject>;
      messageBindings?: Record<Key, SchemaObject>;
    };
    tags?: TagObject[];
    externalDocs?: ExternalDocumentationObject;
  };

export type InfoObject = Partial<{
  title: string;
  version: string;
  description: string;
  termsOfService: string;
  contact: ContactObject;
  license: LicenseObject;
}>;

export type ContactObject = Partial<{
  name: string;
  url: string;
  email: string;
}>;

export type LicenseObject = Partial<{
  name: string;
  url: string;
}>;

export type ServerObject = Partial<{
  url: string;
  protocol: string;
  protocolVersion: string;
  description: string;
  variables: Map<string, ServerVariableObject>;
  security: SecurityRequirementObject[];
  binding: ServerBindingsObject;
}>;

export type ServerVariableObject = Partial<{
  enum: string[];
  default: string;
  description: string;
  examples: string[];
}>;

export type SecurityRequirementObject = PatternField<string[]>;

export type ServerBindingsObject = Partial<{
  http: HttpServerBinding;
  ws: WebSocketsServerBinding;
  kafka: KafkaServerBinding;
  amqp: AmqpServerBinding;
  amqp1: Amqp1ServerBinding;
  mqtt: MqttServerBinding;
  mqtt5: Mqtt5ServerBinding;
  nats: NatsServerBinding;
  jms: JmsServerBinding;
  sns: SnsServerBinding;
  sqs: SqsServerBinding;
  stomp: StompServerBinding;
  redis: RedisServerBinding;
}>;

export type ChannelItemObject = Partial<
  ReferenceObject & {
    description: string;
    subscribe: OperationObject;
    publish: OperationObject;
    parameters: PatternField<ParameterObject | ReferenceObject>;
    bindings: ChannelBindingsObject;
  }
>;

// TODO: Add detailed ChannelBindingsObject type in the future
export type ChannelBindingsObject = SchemaObject;

export type TagObject = Partial<{
  name: string;
  description: string;
  externalDocs: ExternalDocumentationObject;
}>;

export type ExternalDocumentationObject = Partial<{
  description: string;
  url: string;
}>;

export type OperationObject = Partial<{
  operationId: string;
  summary: string;
  description: string;
  tags: TagObject[];
  externalDocs: ExternalDocumentationObject;
  bindings: Map<string, OperationBindingsObject>;
  traits: OperationTraitObject[];
  parameters?: (ReferenceObject | ParameterObject)[];
  message: MessageObject;
}>;

export type MessageObject = Partial<{
  headers: SchemaObject | ReferenceObject;
  payload: any;
  correlationId: CorrelationIdObject | ReferenceObject;
  schemaFormat: string;
  contentType: string;
  name: string;
  title: string;
  summary: string;
  description: string;
  tags: TagObject[];
  externalDocs: ExternalDocumentationObject;
  bindings: MessageBindingsObject;
  examples: Map<string, any>;
  traits: MessageTraitObject;
}>;

export type MessageTraitObject = Partial<{
  headers: SchemaObject | ReferenceObject;
  correlationId: CorrelationIdObject | ReferenceObject;
  schemaFormat: string;
  contentType: string;
  name: string;
  title: string;
  summary: string;
  description: string;
  tags: TagObject[];
  externalDocs: ExternalDocumentationObject;
  bindings: MessageBindingsObject;
  examples: Map<string, any>;
}>;

export type CorrelationIdObject = {
  description?: string;
  location: string;
};

// TODO: Add detailed OperationBindingsObject type in the future
export type OperationBindingsObject = SchemaObject;
// TODO: Add detailed MessageBindingsObject type in the future
export type MessageBindingsObject = SchemaObject;

export type OperationTraitObject = Partial<{
  operationId: string;
  summary: string;
  description: string;
  tags: TagObject[];
  externalDocs: ExternalDocumentationObject;
  bindings: OperationBindingsObject;
}>;

export type ParameterObject = Partial<{
  description: string;
  schema: SchemaObject;
  location: string;
}>;

export type ReferenceObject = { $ref: string };

export type SchemaObject = ReferenceObject | JSONSchema;
