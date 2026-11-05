/**
 * Cases of the `* Suite (Display Mode = simple)` and `* Diffs Suite (Display Mode = simple)` suites
 * (AsyncAPI, OpenAPI, JSON Schema, DDL API), read by `bin/generate-display-mode-simple-suites.mjs`.
 *
 * One case = one element the `simple` display mode hides (an annotation, design:
 * docs/design/shared/features/display-mode-annotations.md; DDL: docs/design/ddlapi/features/doc-view.md).
 * The document is the API type's minimal base plus that element only. `values` is
 * `[plain / before, after]`: the plain fixture uses the first value, the diff pair replaces it with
 * the second (one "changed" case per element). A case with one value has no diff counterpart.
 * ITs capture every case in display modes `detailed` and `simple`.
 */

// ─── AsyncAPI ────────────────────────────────────────────────────────────────────────────────
// Section the case opens before the capture: the message header (no click), or the
// `content` / `channel` / `operation` tab of the message sections.

const asyncApiBase = () => ({
  asyncapi: "3.0.0",
  info: { title: "Display mode", version: "1.0.0" },
  channels: {
    testChannel: {
      address: "events.default",
      messages: { TestMessage: { $ref: "#/components/messages/TestMessage" } },
    },
  },
  operations: {
    sendOperation: {
      action: "send",
      channel: { $ref: "#/channels/testChannel" },
      messages: [{ $ref: "#/components/messages/TestMessage" }],
    },
  },
  components: {
    messages: {
      TestMessage: { name: "TestMessage" },
    },
  },
});

const withAsyncApi = (mutate) => (value) => {
  const document = asyncApiBase();
  mutate(document, value);
  return document;
};

const asyncApiServer = (document, server) => {
  document.servers = { server0: { host: "broker.example.com:9092", protocol: "kafka", ...server } };
  document.channels.testChannel.servers = [{ $ref: "#/servers/server0" }];
};

export const ASYNC_API_CASES = [
  {
    slug: "operation-summary",
    title: "Operation `summary`",
    section: "operation",
    values: ["Publishes an event", "Publishes an order event"],
    build: withAsyncApi((d, v) => { d.operations.sendOperation.summary = v; }),
  },
  {
    slug: "operation-description",
    title: "Operation `description`",
    section: "operation",
    values: ["Sends the event to the broker.", "Sends the event to the order broker."],
    build: withAsyncApi((d, v) => { d.operations.sendOperation.description = v; }),
  },
  {
    slug: "message-summary",
    title: "Message `summary` (message header)",
    values: ["Event message", "Order event message"],
    build: withAsyncApi((d, v) => { d.components.messages.TestMessage.summary = v; }),
  },
  {
    slug: "message-description",
    title: "Message `description` (message header)",
    values: ["Carries one event.", "Carries one order event."],
    build: withAsyncApi((d, v) => { d.components.messages.TestMessage.description = v; }),
  },
  {
    slug: "channel-summary",
    title: "Channel `summary`",
    section: "channel",
    values: ["Event channel", "Order event channel"],
    build: withAsyncApi((d, v) => { d.channels.testChannel.summary = v; }),
  },
  {
    slug: "channel-description",
    title: "Channel `description`",
    section: "channel",
    values: ["Default event stream.", "Default order event stream."],
    build: withAsyncApi((d, v) => { d.channels.testChannel.description = v; }),
  },
  {
    slug: "server-summary",
    title: "Server `summary` (Channel tab)",
    section: "channel",
    values: ["Main broker", "Main order broker"],
    build: withAsyncApi((d, v) => { asyncApiServer(d, { summary: v }); }),
  },
  {
    slug: "server-description",
    title: "Server `description` (Channel tab)",
    section: "channel",
    values: ["Kafka broker of the events cluster.", "Kafka broker of the orders cluster."],
    build: withAsyncApi((d, v) => { asyncApiServer(d, { description: v }); }),
  },
  {
    slug: "security-scheme-description",
    title: "Security scheme `description` (operation security)",
    values: ["JWT issued by the identity provider.", "JWT issued by the events identity provider."],
    build: withAsyncApi((d, v) => {
      d.operations.sendOperation.security = [{ $ref: "#/components/securitySchemes/bearer" }];
      d.components.securitySchemes = { bearer: { type: "http", scheme: "bearer", description: v } };
    }),
  },
  {
    slug: "security-scope-description",
    title: "OAuth flow scope description (scope name stays)",
    values: ["Read events", "Read all events"],
    build: withAsyncApi((d, v) => {
      d.operations.sendOperation.security = [{ $ref: "#/components/securitySchemes/oauth" }];
      d.components.securitySchemes = {
        oauth: {
          type: "oauth2",
          flows: { clientCredentials: { tokenUrl: "https://auth.example.com/token", availableScopes: { "events:read": v } } },
          scopes: ["events:read"],
        },
      };
    }),
  },
  {
    slug: "payload-schema-description",
    title: "Message payload: JSON Schema property `description` (forwarded display mode)",
    values: ["Event identifier", "Order event identifier"],
    build: withAsyncApi((d, v) => {
      d.components.messages.TestMessage.payload = { type: "object", properties: { id: { type: "string", description: v } } };
    }),
  },
  {
    slug: "headers-schema-description",
    title: "Message headers: JSON Schema property `description` (forwarded display mode)",
    values: ["Trace identifier", "Distributed trace identifier"],
    build: withAsyncApi((d, v) => {
      d.components.messages.TestMessage.headers = { type: "object", properties: { traceId: { type: "string", description: v } } };
    }),
  },
  {
    slug: "channel-parameter-description",
    title: "Channel parameter `description` (Channel tab)",
    section: "channel",
    values: ["Broker region", "Broker data-center region"],
    build: withAsyncApi((d, v) => {
      d.channels.testChannel.address = "events.{region}";
      d.channels.testChannel.parameters = { region: { description: v } };
    }),
  },
  {
    slug: "channel-parameter-location",
    title: "Channel parameter `location` - the `Location` custom annotation row (Channel tab)",
    section: "channel",
    values: ["$message.payload#/region", "$message.header#/region"],
    build: withAsyncApi((d, v) => {
      d.channels.testChannel.address = "events.{region}";
      d.channels.testChannel.parameters = { region: { location: v } };
    }),
  },
  {
    slug: "bindings-schema-description",
    title: "Message Kafka binding `key` schema `description` (JSO -> embedded JSON Schema)",
    values: ["Partition key", "Order partition key"],
    build: withAsyncApi((d, v) => {
      d.components.messages.TestMessage.bindings = { kafka: { key: { type: "string", description: v } } };
    }),
  },
];

// ─── OpenAPI ─────────────────────────────────────────────────────────────────────────────────
// `POST /orders` with a status-only `200` (`responses` is required in OAS 3.0).

const openApiBase = () => ({
  openapi: "3.0.3",
  info: { title: "Orders", version: "1.0.0" },
  paths: {
    "/orders": {
      post: {
        responses: { "200": { description: "" } },
      },
    },
  },
});

const withOpenApi = (mutate) => (value) => {
  const document = openApiBase();
  mutate(document.paths["/orders"].post, value, document);
  return document;
};

export const OPENAPI_CASES = [
  {
    slug: "operation-description",
    title: "Operation `description`",
    values: ["Creates an order.", "Creates an order for the current customer."],
    build: withOpenApi((operation, v) => { operation.description = v; }),
  },
  {
    slug: "request-body-description",
    title: "Request body `description` (Body description row)",
    values: ["Order to create", "Order to create, without an id"],
    build: withOpenApi((operation, v) => {
      operation.requestBody = { description: v, content: { "application/json": { schema: { type: "string" } } } };
    }),
  },
  {
    slug: "response-description",
    title: "Response `description`",
    values: ["Order created", "Order created and queued"],
    build: withOpenApi((operation, v) => { operation.responses["200"].description = v; }),
  },
  {
    slug: "security-scheme-description",
    title: "Security scheme `description` (API key props stay)",
    values: ["Key issued by the developer portal.", "Key issued by the partner portal."],
    build: withOpenApi((operation, v, document) => {
      operation.security = [{ apiKey: [] }];
      document.components = { securitySchemes: { apiKey: { type: "apiKey", in: "header", name: "X-API-Key", description: v } } };
    }),
  },
  {
    slug: "security-scope-description",
    title: "OAuth flow scope description (scope name stays)",
    values: ["Read orders", "Read all orders"],
    build: withOpenApi((operation, v, document) => {
      operation.security = [{ oauth: ["orders:read"] }];
      document.components = {
        securitySchemes: {
          oauth: { type: "oauth2", flows: { clientCredentials: { tokenUrl: "https://auth.example.com/token", scopes: { "orders:read": v } } } },
        },
      };
    }),
  },
  {
    slug: "parameter-description",
    title: "Parameter `description` (JSON Schema description, forwarded display mode)",
    values: ["Maximum number of items", "Maximum number of returned items"],
    build: withOpenApi((operation, v) => {
      operation.parameters = [{ name: "limit", in: "query", description: v, schema: { type: "integer" } }];
    }),
  },
  {
    slug: "parameter-media-type",
    title: "Parameter with `content` - the `Media type` custom annotation row",
    values: ["application/json", "application/xml"],
    build: withOpenApi((operation, v) => {
      operation.parameters = [{ name: "filter", in: "query", content: { [v]: { schema: { type: "object" } } } }];
    }),
  },
  {
    slug: "body-schema-description",
    title: "Request body schema: property `description` (forwarded display mode)",
    values: ["Order identifier", "Client-side order identifier"],
    build: withOpenApi((operation, v) => {
      operation.requestBody = {
        content: { "application/json": { schema: { type: "object", properties: { id: { type: "string", description: v } } } } },
      };
    }),
  },
  {
    slug: "response-header-description",
    title: "Response header `description` (forwarded display mode)",
    values: ["Requests left in the window", "Requests left in the current window"],
    build: withOpenApi((operation, v) => {
      operation.responses["200"].headers = { "X-Rate-Limit": { description: v, schema: { type: "integer" } } };
    }),
  },
  {
    slug: "external-docs",
    title: "Operation `externalDocs` (the external docs link)",
    values: ["https://docs.example.com/orders", "https://docs.example.com/orders/v2"],
    build: withOpenApi((operation, v) => { operation.externalDocs = { url: v, description: "Orders guide" }; }),
  },
];

// ─── JSON Schema ─────────────────────────────────────────────────────────────────────────────
// Plain: the schema itself (`JsonSchemaViewer`). Diffs: the pair wrapped in the OAS 3.0 template
// (`oas: "3.1"` for keywords the OAS 3.0 dialect strips).

const singleProperty = (property) => ({ type: "object", properties: { code: property } });

export const JSON_SCHEMA_CASES = [
  {
    slug: "description",
    title: "`description`",
    values: ["Order identifier", "Client-side order identifier"],
    build: (v) => ({ type: "string", description: v }),
  },
  {
    slug: "deprecation-reason",
    title: "Deprecation reason (`x-deprecated-reason`; the `deprecated` tag stays)",
    values: ["Use id instead", "Use orderId instead"],
    build: (v) => singleProperty({ type: "string", deprecated: true, "x-deprecated-reason": v }),
  },
  {
    slug: "allowed-values",
    title: "`enum` - Allowed values row",
    values: [["new", "paid"], ["new", "shipped"]],
    build: (v) => ({ type: "string", enum: v }),
  },
  {
    slug: "default",
    title: "`default` - Default row",
    values: ["new", "paid"],
    build: (v) => ({ type: "string", default: v }),
  },
  {
    slug: "examples",
    title: "`examples` - Examples row",
    values: [["A-1"], ["B-1"]],
    build: (v) => ({ type: "string", examples: v }),
  },
  {
    slug: "value-range",
    title: "`minimum` / `maximum` - Value range row",
    values: [10, 20],
    build: (v) => ({ type: "integer", minimum: 1, maximum: v }),
  },
  {
    slug: "value-length",
    title: "`minLength` / `maxLength` - Value length row",
    values: [10, 20],
    build: (v) => ({ type: "string", minLength: 1, maxLength: v }),
  },
  {
    slug: "value-pattern",
    title: "`pattern` - Value pattern row",
    values: ["^[A-Z]+$", "^[a-z]+$"],
    build: (v) => ({ type: "string", pattern: v }),
  },
  {
    slug: "value-multiple-of",
    title: "`multipleOf` - Value multipleOf row",
    values: [5, 10],
    build: (v) => ({ type: "number", multipleOf: v }),
  },
  {
    slug: "properties-count",
    title: "`minProperties` - Properties count row",
    values: [1, 2],
    build: (v) => ({ type: "object", minProperties: v }),
  },
  {
    slug: "items-count",
    title: "`minItems` - Items count row",
    values: [1, 2],
    build: (v) => ({ type: "array", items: { type: "string" }, minItems: v }),
  },
  {
    slug: "unique-items",
    title: "`uniqueItems` - Unique items row",
    values: [true, false],
    build: (v) => ({ type: "array", items: { type: "string" }, uniqueItems: v }),
  },
  {
    slug: "allowed-property-names",
    title: "`propertyNames` - allowed additional property names row (OAS 3.1)",
    oas: "3.1",
    values: [["id", "name"], ["id", "code"]],
    build: (v) => ({ type: "object", propertyNames: { enum: v } }),
  },
  {
    // Folded from the former `JSON Schema Suite/Top Level Props Media Types` (plain only: the diffs
    // viewer has no `topLevelPropsMediaTypes`). The media type badges are not annotations and stay
    // in `simple`; the descriptions go.
    slug: "top-level-props-media-types",
    title: "`topLevelPropsMediaTypes` badges stay, property descriptions go (plain only)",
    values: [null],
    topLevelPropsMediaTypes: { complex: "application/json", nested: "application/xml" },
    build: () => ({
      type: "object",
      required: ["complex"],
      properties: {
        simple: { type: "number", description: "Number param" },
        complex: { type: "string", description: "String param" },
        nested: {
          type: "object",
          description: "Object param",
          properties: { complex: { type: "string", description: "Nested property with the same key" } },
        },
      },
    }),
  },
];

// ─── DDL API ─────────────────────────────────────────────────────────────────────────────────
// Table `public.t`; simple mode keeps title rows only (descriptions and the `Values` / `Default` /
// `As` additional-info rows go).

const DDL_HEADER = "CREATE SCHEMA IF NOT EXISTS public;\n\n";

export const DDL_CASES = [
  {
    slug: "table-description",
    title: "Table comment (description row)",
    values: ["Customer orders", "Customer orders, one row per order"],
    build: (v) => `${DDL_HEADER}CREATE TABLE public.t (
  id integer NOT NULL
);

COMMENT ON TABLE public.t IS '${v}';
`,
  },
  {
    slug: "column-description",
    title: "Column comment (description row)",
    values: ["Order title", "Order title shown to the customer"],
    build: (v) => `${DDL_HEADER}CREATE TABLE public.t (
  title text NOT NULL
);

COMMENT ON COLUMN public.t.title IS '${v}';
`,
  },
  {
    slug: "column-default",
    title: "Column `DEFAULT` - Default row",
    values: ["active", "draft"],
    build: (v) => `${DDL_HEADER}CREATE TABLE public.t (
  status text NOT NULL DEFAULT '${v}'
);
`,
  },
  {
    slug: "column-enum-values",
    title: "Enum column - Values row (the type name stays)",
    values: ["'happy', 'sad'", "'happy', 'neutral'"],
    build: (v) => `${DDL_HEADER}CREATE TYPE public.mood AS ENUM (${v});

CREATE TABLE public.t (
  feeling public.mood NOT NULL
);
`,
  },
  {
    slug: "column-generated-expression",
    title: "Expression-generated column - As row (the generated badge stays)",
    values: ["upper(status)", "lower(status)"],
    build: (v) => `${DDL_HEADER}CREATE TABLE public.t (
  status text NOT NULL,
  label text GENERATED ALWAYS AS (${v}) STORED
);
`,
  },
  {
    slug: "index-description",
    title: "Index comment (description row)",
    values: ["Lookup by title", "Lookup by order title"],
    build: (v) => `${DDL_HEADER}CREATE TABLE public.t (
  title text NOT NULL
);

CREATE INDEX t_title_idx ON public.t (title);

COMMENT ON INDEX public.t_title_idx IS '${v}';
`,
  },
];
