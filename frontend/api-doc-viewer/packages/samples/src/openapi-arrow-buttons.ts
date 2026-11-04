/**
 * OpenAPI Operation Suites (Arrow Buttons): toolbars whose options fit or overflow their strip, so
 * the previous / next arrows are disabled or enabled. Built programmatically, not stored as YAML.
 * Design: docs/design/shared/features/arrow-scroll-strip.md -> "Tests".
 */
import { OPENAPI_SECURITY_SCHEME_FRAGMENTS, OpenApiSecuritySchemeFragmentKey } from "./openapi-diffs-hiding-unchanged-nodes";

/** The toolbar a case exercises (a Storybook sub-group per toolbar). */
export type OpenApiArrowButtonsToolbar = "security-toolbar" | "response-codes";

/** One option, or every option (the strip overflows). */
export type OpenApiArrowButtonsLineup = "single" | "every";

export type OpenApiArrowButtonsCase = {
  /** Folder-like id: `NN-slug` (story export `Case_NN_slug`), numbered per toolbar. */
  readonly caseId: string;
  readonly title: string;
  readonly toolbar: OpenApiArrowButtonsToolbar;
  /** Plain cases: the only document. Diffs cases: the after document. */
  readonly lineup: OpenApiArrowButtonsLineup;
  /** Diffs cases only: the before document. */
  readonly beforeLineup?: OpenApiArrowButtonsLineup;
};

export const OPENAPI_ARROW_BUTTONS_OPERATION = { path: "/orders/{orderId}", method: "post" } as const;

/** Single-kind alternatives, in toolbar order; `A + B` alternatives pair neighbouring kinds. */
const SECURITY_KINDS: readonly OpenApiSecuritySchemeFragmentKey[] = [
  "apiKeyHeader",
  "apiKeyQuery",
  "apiKeyCookie",
  "httpBasic",
  "httpBearer",
  "openIdConnect",
  "oauth2SingleFlow",
  "oauth2AllFlows",
  "mutualTls",
];

/**
 * Every IANA-registered HTTP status code except the reserved / deprecated / obsolete ones (305, 306,
 * 418, 510): 59 codes, each class followed by its range key; `default` last.
 */
const RESPONSE_CODES: ReadonlyArray<readonly [string, string]> = [
  ["100", "Continue"], ["101", "Switching Protocols"], ["102", "Processing"], ["103", "Early Hints"],
  ["1XX", "Any informational response"],
  ["200", "OK"], ["201", "Created"], ["202", "Accepted"], ["203", "Non-Authoritative Information"],
  ["204", "No Content"], ["205", "Reset Content"], ["206", "Partial Content"], ["207", "Multi-Status"],
  ["208", "Already Reported"], ["226", "IM Used"],
  ["2XX", "Any successful response"],
  ["300", "Multiple Choices"], ["301", "Moved Permanently"], ["302", "Found"], ["303", "See Other"],
  ["304", "Not Modified"], ["307", "Temporary Redirect"], ["308", "Permanent Redirect"],
  ["3XX", "Any redirection"],
  ["400", "Bad Request"], ["401", "Unauthorized"], ["402", "Payment Required"], ["403", "Forbidden"],
  ["404", "Not Found"], ["405", "Method Not Allowed"], ["406", "Not Acceptable"],
  ["407", "Proxy Authentication Required"], ["408", "Request Timeout"], ["409", "Conflict"],
  ["410", "Gone"], ["411", "Length Required"], ["412", "Precondition Failed"], ["413", "Content Too Large"],
  ["414", "URI Too Long"], ["415", "Unsupported Media Type"], ["416", "Range Not Satisfiable"],
  ["417", "Expectation Failed"], ["421", "Misdirected Request"], ["422", "Unprocessable Content"],
  ["423", "Locked"], ["424", "Failed Dependency"], ["425", "Too Early"], ["426", "Upgrade Required"],
  ["428", "Precondition Required"], ["429", "Too Many Requests"], ["431", "Request Header Fields Too Large"],
  ["451", "Unavailable For Legal Reasons"],
  ["4XX", "Any client error"],
  ["500", "Internal Server Error"], ["501", "Not Implemented"], ["502", "Bad Gateway"],
  ["503", "Service Unavailable"], ["504", "Gateway Timeout"], ["505", "HTTP Version Not Supported"],
  ["506", "Variant Also Negotiates"], ["507", "Insufficient Storage"], ["508", "Loop Detected"],
  ["511", "Network Authentication Required"],
  ["5XX", "Any server error"],
  ["default", "Any other response"],
];

const SINGLE_RESPONSE_CODE = "200";

function securityAlternatives(lineup: OpenApiArrowButtonsLineup): OpenApiSecuritySchemeFragmentKey[][] {
  if (lineup === "single") {
    return [[SECURITY_KINDS[0]]];
  }
  const pairs = SECURITY_KINDS.slice(1).map((kind, index) => [SECURITY_KINDS[index], kind]);
  return [...SECURITY_KINDS.map(kind => [kind]), ...pairs];
}

function buildSecurity(lineup: OpenApiArrowButtonsLineup): {
  security: Record<string, string[]>[];
  securitySchemes: Record<string, Record<string, unknown>>;
} {
  const securitySchemes: Record<string, Record<string, unknown>> = {};
  const security = securityAlternatives(lineup).map(kinds => {
    const requirement: Record<string, string[]> = {};
    for (const kind of kinds) {
      const { name, build } = OPENAPI_SECURITY_SCHEME_FRAGMENTS[kind];
      const state = build(false);
      requirement[name] = [...state.requiredScopes];
      securitySchemes[name] = state.definition;
    }
    return requirement;
  });
  return { security, securitySchemes };
}

function buildResponses(lineup: OpenApiArrowButtonsLineup): Record<string, { description: string }> {
  const codes = lineup === "single" ? RESPONSE_CODES.filter(([code]) => code === SINGLE_RESPONSE_CODE) : RESPONSE_CODES;
  return Object.fromEntries(codes.map(([code, description]) => [code, { description }]));
}

/**
 * The operation template: the security toolbar cases vary `security` (OAS 3.1, mutual TLS included)
 * and keep one response; the response-code cases vary `responses` (OAS 3.0) and have no security.
 */
export function buildOpenApiArrowButtonsDocument(toolbar: OpenApiArrowButtonsToolbar, lineup: OpenApiArrowButtonsLineup): Record<string, unknown> {
  const operation: Record<string, unknown> = {
    operationId: "updateOrder",
    summary: "Update an order",
    parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
    responses: buildResponses(toolbar === "response-codes" ? lineup : "single"),
  };
  const document: Record<string, unknown> = {
    openapi: toolbar === "security-toolbar" ? "3.1.0" : "3.0.3",
    info: { title: "Orders", version: "1.0.0" },
    paths: { [OPENAPI_ARROW_BUTTONS_OPERATION.path]: { [OPENAPI_ARROW_BUTTONS_OPERATION.method]: operation } },
  };
  if (toolbar === "security-toolbar") {
    const { security, securitySchemes } = buildSecurity(lineup);
    operation.security = security;
    document.components = { securitySchemes };
  }
  return document;
}

/** Diffs cases: the before and after documents. */
export function buildOpenApiArrowButtonsDocuments(testCase: OpenApiArrowButtonsCase): {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
} {
  if (!testCase.beforeLineup) {
    throw new Error(`Not a diffs case: ${testCase.caseId}`);
  }
  return {
    before: buildOpenApiArrowButtonsDocument(testCase.toolbar, testCase.beforeLineup),
    after: buildOpenApiArrowButtonsDocument(testCase.toolbar, testCase.lineup),
  };
}

const OPTION_NOUNS: Record<OpenApiArrowButtonsToolbar, { single: string; every: string }> = {
  "security-toolbar": { single: "one alternative", every: "every scheme kind + `A + B` alternatives" },
  "response-codes": { single: "one code (`200`)", every: "every registered code + `1XX`–`5XX` + `default`" },
};

const TOOLBARS: readonly OpenApiArrowButtonsToolbar[] = ["security-toolbar", "response-codes"];

export const openApiArrowButtonsCases: readonly OpenApiArrowButtonsCase[] = TOOLBARS.flatMap(toolbar => {
  const nouns = OPTION_NOUNS[toolbar];
  return [
    { caseId: "01-single-option", title: `${nouns.single}: both arrows disabled`, toolbar, lineup: "single" },
    { caseId: "02-every-option", title: `${nouns.every}: overflow, arrows enabled`, toolbar, lineup: "every" },
  ] satisfies OpenApiArrowButtonsCase[];
});

export const openApiDiffsArrowButtonsCases: readonly OpenApiArrowButtonsCase[] = TOOLBARS.flatMap(toolbar => {
  const nouns = OPTION_NOUNS[toolbar];
  return [
    { caseId: "01-single-to-every-option", title: `${nouns.single} → ${nouns.every}: the changed side overflows`, toolbar, beforeLineup: "single", lineup: "every" },
    { caseId: "02-every-to-single-option", title: `${nouns.every} → ${nouns.single}: the origin side overflows`, toolbar, beforeLineup: "every", lineup: "single" },
  ] satisfies OpenApiArrowButtonsCase[];
});

/** A case of one toolbar by its id (stories look cases up by id). */
export function findOpenApiArrowButtonsCase(cases: readonly OpenApiArrowButtonsCase[], toolbar: OpenApiArrowButtonsToolbar, caseId: string): OpenApiArrowButtonsCase {
  const testCase = cases.find(candidate => candidate.toolbar === toolbar && candidate.caseId === caseId);
  if (!testCase) {
    throw new Error(`Arrow buttons case not found: ${toolbar}/${caseId}`);
  }
  return testCase;
}
