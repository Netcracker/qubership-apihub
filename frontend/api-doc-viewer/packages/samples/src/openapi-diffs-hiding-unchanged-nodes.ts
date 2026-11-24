/**
 * OpenAPI diff cases for "show / hide unchanged nodes" in security scheme cards.
 *
 * Built programmatically, not stored as YAML pairs: one operation template plus one fragment per
 * security scheme kind. A fragment renders its scheme definition (and the scopes the requirement
 * lists) for `hasChanges: false` (the before document, and the after document of an unchanged
 * scheme) and `hasChanges: true` (the after document of a changed scheme). A case is a list of
 * fragments with a flag each; every scheme of a case is one card of the same security alternative.
 *
 * Changed variants change one or two content rows only (never the title row): the card must still
 * show every row then. Unchanged variants must leave only the title row visible plus the
 * `Show N unchanged rows` trigger.
 *
 * A case may also add or remove the anonymous alternative `{}` (`anonymous`): that changes the
 * Security title row only (`Optional` badge) and must not reveal any card.
 *
 * Design: docs/design/openapi/features/hiding-unchanged-nodes.md
 * Catalogue: packages/samples/README.md -> "OpenAPI hiding unchanged nodes"
 */

export type OpenApiHidingUnchangedDialect = "3.0" | "3.1";

export type OpenApiSecuritySchemeFragmentState = {
  /** `components.securitySchemes[name]`. */
  readonly definition: Record<string, unknown>;
  /** Scopes (or OAS 3.1 roles) the security requirement lists for the scheme. */
  readonly requiredScopes: readonly string[];
};

export type OpenApiSecuritySchemeFragment = {
  /** Scheme name (requirement key and `components.securitySchemes` key). */
  readonly name: string;
  /** Lowest dialect the scheme type exists in (`mutualTLS` is OAS 3.1 only). */
  readonly dialect: OpenApiHidingUnchangedDialect;
  /** What the changed variant changes (catalogue text). */
  readonly change: string;
  readonly build: (hasChanges: boolean) => OpenApiSecuritySchemeFragmentState;
};

const DESCRIPTION = "Long-lived key issued in the developer portal.";

export const OPENAPI_SECURITY_SCHEME_FRAGMENTS = {
  apiKeyHeader: {
    name: "api_key_header",
    dialect: "3.0",
    change: "parameter name replaced",
    build: (hasChanges) => ({
      definition: {
        type: "apiKey",
        description: DESCRIPTION,
        in: "header",
        name: hasChanges ? "X-Api-Token" : "X-API-Key",
      },
      requiredScopes: [],
    }),
  },
  apiKeyQuery: {
    name: "api_key_query",
    dialect: "3.0",
    change: "description replaced",
    build: (hasChanges) => ({
      definition: {
        type: "apiKey",
        description: hasChanges ? "Key passed in the query string (deprecated, use the header)." : "Key passed in the query string.",
        in: "query",
        name: "api_key",
      },
      requiredScopes: [],
    }),
  },
  apiKeyCookie: {
    name: "api_key_cookie",
    dialect: "3.0",
    change: "parameter location replaced (cookie -> header)",
    build: (hasChanges) => ({
      definition: {
        type: "apiKey",
        description: "Session key set by the login page.",
        in: hasChanges ? "header" : "cookie",
        name: "session_id",
      },
      requiredScopes: [],
    }),
  },
  httpBasic: {
    name: "http_basic",
    dialect: "3.0",
    change: "description added",
    build: (hasChanges) => ({
      definition: {
        type: "http",
        scheme: "basic",
        ...(hasChanges ? { description: "User name and password of a service account." } : {}),
      },
      requiredScopes: [],
    }),
  },
  httpBearer: {
    name: "http_bearer",
    dialect: "3.0",
    change: "bearer format replaced",
    build: (hasChanges) => ({
      definition: {
        type: "http",
        description: "Access token of the identity provider.",
        scheme: "bearer",
        bearerFormat: hasChanges ? "PASETO" : "JWT",
      },
      requiredScopes: [],
    }),
  },
  openIdConnect: {
    name: "openid_connect",
    dialect: "3.0",
    change: "required scope added to the requirement",
    build: (hasChanges) => ({
      definition: {
        type: "openIdConnect",
        description: "Sign-in through the corporate identity provider.",
        openIdConnectUrl: "https://auth.example.com/.well-known/openid-configuration",
      },
      requiredScopes: hasChanges ? ["openid", "profile", "email"] : ["openid", "profile"],
    }),
  },
  oauth2SingleFlow: {
    name: "oauth2_single_flow",
    dialect: "3.0",
    change: "token URL and refresh URL replaced",
    build: (hasChanges) => ({
      definition: {
        type: "oauth2",
        description: "Authorization code flow for interactive clients.",
        flows: {
          authorizationCode: {
            authorizationUrl: "https://auth.example.com/authorize",
            tokenUrl: hasChanges ? "https://auth.example.com/v2/token" : "https://auth.example.com/token",
            refreshUrl: hasChanges ? "https://auth.example.com/v2/refresh" : "https://auth.example.com/refresh",
            scopes: {
              "orders:read": "Read orders",
              "orders:write": "Modify orders",
            },
          },
        },
      },
      requiredScopes: ["orders:write"],
    }),
  },
  oauth2AllFlows: {
    name: "oauth2_all_flows",
    dialect: "3.0",
    change: "one scope description replaced in the client credentials flow (other flows unchanged)",
    build: (hasChanges) => ({
      definition: {
        type: "oauth2",
        description: "Every OAuth 2.0 flow the server supports.",
        flows: {
          implicit: {
            authorizationUrl: "https://auth.example.com/authorize",
            scopes: { "orders:read": "Read orders" },
          },
          password: {
            tokenUrl: "https://auth.example.com/token",
            scopes: { "orders:read": "Read orders" },
          },
          clientCredentials: {
            tokenUrl: "https://auth.example.com/token",
            scopes: {
              "orders:read": "Read orders",
              "orders:write": hasChanges ? "Create, modify, and cancel orders" : "Modify orders",
            },
          },
          authorizationCode: {
            authorizationUrl: "https://auth.example.com/authorize",
            tokenUrl: "https://auth.example.com/token",
            scopes: { "orders:read": "Read orders" },
          },
        },
      },
      requiredScopes: ["orders:read"],
    }),
  },
  mutualTls: {
    name: "mutual_tls",
    dialect: "3.1",
    change: "description replaced",
    build: (hasChanges) => ({
      definition: {
        type: "mutualTLS",
        description: hasChanges ? "Client certificate issued by the partner CA." : "Client certificate issued by the internal CA.",
      },
      requiredScopes: [],
    }),
  },
} as const satisfies Record<string, OpenApiSecuritySchemeFragment>;

export type OpenApiSecuritySchemeFragmentKey = keyof typeof OPENAPI_SECURITY_SCHEME_FRAGMENTS;

export type OpenApiHidingUnchangedSchemeEntry = {
  readonly fragment: OpenApiSecuritySchemeFragmentKey;
  readonly hasChanges: boolean;
};

export type OpenApiHidingUnchangedCase = {
  /** Folder-like id: `NN-slug` (story export `Case_NN_slug`). */
  readonly caseId: string;
  readonly title: string;
  readonly dialect: OpenApiHidingUnchangedDialect;
  /** Cards of the (only) security alternative, in requirement order. */
  readonly schemes: readonly OpenApiHidingUnchangedSchemeEntry[];
  /** The anonymous alternative `{}` after the schemes' one, per side; absent = on neither side. */
  readonly anonymous?: { readonly before: boolean; readonly after: boolean };
};

export const OPENAPI_HIDING_UNCHANGED_OPERATION = { path: "/orders/{orderId}", method: "post" } as const;

const OPENAPI_VERSIONS: Record<OpenApiHidingUnchangedDialect, string> = {
  "3.0": "3.0.3",
  "3.1": "3.1.0",
};

/**
 * The operation template: the same minimal operation for every case, security from the fragments;
 * `allowsAnonymous` appends the anonymous alternative `{}`.
 */
export function buildOpenApiHidingUnchangedDocument(
  dialect: OpenApiHidingUnchangedDialect,
  schemes: ReadonlyArray<{ readonly fragment: OpenApiSecuritySchemeFragmentKey; readonly hasChanges: boolean }>,
  allowsAnonymous = false,
): Record<string, unknown> {
  const requirement: Record<string, string[]> = {};
  const securitySchemes: Record<string, Record<string, unknown>> = {};
  for (const { fragment, hasChanges } of schemes) {
    const { name, build } = OPENAPI_SECURITY_SCHEME_FRAGMENTS[fragment];
    const state = build(hasChanges);
    requirement[name] = [...state.requiredScopes];
    securitySchemes[name] = state.definition;
  }
  return {
    openapi: OPENAPI_VERSIONS[dialect],
    info: { title: "Orders", version: "1.0.0" },
    paths: {
      [OPENAPI_HIDING_UNCHANGED_OPERATION.path]: {
        [OPENAPI_HIDING_UNCHANGED_OPERATION.method]: {
          operationId: "updateOrder",
          summary: "Update an order",
          security: allowsAnonymous ? [requirement, {}] : [requirement],
          parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Updated order." } },
        },
      },
    },
    components: { securitySchemes },
  };
}

/** Before: every scheme unchanged. After: each scheme as its `hasChanges` flag says. */
export function buildOpenApiHidingUnchangedDocuments(testCase: OpenApiHidingUnchangedCase): {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
} {
  return {
    before: buildOpenApiHidingUnchangedDocument(
      testCase.dialect,
      testCase.schemes.map(({ fragment }) => ({ fragment, hasChanges: false })),
      testCase.anonymous?.before,
    ),
    after: buildOpenApiHidingUnchangedDocument(testCase.dialect, testCase.schemes, testCase.anonymous?.after),
  };
}

const SINGLE_SCHEME_CASES: ReadonlyArray<readonly [OpenApiSecuritySchemeFragmentKey, string, string]> = [
  ["apiKeyHeader", "api-key-header", "API key in a header"],
  ["apiKeyQuery", "api-key-query", "API key in the query"],
  ["apiKeyCookie", "api-key-cookie", "API key in a cookie"],
  ["httpBasic", "http-basic", "HTTP basic"],
  ["httpBearer", "http-bearer", "HTTP bearer"],
  ["openIdConnect", "openid-connect", "OpenID Connect"],
  ["oauth2SingleFlow", "oauth2-single-flow", "OAuth 2.0, one flow"],
  ["oauth2AllFlows", "oauth2-all-flows", "OAuth 2.0, all four flows"],
  ["mutualTls", "mutual-tls", "Mutual TLS (OAS 3.1)"],
];

function caseNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function collectCases(): OpenApiHidingUnchangedCase[] {
  const cases: OpenApiHidingUnchangedCase[] = [];
  const push = (
    slug: string,
    title: string,
    dialect: OpenApiHidingUnchangedDialect,
    schemes: OpenApiHidingUnchangedSchemeEntry[],
    anonymous?: OpenApiHidingUnchangedCase["anonymous"],
  ): void => {
    cases.push({ caseId: `${caseNumber(cases.length)}-${slug}`, title, dialect, schemes, ...(anonymous ? { anonymous } : {}) });
  };
  // Every scheme kind in both states: unchanged (title row + trigger), then changed (every row).
  for (const [fragment, slug, title] of SINGLE_SCHEME_CASES) {
    const { dialect, change } = OPENAPI_SECURITY_SCHEME_FRAGMENTS[fragment];
    push(`${slug}-unchanged`, `${title}: unchanged`, dialect, [{ fragment, hasChanges: false }]);
    push(`${slug}-changed`, `${title}: ${change}`, dialect, [{ fragment, hasChanges: true }]);
  }
  // Cards are decided one by one: the unchanged card collapses next to the changed one.
  push("two-schemes-first-unchanged-second-changed", "Two cards: API key header unchanged, OAuth 2.0 all flows changed", "3.0", [
    { fragment: "apiKeyHeader", hasChanges: false },
    { fragment: "oauth2AllFlows", hasChanges: true },
  ]);
  push("two-schemes-first-changed-second-unchanged", "Two cards: HTTP bearer changed, OpenID Connect unchanged", "3.0", [
    { fragment: "httpBearer", hasChanges: true },
    { fragment: "openIdConnect", hasChanges: false },
  ]);
  push("three-schemes-all-unchanged", "Three cards: all unchanged", "3.0", [
    { fragment: "apiKeyCookie", hasChanges: false },
    { fragment: "httpBasic", hasChanges: false },
    { fragment: "oauth2SingleFlow", hasChanges: false },
  ]);
  // An anonymous alternative change is not a change of any card: both cards stay collapsed.
  const unchangedPair: OpenApiHidingUnchangedSchemeEntry[] = [
    { fragment: "apiKeyHeader", hasChanges: false },
    { fragment: "oauth2SingleFlow", hasChanges: false },
  ];
  push("anonymous-added-cards-unchanged", "`{}` added (`Optional` badge), two unchanged cards stay collapsed", "3.0", unchangedPair, { before: false, after: true });
  push("anonymous-removed-cards-unchanged", "`{}` removed (`Optional` badge), two unchanged cards stay collapsed", "3.0", unchangedPair, { before: true, after: false });
  return cases;
}

export const openApiHidingUnchangedCases: readonly OpenApiHidingUnchangedCase[] = collectCases();
