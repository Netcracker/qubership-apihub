/**
 * Case definitions of the AsyncAPI Security suites (plain and diffs), read by
 * `bin/generate-async-api-security-suite.mjs`. Every case is one base AsyncAPI 3.0 document
 * (`sendOperation` / `TestMessage` on `testChannel`, served by `server0`) with security applied by
 * mutators. Design: docs/design/async-api/features/security.md
 */

/** Security schemes every case may reference (`components.securitySchemes`). */
export const SCHEMES = {
  userPassword: { type: "userPassword" },
  apiKeyUser: { type: "apiKey", in: "user" },
  apiKeyPassword: { type: "apiKey", in: "password" },
  x509: { type: "X509" },
  symmetric: { type: "symmetricEncryption" },
  asymmetric: { type: "asymmetricEncryption" },
  headerKey: { type: "httpApiKey", name: "X-API-Key", in: "header" },
  queryKey: { type: "httpApiKey", name: "api_key", in: "query" },
  cookieKey: { type: "httpApiKey", name: "session", in: "cookie" },
  basic: { type: "http", scheme: "basic" },
  bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
  oauthImplicit: {
    type: "oauth2",
    flows: {
      implicit: {
        authorizationUrl: "https://auth.example.com/authorize",
        availableScopes: { "events:read": "Read events", "events:write": "Publish events" },
      },
    },
    scopes: ["events:read"],
  },
  oauthPassword: {
    type: "oauth2",
    flows: {
      password: {
        tokenUrl: "https://auth.example.com/token",
        availableScopes: { "events:read": "Read events" },
      },
    },
    scopes: [],
  },
  oauth: {
    type: "oauth2",
    flows: {
      clientCredentials: {
        tokenUrl: "https://auth.example.com/token",
        availableScopes: { "events:read": "Read events", "events:write": "Publish events" },
      },
    },
    scopes: ["events:write"],
  },
  oauthCode: {
    type: "oauth2",
    flows: {
      authorizationCode: {
        authorizationUrl: "https://auth.example.com/authorize",
        tokenUrl: "https://auth.example.com/token",
        refreshUrl: "https://auth.example.com/refresh",
        availableScopes: { "events:read": "Read events" },
      },
    },
    scopes: ["events:read"],
  },
  oauthSeveralFlows: {
    type: "oauth2",
    flows: {
      clientCredentials: {
        tokenUrl: "https://auth.example.com/token",
        availableScopes: { "events:read": "Read events" },
      },
      authorizationCode: {
        authorizationUrl: "https://auth.example.com/authorize",
        tokenUrl: "https://auth.example.com/token",
        availableScopes: { "events:read": "Read events", "events:admin": "Administer events" },
      },
    },
    scopes: ["events:read", "events:audit"],
  },
  oidc: {
    type: "openIdConnect",
    openIdConnectUrl: "https://auth.example.com/.well-known/openid-configuration",
    scopes: ["openid", "events:read"],
  },
  plain: { type: "plain" },
  scram256: { type: "scramSha256" },
  scram512: { type: "scramSha512" },
  gssapi: { type: "gssapi" },
}

const clone = (value) => structuredClone(value)

/** The base document; `security` is set by the mutators. */
export function createBase() {
  return {
    asyncapi: "3.0.0",
    info: { title: "Sample AsyncAPI", version: "1.0.0" },
    servers: {
      server0: { host: "broker-0.example.com:9092", protocol: "kafka", description: "Main Kafka broker" },
    },
    channels: {
      testChannel: {
        address: "events.default",
        messages: { TestMessage: { $ref: "#/components/messages/TestMessage" } },
        servers: [{ $ref: "#/servers/server0" }],
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
        TestMessage: {
          name: "TestMessage",
          payload: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        },
      },
      securitySchemes: clone(SCHEMES),
    },
  }
}

const ref = (name) => ({ $ref: `#/components/securitySchemes/${name}` })
const operation = (doc) => doc.operations.sendOperation
const server = (doc) => doc.servers.server0
const scheme = (doc, name) => doc.components.securitySchemes[name]

/** Operation security: a list of scheme names (references). */
const operationSecurity = (...names) => (doc) => { operation(doc).security = names.map(ref) }
/** Server security: a list of scheme names (references). */
const serverSecurity = (...names) => (doc) => { server(doc).security = names.map(ref) }

/* ─── Plain suite ─────────────────────────────────────────────────────────── */

/**
 * Plain cases: [case id, title, mutator, section] — section `operation` (message root) or
 * `server` (Channel section: the test clicks it before the capture).
 */
export const PLAIN_CASES = [
  ["01-user-password", "`userPassword`", operationSecurity("userPassword"), "operation"],
  ["02-api-key-in-user", "`apiKey` in the user part", operationSecurity("apiKeyUser"), "operation"],
  ["03-api-key-in-password", "`apiKey` in the password part", operationSecurity("apiKeyPassword"), "operation"],
  ["04-x509", "`X509` certificate", operationSecurity("x509"), "operation"],
  ["05-symmetric-encryption", "`symmetricEncryption`", operationSecurity("symmetric"), "operation"],
  ["06-asymmetric-encryption", "`asymmetricEncryption`", operationSecurity("asymmetric"), "operation"],
  ["07-http-api-key-header", "`httpApiKey` in a header", operationSecurity("headerKey"), "operation"],
  ["08-http-api-key-query", "`httpApiKey` in the query", operationSecurity("queryKey"), "operation"],
  ["09-http-api-key-cookie", "`httpApiKey` in a cookie", operationSecurity("cookieKey"), "operation"],
  ["10-http-basic", "`http` basic", operationSecurity("basic"), "operation"],
  ["11-http-bearer-format", "`http` bearer with a bearer format", operationSecurity("bearer"), "operation"],
  ["12-oauth2-implicit-required-scope", "`oauth2` implicit flow, one required scope", operationSecurity("oauthImplicit"), "operation"],
  ["13-oauth2-password-no-required-scopes", "`oauth2` password flow, no required scopes", operationSecurity("oauthPassword"), "operation"],
  ["14-oauth2-client-credentials-required-scope", "`oauth2` client credentials flow, one required scope", operationSecurity("oauth"), "operation"],
  ["15-oauth2-authorization-code-all-urls", "`oauth2` authorization code flow with all URLs", operationSecurity("oauthCode"), "operation"],
  ["16-oauth2-several-flows-undeclared-scope", "`oauth2` with two flows and a required scope no flow declares", operationSecurity("oauthSeveralFlows"), "operation"],
  ["17-openid-connect-required-scopes", "`openIdConnect` with required scopes", operationSecurity("oidc"), "operation"],
  ["18-sasl-plain", "`plain` (SASL)", operationSecurity("plain"), "operation"],
  ["19-scram-sha-256", "`scramSha256`", operationSecurity("scram256"), "operation"],
  ["20-scram-sha-512", "`scramSha512`", operationSecurity("scram512"), "operation"],
  ["21-gssapi", "`gssapi`", operationSecurity("gssapi"), "operation"],
  ["22-scheme-description", "scheme with a markdown description", (doc) => {
    scheme(doc, "bearer").description = "JWT issued by the **events** identity provider."
    operationSecurity("bearer")(doc)
  }, "operation"],
  ["23-several-alternatives", "three alternatives (one scheme each)", operationSecurity("oauth", "headerKey", "scram512"), "operation"],
  ["24-inline-scheme", "an inline scheme (no `components` entry)", (doc) => {
    operation(doc).security = [{ type: "http", scheme: "basic", description: "Inline basic authentication." }]
  }, "operation"],
  ["25-server-security", "server security only", serverSecurity("userPassword", "x509"), "server"],
  ["26-operation-and-server-security", "operation and server security", (doc) => {
    operationSecurity("oauth")(doc)
    serverSecurity("scram256")(doc)
  }, "server"],
]

/* ─── Diffs suite ─────────────────────────────────────────────────────────── */

/**
 * Diff cases: [case id, title, before mutator, after mutator, section]. Both mutators start from
 * the base document.
 */
export const DIFF_CASES = [
  // Operation security
  ["1.1-operation-security-added", "operation security added", undefined, operationSecurity("oauth"), "operation"],
  ["1.2-operation-security-removed", "operation security removed", operationSecurity("oauth"), undefined, "operation"],
  ["1.3-alternative-added", "second alternative added", operationSecurity("oauth"), operationSecurity("oauth", "headerKey"), "operation"],
  ["1.4-alternative-removed", "second alternative removed", operationSecurity("oauth", "headerKey"), operationSecurity("oauth"), "operation"],
  ["1.5-scheme-description-added", "scheme description added", operationSecurity("bearer"), (doc) => {
    scheme(doc, "bearer").description = "JWT issued by the identity provider."
    operationSecurity("bearer")(doc)
  }, "operation"],
  ["1.6-scheme-description-removed", "scheme description removed", (doc) => {
    scheme(doc, "bearer").description = "JWT issued by the identity provider."
    operationSecurity("bearer")(doc)
  }, operationSecurity("bearer"), "operation"],
  ["1.7-scheme-description-changed", "scheme description replaced", (doc) => {
    scheme(doc, "bearer").description = "JWT issued by the identity provider."
    operationSecurity("bearer")(doc)
  }, (doc) => {
    scheme(doc, "bearer").description = "JWT issued by the events identity provider."
    operationSecurity("bearer")(doc)
  }, "operation"],
  ["1.8-scheme-type-changed", "scheme type replaced (`userPassword` → `X509`)", operationSecurity("userPassword"), (doc) => {
    scheme(doc, "userPassword").type = "X509"
    operationSecurity("userPassword")(doc)
  }, "operation"],
  ["1.9-http-api-key-location-changed", "`httpApiKey` location replaced (header → query)", operationSecurity("headerKey"), (doc) => {
    scheme(doc, "headerKey").in = "query"
    operationSecurity("headerKey")(doc)
  }, "operation"],
  ["1.10-http-api-key-name-changed", "`httpApiKey` parameter name replaced", operationSecurity("headerKey"), (doc) => {
    scheme(doc, "headerKey").name = "X-Events-Key"
    operationSecurity("headerKey")(doc)
  }, "operation"],
  ["1.11-api-key-location-changed", "`apiKey` location replaced (user → password)", operationSecurity("apiKeyUser"), (doc) => {
    scheme(doc, "apiKeyUser").in = "password"
    operationSecurity("apiKeyUser")(doc)
  }, "operation"],
  ["1.12-http-scheme-changed", "`http` scheme replaced (basic → digest)", operationSecurity("basic"), (doc) => {
    scheme(doc, "basic").scheme = "digest"
    operationSecurity("basic")(doc)
  }, "operation"],
  ["1.13-bearer-format-added", "bearer format added", (doc) => {
    delete scheme(doc, "bearer").bearerFormat
    operationSecurity("bearer")(doc)
  }, operationSecurity("bearer"), "operation"],
  ["1.14-bearer-format-removed", "bearer format removed", operationSecurity("bearer"), (doc) => {
    delete scheme(doc, "bearer").bearerFormat
    operationSecurity("bearer")(doc)
  }, "operation"],
  ["1.15-openid-connect-url-changed", "OpenID Connect URL replaced", operationSecurity("oidc"), (doc) => {
    scheme(doc, "oidc").openIdConnectUrl = "https://login.example.com/.well-known/openid-configuration"
    operationSecurity("oidc")(doc)
  }, "operation"],
  ["1.16-required-scope-added", "required scope added", operationSecurity("oauth"), (doc) => {
    scheme(doc, "oauth").scopes.push("events:read")
    operationSecurity("oauth")(doc)
  }, "operation"],
  ["1.17-required-scope-removed", "required scope removed", operationSecurity("oauth"), (doc) => {
    scheme(doc, "oauth").scopes = []
    operationSecurity("oauth")(doc)
  }, "operation"],
  ["1.18-oauth-flow-added", "OAuth flow added", operationSecurity("oauth"), (doc) => {
    scheme(doc, "oauth").flows.implicit = {
      authorizationUrl: "https://auth.example.com/authorize",
      availableScopes: { "events:read": "Read events" },
    }
    operationSecurity("oauth")(doc)
  }, "operation"],
  ["1.19-oauth-flow-removed", "OAuth flow removed", (doc) => {
    scheme(doc, "oauth").flows.implicit = {
      authorizationUrl: "https://auth.example.com/authorize",
      availableScopes: { "events:read": "Read events" },
    }
    operationSecurity("oauth")(doc)
  }, operationSecurity("oauth"), "operation"],
  ["1.20-token-url-changed", "token URL replaced", operationSecurity("oauth"), (doc) => {
    scheme(doc, "oauth").flows.clientCredentials.tokenUrl = "https://login.example.com/token"
    operationSecurity("oauth")(doc)
  }, "operation"],
  ["1.21-refresh-url-added", "refresh URL added", operationSecurity("oauth"), (doc) => {
    scheme(doc, "oauth").flows.clientCredentials.refreshUrl = "https://auth.example.com/refresh"
    operationSecurity("oauth")(doc)
  }, "operation"],
  ["1.22-refresh-url-removed", "refresh URL removed", (doc) => {
    scheme(doc, "oauth").flows.clientCredentials.refreshUrl = "https://auth.example.com/refresh"
    operationSecurity("oauth")(doc)
  }, operationSecurity("oauth"), "operation"],
  ["1.23-flow-scope-added", "flow scope added", operationSecurity("oauth"), (doc) => {
    scheme(doc, "oauth").flows.clientCredentials.availableScopes["events:admin"] = "Administer events"
    operationSecurity("oauth")(doc)
  }, "operation"],
  ["1.24-flow-scope-removed", "flow scope removed", (doc) => {
    scheme(doc, "oauth").flows.clientCredentials.availableScopes["events:admin"] = "Administer events"
    operationSecurity("oauth")(doc)
  }, operationSecurity("oauth"), "operation"],
  ["1.25-flow-scope-description-changed", "flow scope description replaced", operationSecurity("oauth"), (doc) => {
    scheme(doc, "oauth").flows.clientCredentials.availableScopes["events:read"] = "Read all events"
    operationSecurity("oauth")(doc)
  }, "operation"],
  // Server security
  ["2.1-server-security-added", "server security added", undefined, serverSecurity("userPassword"), "server"],
  ["2.2-server-security-removed", "server security removed", serverSecurity("userPassword"), undefined, "server"],
  ["2.3-server-alternative-added", "second server alternative added", serverSecurity("userPassword"), serverSecurity("userPassword", "x509"), "server"],
  ["2.4-server-alternative-removed", "second server alternative removed", serverSecurity("userPassword", "x509"), serverSecurity("userPassword"), "server"],
  ["2.5-server-scheme-description-changed", "server scheme description replaced", (doc) => {
    scheme(doc, "scram256").description = "SCRAM credentials from the vault."
    serverSecurity("scram256")(doc)
  }, (doc) => {
    scheme(doc, "scram256").description = "SCRAM credentials from the secrets store."
    serverSecurity("scram256")(doc)
  }, "server"],
  ["2.6-server-scheme-type-changed", "server scheme type replaced (`scramSha256` → `scramSha512`)", serverSecurity("scram256"), (doc) => {
    scheme(doc, "scram256").type = "scramSha512"
    serverSecurity("scram256")(doc)
  }, "server"],
  ["2.7-server-with-security-added", "second server (with security) added", serverSecurity("userPassword"), (doc) => {
    serverSecurity("userPassword")(doc)
    doc.servers.server1 = { host: "broker-1.example.com:9093", protocol: "kafka-secure", security: [ref("x509")] }
    doc.channels.testChannel.servers.push({ $ref: "#/servers/server1" })
  }, "server"],
  ["2.8-server-with-security-removed", "second server (with security) removed", (doc) => {
    serverSecurity("userPassword")(doc)
    doc.servers.server1 = { host: "broker-1.example.com:9093", protocol: "kafka-secure", security: [ref("x509")] }
    doc.channels.testChannel.servers.push({ $ref: "#/servers/server1" })
  }, serverSecurity("userPassword"), "server"],
]
