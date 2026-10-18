/***
 * This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export type HttpServerBinding = {};

/***
 * This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export type WebSocketsServerBinding = {};

export type KafkaServerBinding = Partial<{
  schemaRegistryUrl: string;
  schemaRegistryVendor: string;
  bindingVersion: string;
}>;

/***
 * This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export type AmqpServerBinding = {};

/***
 * This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export type Amqp1ServerBinding = {};

/***
 * This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export type MqttServerBinding = {};

/***
 * This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export type Mqtt5ServerBinding = {};

/***
 * This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export type NatsServerBinding = {};

/***
 * This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export type JmsServerBinding = {};

/***
 * This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export type SnsServerBinding = {};

/***
 * This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export type SqsServerBinding = {};

/***
 * This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export type StompServerBinding = {};

/***
 * This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export type RedisServerBinding = {};
