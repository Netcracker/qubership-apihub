import { DETAILED_DISPLAY_MODE, SIMPLE_DISPLAY_MODE } from '../../src/model/abstract/display-mode'
import { DisplayModeRows } from '../../src/model/abstract/display-mode-rows'
import { ASYNC_API_TEXT_ROW_CATEGORIES, AsyncApiNodeVisibility } from '../../src/model/async-api/node-visibility'
import { ASYNC_API_SECURITY_NODE_VISIBILITY } from '../../src/model/async-api/security-presentation'
import { OPENAPI_DESCRIPTION_ROW_CATEGORIES, OPENAPI_OPERATION_HEADER_ROW_CATEGORIES, OpenApiNodeVisibility } from '../../src/model/openapi/node-visibility'
import { OPENAPI_SECURITY_NODE_VISIBILITY } from '../../src/model/openapi/security-presentation'
import { SECURITY_OAUTH_FLOW_ROW_CATEGORIES, SECURITY_SCHEME_ROW_CATEGORIES } from '../../src/model/security/node-visibility'
import { SecurityTreeNodeValueTypeOAuthFlow, SecurityTreeNodeValueTypeScheme } from '../../src/model/security/types/node-value'
import {
  JSON_SCHEMA_PROPERTY_CONTENT_ROW_CATEGORIES,
  resolveAllowedAdditionalPropertyNamesRowVisibility,
  resolvePlainPropertyNodeVisibility,
} from '../../src/building-service/json-schema/tree/node-visibility-data/kind-property'
import { JsonSchemaTreeNodeStoredValue } from '../../src/model/json-schema/types/node-value'

// Design: docs/design/shared/features/display-mode-annotations.md

describe('DisplayModeRows: the one display-mode rule', () => {
  const categories = { title: 'structure', description: 'annotation' } as const

  it('shows present structure rows in both modes and present annotations in detailed only', () => {
    const presence = { title: true, description: true }
    expect(DisplayModeRows.apply(presence, categories, DETAILED_DISPLAY_MODE)).toEqual({ title: true, description: true })
    expect(DisplayModeRows.apply(presence, categories, SIMPLE_DISPLAY_MODE)).toEqual({ title: true, description: false })
  })

  it('never shows an absent row', () => {
    const presence = { title: false, description: false }
    expect(DisplayModeRows.apply(presence, categories, DETAILED_DISPLAY_MODE)).toEqual({ title: false, description: false })
  })
})

describe('Category tables: the annotations of each API type', () => {
  const annotations = (table: Readonly<Record<string, string>>): string[] =>
    Object.entries(table).filter(([, category]) => category === 'annotation').map(([row]) => row).sort()

  it.each([
    ['OpenAPI operation header', OPENAPI_OPERATION_HEADER_ROW_CATEGORIES, ['description']],
    ['OpenAPI request body / response', OPENAPI_DESCRIPTION_ROW_CATEGORIES, ['description']],
    ['AsyncAPI text rows', ASYNC_API_TEXT_ROW_CATEGORIES, ['description', 'summary']],
    ['security scheme card', SECURITY_SCHEME_ROW_CATEGORIES, ['description', 'scopeDescriptions']],
    ['OAuth flow', SECURITY_OAUTH_FLOW_ROW_CATEGORIES, []],
    ['JSON Schema property content', JSON_SCHEMA_PROPERTY_CONTENT_ROW_CATEGORIES, [
      'allowedAdditionalPropertyNames', 'customAnnotations', 'default', 'deprecationReason', 'description',
      'enumValues', 'examples', 'validations',
    ]],
  ])('%s', (_name, table, expected) => {
    expect(annotations(table)).toEqual([...expected].sort())
  })
})

describe('OpenAPI: descriptions are annotations', () => {
  const operation = {
    method: 'post',
    path: '/orders',
    title: 'Update',
    operationId: 'update',
    description: 'Replaces the order.',
    externalDocs: { url: 'https://docs.example.com', description: 'Guide' },
  }

  it('simple: the operation description row is hidden; title, operation ID, external docs stay', () => {
    const visibility = OpenApiNodeVisibility.resolveOperation(operation, false, SIMPLE_DISPLAY_MODE)
    expect(visibility).toMatchObject({ showTitle: true, showOperationId: true, showExternalDocs: true, showDescription: false, deprecatedTagRow: 'title' })
    expect(OpenApiNodeVisibility.resolveOperationHeaderRows(visibility)).toEqual(['title', 'operationId', 'address', 'externalDocs'])
  })

  it('detailed: the operation description row shows', () => {
    const visibility = OpenApiNodeVisibility.resolveOperation(operation, false, DETAILED_DISPLAY_MODE)
    expect(OpenApiNodeVisibility.resolveOperationHeaderRows(visibility)).toEqual(['title', 'operationId', 'address', 'description', 'externalDocs'])
  })

  it.each([
    [SIMPLE_DISPLAY_MODE, false],
    [DETAILED_DISPLAY_MODE, true],
  ] as const)('request body and response descriptions in %s mode: %s', (displayMode, shown) => {
    expect(OpenApiNodeVisibility.showRequestBodyDescription({ description: 'New order state.' }, displayMode)).toBe(shown)
    expect(OpenApiNodeVisibility.showResponseDescription({ code: '200', codeClass: '2xx', description: 'OK.' }, displayMode)).toBe(shown)
  })
})

describe('AsyncAPI: summary and description are annotations', () => {
  it.each([
    [SIMPLE_DISPLAY_MODE, { showSummary: false, showDescription: false }],
    [DETAILED_DISPLAY_MODE, { showSummary: true, showDescription: true }],
  ] as const)('%s mode', (displayMode, expected) => {
    expect(AsyncApiNodeVisibility.resolveTextRows({ summary: true, description: true }, displayMode)).toEqual(expected)
  })
})

describe('Security cards: only descriptions are hidden in simple mode', () => {
  const oauth: SecurityTreeNodeValueTypeScheme = {
    name: 'oauth',
    isResolved: true,
    type: 'oauth2',
    description: 'OAuth 2.0.',
    requiredScopes: ['orders:write'],
    requiredScopesKind: 'scopes',
  }
  const bearer: SecurityTreeNodeValueTypeScheme = {
    name: 'bearer',
    isResolved: true,
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Bearer token.',
    requiredScopes: [],
    requiredScopesKind: 'ignored',
  }
  const flow = {
    flowType: 'authorizationCode',
    authorizationUrl: 'https://auth.example.com/authorize',
    tokenUrl: 'https://auth.example.com/token',
    refreshUrl: 'https://auth.example.com/refresh',
    scopes: { 'orders:read': 'Read orders' },
  } as unknown as SecurityTreeNodeValueTypeOAuthFlow

  it.each([
    ['OpenAPI', OPENAPI_SECURITY_NODE_VISIBILITY],
    ['AsyncAPI', ASYNC_API_SECURITY_NODE_VISIBILITY],
  ] as const)('%s: scheme description and scope descriptions hidden, props / flows / scope names shown', (_name, visibility) => {
    expect(visibility.resolveSecurityScheme(oauth, SIMPLE_DISPLAY_MODE)).toMatchObject({
      showDescription: false,
      showScopeDescriptions: false,
      showRequiredScopeList: true,
    })
    expect(visibility.resolveSecurityScheme(bearer, SIMPLE_DISPLAY_MODE)).toMatchObject({
      showDescription: false,
      showHttpScheme: true,
      showBearerFormat: true,
    })
    expect(visibility.resolveOAuthFlow(flow, SIMPLE_DISPLAY_MODE)).toEqual({
      showAuthorizationUrl: true,
      showTokenUrl: true,
      showRefreshUrl: true,
      showScopes: true,
    })
    expect(visibility.resolveSecurityScheme(oauth, DETAILED_DISPLAY_MODE)).toMatchObject({
      showDescription: true,
      showScopeDescriptions: true,
    })
  })
})

describe('JSON Schema: description, deprecation reason and validation rows are annotations; extensions are not', () => {
  const value = {
    type: 'string',
    description: 'Note.',
    deprecated: true,
    default: 'x',
    enum: ['x', 'y'],
    examples: ['x'],
    minLength: 1,
    customAnnotations: { Location: '$message.payload#/user/id' },
    extensions: { 'x-deprecated-reason': 'Use other.', 'x-owner': 'team' },
  } as unknown as JsonSchemaTreeNodeStoredValue

  it('simple: only extensions show', () => {
    expect(resolvePlainPropertyNodeVisibility(value, SIMPLE_DISPLAY_MODE)).toEqual({
      showDescription: false,
      showDeprecationReasonRow: false,
      deprecationReason: 'Use other.',
      showDefaultRow: false,
      showExamplesRow: false,
      showEnumValuesRow: false,
      showValidationsSection: false,
      showExtensionsRow: true,
      showCustomAnnotationsRow: false,
      showContentSection: true,
      showAnyAdditionalInfoRow: true,
    })
    expect(resolveAllowedAdditionalPropertyNamesRowVisibility(true, SIMPLE_DISPLAY_MODE)).toBe(false)
  })

  it('detailed: every present row shows', () => {
    expect(resolvePlainPropertyNodeVisibility(value, DETAILED_DISPLAY_MODE)).toMatchObject({
      showDescription: true,
      showDeprecationReasonRow: true,
      showDefaultRow: true,
      showExamplesRow: true,
      showEnumValuesRow: true,
      showValidationsSection: true,
      showExtensionsRow: true,
      showCustomAnnotationsRow: true,
    })
    expect(resolveAllowedAdditionalPropertyNamesRowVisibility(true, DETAILED_DISPLAY_MODE)).toBe(true)
  })

  it('simple without extensions: no content section', () => {
    const plain = { type: 'string', description: 'Note.', minLength: 1 } as unknown as JsonSchemaTreeNodeStoredValue
    expect(resolvePlainPropertyNodeVisibility(plain, SIMPLE_DISPLAY_MODE)).toMatchObject({ showContentSection: false, showAnyAdditionalInfoRow: false })
  })
})
