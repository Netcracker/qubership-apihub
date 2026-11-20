import { createBuildingServiceLogger } from '../../src/loggers'
import { OpenApiSpecTransformer } from '../../src/building-service/openapi/shared/openapi-spec-transformer'
import { OpenApiTreeBuilder } from '../../src/building-service/openapi/tree/builder'
import { OpenApiTreeNodeKinds } from '../../src/model/openapi/types/node-kind'
import { OpenApiResponseCode } from '../../src/shared/openapi/types/response-code'
import { loadNormalizedOpenApiSample } from '../helpers/openapi-fixtures'

const transformer = new OpenApiSpecTransformer(createBuildingServiceLogger())

const ALL_SECTIONS = 'oas30/e2e/168-all-sections'
const ALL_SECTIONS_KEYS = { path: '/api/v2/stores/main-store/orders/pending/export-requests/{orderId}', method: 'post' }
const ORDERS_POST = { path: '/orders', method: 'post' }

describe('OpenAPI spec transformer (plain)', () => {
  it('builds the full OAS 3.0 operation', () => {
    const source = loadNormalizedOpenApiSample(ALL_SECTIONS)
    const spec = transformer.transform(source, { ...ALL_SECTIONS_KEYS, method: 'POST' })

    expect(spec).not.toBeNull()
    expect(spec?.method).toBe('post')
    expect(spec?.specVersion).toBe('openapi-3.0')
    expect(spec?.title).toBe('Update an order')
    expect(spec?.operationId).toBe('updateOrder')
    expect(Object.keys(spec?.data.extensions ?? {})).toEqual(['x-rate-limit', 'x-audience'])

    const security = spec?.data.security
    expect(security?.isInheritedFromDocument).toBe(false)
    expect(security?.alternatives.map(alternative => alternative.schemeNames)).toEqual([['oauth'], ['api_key']])
    const oauth = security?.alternatives[0].schemes.oauth
    expect(oauth?.type).toBe('oauth2')
    expect(oauth?.requiredScopes).toEqual(['orders:write'])
    expect(oauth?.requiredScopesKind).toBe('scopes')
    expect(Object.keys(oauth?.flows ?? {})).toEqual(['clientCredentials'])

    const parameters = spec?.data.request?.parameters
    expect(Object.keys(parameters ?? {})).toEqual(['path', 'query', 'header', 'cookie'])
    expect(Object.keys(parameters?.path?.schema.properties ?? {})).toEqual(['orderId'])
    expect(parameters?.path?.schema.required).toEqual(['orderId'])
    expect(parameters?.header?.schema.required).toEqual(['X-Request-Id'])

    expect(Object.keys(spec?.data.request?.requestBody?.content ?? {})).toEqual(['application/json'])
    expect(spec?.data.request?.requestBody?.required).toBe(true)

    expect(Object.keys(spec?.data.responses ?? {})).toEqual(['200', '400'])
    expect(Object.keys(spec?.data.responses?.['200']?.headers?.schema.properties ?? {})).toEqual(['ETag', 'X-Rate-Limit-Remaining'])
  })

  it('reads external docs', () => {
    const spec = transformer.transform(loadNormalizedOpenApiSample('oas30/fields/operation/04-external-docs'), ORDERS_POST)
    expect(spec?.externalDocs).toEqual({ url: 'https://docs.example.com/orders', description: 'Orders guide' })
  })

  it('takes the document security when the operation has none, and none for an empty list', () => {
    const inherited = transformer.transform(loadNormalizedOpenApiSample('oas30/structure/05-security-inherited-from-document'), ORDERS_POST)
    expect(inherited?.data.security?.isInheritedFromDocument).toBe(true)
    expect(inherited?.data.security?.alternatives.map(alternative => alternative.schemeNames)).toEqual([['api_key']])

    const anonymous = transformer.transform(loadNormalizedOpenApiSample('oas30/structure/07-security-anonymous-alternative'), ORDERS_POST)
    expect(anonymous?.data.security?.allowsAnonymous).toBe(true)
    expect(anonymous?.data.security?.alternatives.map(alternative => alternative.schemeNames)).toEqual([['api_key']])

    const publicOperation = transformer.transform(loadNormalizedOpenApiSample('oas30/structure/06-security-disabled'), ORDERS_POST)
    expect(publicOperation?.data.security).toBeUndefined()

    const deprecated = transformer.transform(loadNormalizedOpenApiSample('oas30/structure/08-deprecated-operation'), ORDERS_POST)
    expect(deprecated?.deprecated).toBe(true)
  })

  it('reads OAS 3.1 role scopes and mutualTLS', () => {
    const mutualTls = transformer.transform(loadNormalizedOpenApiSample('oas31/fields/security/01-mutual-tls'), ORDERS_POST)
    expect(mutualTls?.specVersion).toBe('openapi-3.1')
    expect(mutualTls?.data.security?.alternatives[1].schemes['mutual-tls'].type).toBe('mutualTLS')
    const apiKey = transformer.transform(loadNormalizedOpenApiSample('oas31/fields/security/02-roles-on-api-key'), ORDERS_POST)
    expect(apiKey?.data.security?.alternatives[0].schemes.api_key.requiredScopes).toEqual(['admin', 'auditor'])
    const bearer = transformer.transform(loadNormalizedOpenApiSample('oas31/fields/security/03-roles-on-http-bearer'), ORDERS_POST)
    expect(bearer?.data.security?.alternatives[0].schemes.bearer.requiredScopesKind).toBe('roles')
  })

  it('synthesizes parameters from the path item, $ref, and content', () => {
    const source = loadNormalizedOpenApiSample('oas30/structure/01-path-item-parameters-with-override')
    const spec = transformer.transform(source, { path: '/orders/{orderId}', method: 'get' })
    const query = spec?.data.request?.parameters?.query?.schema.properties ?? {}
    // api-unifier merges path-item parameters after the operation's own
    expect(Object.keys(query)).toEqual(['filter', 'pageSize'])
    expect(query.filter).toMatchObject({
      type: 'object',
      description: 'JSON-encoded filter, described with `content` instead of `schema`.',
      customAnnotations: { mediaType: { label: 'Media type', value: 'application/json' } },
    })
    const header = spec?.data.request?.parameters?.header?.schema
    expect(header?.required).toEqual(['X-Tenant'])
    expect(header?.properties['X-Tenant']).toMatchObject({ description: 'Overridden by the operation.' })

    const referenced = transformer.transform(loadNormalizedOpenApiSample('oas30/structure/02-ref-parameter-body-response'), ORDERS_POST)
    expect(Object.keys(referenced?.data.request?.parameters?.query?.schema.properties ?? {})).toEqual(['pageSize'])
    expect(referenced?.data.request?.requestBody?.description).toBe('Order body from components.')
  })

  it('omits responses for OAS 3.1 without responses', () => {
    const spec = transformer.transform(loadNormalizedOpenApiSample('oas31/fields/responses/01-no-responses'), undefined)
    expect(spec?.path).toBe('/orders')
    expect(spec?.data.responses).toBeUndefined()
  })

  it('picks the default response: the first 2XX, else the first (Q13)', () => {
    const code = (option: string): string => option
    expect(OpenApiResponseCode.pickDefault(['101', '302', '201', '200'], code)).toBe('201')
    expect(OpenApiResponseCode.pickDefault(['404', '2XX', 'default'], code)).toBe('2XX')
    expect(OpenApiResponseCode.pickDefault(['400', 'default'], code)).toBe('400')
    expect(OpenApiResponseCode.pickDefault([], code)).toBeUndefined()
  })

  it('orders response codes canonically', () => {
    expect(['500', '101', '200', '2XX', '302', '404', '4XX', '503', 'default', 'x-weird'].sort(OpenApiResponseCode.compare))
      .toEqual(['101', '200', '2XX', '302', '404', '4XX', '500', '503', 'x-weird', 'default'])
    // The spec object cannot hold this order (JS puts integer-like keys first): the tree sorts it.
    const tree = new OpenApiTreeBuilder({ source: loadNormalizedOpenApiSample('oas30/structure/04-response-code-order'), operationKeys: ORDERS_POST }).build()
    const responses = tree.root?.childrenNodes().find(child => child.kind === OpenApiTreeNodeKinds.RESPONSES)
    expect(responses?.nestedNodes().map(child => child.key)).toEqual(['101', '201', '2XX', '302', '404', '4XX', '500', 'default'])
  })
})

describe('OpenAPI tree builder (plain)', () => {
  it('builds a node per section; the response codes are nested nodes of the complex `responses`', () => {
    const source = loadNormalizedOpenApiSample(ALL_SECTIONS)
    const tree = new OpenApiTreeBuilder({ source, operationKeys: ALL_SECTIONS_KEYS }).build()
    const root = tree.root
    expect(root?.kind).toBe(OpenApiTreeNodeKinds.OPERATION)
    expect(root?.childrenNodes().map(child => child.kind)).toEqual([
      OpenApiTreeNodeKinds.SECURITY,
      OpenApiTreeNodeKinds.EXTENSIONS,
      OpenApiTreeNodeKinds.REQUEST,
      OpenApiTreeNodeKinds.RESPONSES,
    ])
    const responses = root?.childrenNodes().find(child => child.kind === OpenApiTreeNodeKinds.RESPONSES)
    expect(responses?.nestedNodes().map(child => child.key)).toEqual(['200', '400'])
    const ok = responses?.nestedNodes()[0]
    expect(ok?.value()).toMatchObject({ code: '200', codeClass: '2XX' })
    expect(ok?.childrenNodes().map(child => child.kind)).toEqual([
      OpenApiTreeNodeKinds.RESPONSE_HEADERS,
      OpenApiTreeNodeKinds.CONTENT,
    ])
    const security = root?.childrenNodes()[0]
    const firstAlternative = security?.childrenNodes()[0]
    const scheme = firstAlternative?.childrenNodes()[0]
    expect(scheme?.kind).toBe(OpenApiTreeNodeKinds.SECURITY_SCHEME)
    expect(scheme?.childrenNodes().map(child => child.key)).toEqual(['clientCredentials'])
  })
})
