/**
 * Case definitions of the plain OpenAPI Operation Suite (`packages/samples/openapi/`).
 * Matrix and rules: docs/design/openapi/features/plain-case-matrix.md.
 *
 * Groups (OAS 3.0): `e2e` (section combinations), `minimal`, `http-methods` (one template served as
 * every method), `fields` (required fields + the covered one), `structure` (path items, `$ref`,
 * ordering). OAS 3.1: `fields` and `structure` limited to what displays differently from 3.0.
 *
 * Every case: `{ slug, title, document, path, method, switchTo?, argVariants? }`. A group with a
 * `template` (`{ slug, document, path, method }`) writes that one fixture; its cases carry no
 * `document` and render the template with their own `method`.
 * `switchTo` lists selector option test ids selected before capture (story `play` + ITs).
 *
 * Regenerate: `node bin/generate-openapi-suite.mjs`.
 */

const SHORT_PATH = '/orders'
const LONG_PATH = '/api/v2/stores/main-store/orders/pending/export-requests'
const METHOD = 'post'

function createDocument(openapi = '3.0.3') {
  return { openapi, info: { title: 'Orders', version: '1.0.0' }, paths: {} }
}

/** A document with one operation: `{ document, operation }`. */
function createOperationDocument({ openapi, path = SHORT_PATH, method = METHOD, operation = {} } = {}) {
  const document = createDocument(openapi)
  const op = { ...operation }
  document.paths[path] = { [method]: op }
  return { document, operation: op }
}

const statusOnly = () => ({ description: '' })

/** `responses` is created first by the builders; write it last, as specs usually do. */
function moveResponsesLast(operation) {
  if (!('responses' in operation)) {
    return
  }
  const { responses, ...rest } = operation
  for (const key of Object.keys(operation)) {
    delete operation[key]
  }
  Object.assign(operation, rest, { responses })
}
const components = (document) => (document.components ??= {})
const securitySchemes = (document) => (components(document).securitySchemes ??= {})

const objectSchema = (properties, extra = {}) => ({
  type: 'object',
  ...extra,
  properties: Object.fromEntries(Object.entries(properties).map(([name, type]) => [name, typeof type === 'string' ? { type } : type])),
})

// ---------------------------------------------------------------------------------------------
// Parameter / header variant sets: required, optional, deprecated, `content`-described.

const CONTENT_SCHEMA = { 'application/json': { schema: objectSchema({ status: 'string', from: { type: 'string', format: 'date' } }) } }

const PARAMETER_VARIANTS = {
  path: [
    { name: 'orderId', required: true, schema: { type: 'string' } },
    // Path parameters are always required: the "optional" slot is a second required one.
    { name: 'lineId', required: true, schema: { type: 'integer', format: 'int32' } },
    { name: 'legacyId', required: true, deprecated: true, schema: { type: 'string' } },
    { name: 'filter', required: true, content: CONTENT_SCHEMA },
  ],
  query: [
    { name: 'limit', required: true, schema: { type: 'integer', minimum: 1 } },
    { name: 'cursor', schema: { type: 'string' } },
    { name: 'page', deprecated: true, schema: { type: 'integer' } },
    { name: 'filter', content: CONTENT_SCHEMA },
  ],
  header: [
    { name: 'X-Request-Id', required: true, schema: { type: 'string', format: 'uuid' } },
    { name: 'X-Trace', schema: { type: 'string' } },
    { name: 'X-Legacy-Token', deprecated: true, schema: { type: 'string' } },
    { name: 'X-Filter', content: CONTENT_SCHEMA },
  ],
  cookie: [
    { name: 'session', required: true, schema: { type: 'string' } },
    { name: 'theme', schema: { type: 'string', enum: ['light', 'dark'] } },
    { name: 'legacy_session', deprecated: true, schema: { type: 'string' } },
    { name: 'prefs', content: CONTENT_SCHEMA },
  ],
}

const PATH_WITH_ALL_PATH_PARAMETERS = '/orders/{orderId}/lines/{lineId}/legacy/{legacyId}/filter/{filter}'

const parametersOf = (location) => PARAMETER_VARIANTS[location].map(({ name, ...rest }) => ({ name, in: location, ...structuredClone(rest) }))

/** Response Header Objects with the same four variants. */
const responseHeaderVariants = () => ({
  'X-Request-Id': { required: true, schema: { type: 'string', format: 'uuid' } },
  'X-Rate-Limit-Remaining': { schema: { type: 'integer' } },
  'X-Legacy-Token': { deprecated: true, schema: { type: 'string' } },
  'X-Filter': { content: structuredClone(CONTENT_SCHEMA) },
})

// ---------------------------------------------------------------------------------------------
// Body variants

const bodySchema = (deprecated) => objectSchema({ id: 'string', status: { type: 'string', enum: ['new', 'paid'] } }, deprecated ? { deprecated: true } : {})

/** `content` with one or two media types; the deprecated variant marks the schema roots deprecated. */
function bodyContent({ mediaTypes, deprecated }) {
  const content = { 'application/json': { schema: bodySchema(deprecated) } }
  if (mediaTypes === 2) {
    content['application/xml'] = { schema: bodySchema(deprecated) }
  }
  return content
}

const SECOND_MEDIA_TYPE = 'application/xml'

// ---------------------------------------------------------------------------------------------
// Group 1: e2e section combinations

/** Sections in display order. `apply(ctx)` adds the section to the operation. */
const SECTIONS = [
  { id: 'summary', apply: ({ operation }) => { operation.summary = 'Update an order' } },
  { id: 'operation-id', apply: ({ operation }) => { operation.operationId = 'updateOrder' } },
  { id: 'address', apply: () => {} },
  {
    id: 'description',
    apply: ({ operation }) => {
      operation.description = 'Replaces the order with the given state.\n\n- Validates the **status** transition.\n- Returns the stored order.'
    },
  },
  {
    id: 'security',
    apply: ({ document, operation }) => {
      operation.security = [{ oauth: ['orders:write'] }, { api_key: [] }]
      Object.assign(securitySchemes(document), {
        oauth: {
          type: 'oauth2',
          flows: { clientCredentials: { tokenUrl: 'https://auth.example.com/token', scopes: { 'orders:read': 'Read orders', 'orders:write': 'Modify orders' } } },
        },
        api_key: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      })
    },
  },
  { id: 'operation-extensions', apply: ({ operation }) => { Object.assign(operation, { 'x-rate-limit': 100, 'x-audience': { visibility: 'public' } }) } },
  {
    id: 'path-parameters',
    apply: ({ operation }) => {
      (operation.parameters ??= []).push({ name: 'orderId', in: 'path', required: true, description: 'Order identifier.', schema: { type: 'string' } })
    },
  },
  {
    id: 'query-parameters',
    apply: ({ operation }) => {
      (operation.parameters ??= []).push(
        { name: 'dryRun', in: 'query', description: 'Validate without storing.', schema: { type: 'boolean', default: false } },
        { name: 'expand', in: 'query', schema: { type: 'array', items: { type: 'string', enum: ['lines', 'customer'] } } },
      )
    },
  },
  {
    id: 'headers',
    apply: ({ operation }) => {
      (operation.parameters ??= []).push(
        { name: 'X-Request-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'X-Trace', in: 'header', schema: { type: 'string' } },
      )
    },
  },
  {
    id: 'cookies',
    apply: ({ operation }) => {
      (operation.parameters ??= []).push(
        { name: 'session', in: 'cookie', required: true, schema: { type: 'string' } },
        { name: 'theme', in: 'cookie', schema: { type: 'string', enum: ['light', 'dark'] } },
      )
    },
  },
  {
    id: 'body',
    apply: ({ operation }) => {
      operation.requestBody = {
        description: 'New order state.',
        required: true,
        content: {
          'application/json': { schema: objectSchema({ status: { type: 'string', enum: ['new', 'paid'] }, note: 'string' }, { required: ['status'] }) },
        },
      }
    },
  },
  { id: 'responses-1-code-headers', codes: 1, apply: ({ operation }) => addResponseHeaders(operation, ['200']) },
  { id: 'responses-1-code-body', codes: 1, apply: ({ operation }) => addResponseBodies(operation, ['200']) },
  { id: 'responses-2-codes-headers', codes: 2, apply: ({ operation }) => addResponseHeaders(operation, ['200', '400']) },
  { id: 'responses-2-codes-body', codes: 2, apply: ({ operation }) => addResponseBodies(operation, ['200', '400']) },
]

function addResponseHeaders(operation, codes) {
  for (const code of codes) {
    operation.responses[code].headers = {
      ETag: { schema: { type: 'string' } },
      'X-Rate-Limit-Remaining': { description: 'Requests left in the window.', schema: { type: 'integer' } },
    }
  }
}

function addResponseBodies(operation, codes) {
  for (const code of codes) {
    operation.responses[code].content = code === '200'
      ? { 'application/json': { schema: objectSchema({ id: 'string', status: 'string' }) } }
      : { 'application/problem+json': { schema: objectSchema({ title: 'string', detail: 'string' }) } }
  }
}

function buildE2eDocument(sectionIds) {
  const selected = new Set(sectionIds)
  const hasPathParameters = selected.has('path-parameters')
  const basePath = selected.has('address') ? LONG_PATH : SHORT_PATH
  const path = hasPathParameters ? `${basePath}/{orderId}` : basePath
  const twoCodes = SECTIONS.some(section => selected.has(section.id) && section.codes === 2)
  const { document, operation } = createOperationDocument({
    path,
    operation: { responses: twoCodes ? { 200: statusOnly(), 400: statusOnly() } : { 200: statusOnly() } },
  })
  for (const section of SECTIONS) {
    if (selected.has(section.id)) {
      section.apply({ document, operation })
    }
  }
  moveResponsesLast(operation)
  return { document, path }
}

const conflicts = (ids) => {
  const codeCounts = new Set(SECTIONS.filter(section => ids.includes(section.id) && section.codes).map(section => section.codes))
  return codeCounts.size > 1
}

function collectE2eCases() {
  const ids = SECTIONS.map(section => section.id)
  const combinations = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      combinations.push({ kind: 'pair', ids: [ids[i], ids[j]] })
    }
  }
  for (let size = 3; size < ids.length; size++) {
    for (let start = 0; start + size <= ids.length; start++) {
      combinations.push({ kind: 'window', ids: ids.slice(start, start + size) })
    }
  }
  const all = ids.filter(id => !SECTIONS.find(section => section.id === id).codes || SECTIONS.find(section => section.id === id).codes === 2)
  combinations.push({ kind: 'all', ids: all })

  return combinations
    .filter(({ ids: combination }) => !conflicts(combination))
    .map(({ kind, ids: combination }) => {
      const { document, path } = buildE2eDocument(combination)
      const slug = kind === 'pair'
        ? `pair--${combination.join('--')}`
        : kind === 'window'
          ? `window-${combination.length}--${combination[0]}--to--${combination[combination.length - 1]}`
          : 'all-sections'
      return {
        slug,
        title: kind === 'all' ? 'every section (2 response codes with headers and body)' : combination.join(' + '),
        sections: combination,
        document,
        path,
        method: METHOD,
        argVariants: kind === 'all' ? [{ noHeading: '!true' }] : [],
      }
    })
}

// ---------------------------------------------------------------------------------------------
// Group 2: minimal

function collectMinimalCases() {
  return [
    {
      slug: 'default-response-only',
      title: 'only a `default` response',
      ...withPath(createOperationDocument({ method: 'get', operation: { responses: { default: statusOnly() } } }), SHORT_PATH, 'get'),
    },
  ]
}

const withPath = ({ document }, path, method) => ({ document, path, method })

// ---------------------------------------------------------------------------------------------
// Group 2a: HTTP methods - one template fixture, the method is a story arg

/** Same order as next-data-model `OpenApiHttpMethods`. */
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']

/**
 * One `template/sample.yaml` (the smallest operation: one status-only `200`); every case serves its
 * only operation as the case's method (`methodTemplate` story arg), so no fixture is per method.
 */
function collectHttpMethodsGroup() {
  return {
    template: {
      slug: 'template',
      ...withPath(createOperationDocument({ method: HTTP_METHODS[0], operation: { responses: { 200: statusOnly() } } }), SHORT_PATH, HTTP_METHODS[0]),
    },
    cases: HTTP_METHODS.map(method => ({
      slug: method,
      title: `\`${method.toUpperCase()}\` badge (method template)`,
      path: SHORT_PATH,
      method,
    })),
  }
}

// ---------------------------------------------------------------------------------------------
// Group 3: fields - required fields only + the covered one

function fieldsCase(slug, title, mutate, { path = SHORT_PATH, switchTo = [], openapi } = {}) {
  const { document, operation } = createOperationDocument({ openapi, path, operation: { responses: { 200: statusOnly() } } })
  mutate({ document, operation })
  moveResponsesLast(operation)
  return { slug, title, document, path, method: METHOD, switchTo }
}

const STUB_SCHEME = { type: 'apiKey', in: 'header', name: 'X-Stub-Key' }

// Scoped types get a pair of cases: the requirement lists the scope / lists none.
const OAUTH2_OPTIONAL_SCOPE = ['optional-scope', 'optional scope: declared by the flow, not listed in the requirement']
const OPENID_CONNECT_NO_SCOPES = ['no-required-scopes', 'no required scopes: the document declares no scopes, so no `Scopes` list']

/** `[slug, title, scheme, requirement scopes, [optional-variant slug suffix, title suffix]?]`. */
const SECURITY_TYPES = [
  ['api-key-header', 'apiKey in a header', { type: 'apiKey', in: 'header', name: 'X-API-Key' }, []],
  ['api-key-query', 'apiKey in the query', { type: 'apiKey', in: 'query', name: 'api_key' }, []],
  ['api-key-cookie', 'apiKey in a cookie', { type: 'apiKey', in: 'cookie', name: 'api_key' }, []],
  ['http-basic', 'http basic', { type: 'http', scheme: 'basic' }, []],
  ['http-bearer', 'http bearer', { type: 'http', scheme: 'bearer' }, []],
  ['http-bearer-format', 'http bearer with `bearerFormat`', { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, []],
  ['oauth2-implicit', 'oauth2 implicit flow', {
    type: 'oauth2', flows: { implicit: { authorizationUrl: 'https://auth.example.com/authorize', scopes: { 'orders:read': 'Read orders' } } },
  }, ['orders:read'], OAUTH2_OPTIONAL_SCOPE],
  ['oauth2-password', 'oauth2 password flow', {
    type: 'oauth2', flows: { password: { tokenUrl: 'https://auth.example.com/token', scopes: { 'orders:read': 'Read orders' } } },
  }, ['orders:read'], OAUTH2_OPTIONAL_SCOPE],
  ['oauth2-client-credentials', 'oauth2 client credentials flow', {
    type: 'oauth2', flows: { clientCredentials: { tokenUrl: 'https://auth.example.com/token', scopes: { 'orders:read': 'Read orders' } } },
  }, ['orders:read'], OAUTH2_OPTIONAL_SCOPE],
  ['oauth2-authorization-code', 'oauth2 authorization code flow', {
    type: 'oauth2',
    flows: { authorizationCode: { authorizationUrl: 'https://auth.example.com/authorize', tokenUrl: 'https://auth.example.com/token', scopes: { 'orders:read': 'Read orders' } } },
  }, ['orders:read'], OAUTH2_OPTIONAL_SCOPE],
  ['openid-connect', 'openIdConnect', { type: 'openIdConnect', openIdConnectUrl: 'https://auth.example.com/.well-known/openid-configuration' }, ['openid'], OPENID_CONNECT_NO_SCOPES],
]

/** Security case: alternative 1 is a stub, alternative 2 the covered scheme (auto-switched). */
function securityCase(slug, title, scheme, scopes, { openapi, schemeName = slug } = {}) {
  return fieldsCase(slug, `${title} (2nd alternative, auto-switched)`, ({ document, operation }) => {
    operation.security = [{ stub_key: [] }, { [schemeName]: scopes }]
    Object.assign(securitySchemes(document), { stub_key: STUB_SCHEME, [schemeName]: scheme })
  }, { switchTo: ['security-alternative-1'], openapi })
}

const PARAMETER_LOCATIONS = [
  ['path-parameters', 'path', 'path parameters'],
  ['query-parameters', 'query', 'query parameters'],
  ['request-headers', 'header', 'request headers'],
  ['cookies', 'cookie', 'cookies'],
]

const REQUEST_BODY_VARIANTS = [
  ['required', 'required', { required: true }, false],
  ['optional', 'optional', {}, false],
  ['deprecated', 'deprecated schema root', {}, true],
]

const RESPONSE_KINDS = [['2xx', '200'], ['3xx', '302'], ['4xx', '404'], ['5xx', '500']]

const RESPONSE_BODY_VARIANTS = [
  ['body-1-media-type', '1 media type', 1, false],
  ['body-2-media-types', '2 media types (2nd auto-switched)', 2, false],
  ['body-deprecated-1-media-type', 'deprecated schema root, 1 media type', 1, true],
  ['body-deprecated-2-media-types', 'deprecated schema root, 2 media types (2nd auto-switched)', 2, true],
]

/** Response case: a `default` stub plus the target code, which is auto-switched to. */
function responseCase(kind, code, slug, title, response, extraSwitch = []) {
  return fieldsCase(slug, `\`${code}\` response: ${title}`, ({ operation }) => {
    operation.responses = { default: statusOnly(), [code]: { description: '', ...response } }
  }, { switchTo: [`response-code-${code}`, ...extraSwitch] })
}

/** Fields cases by sub-group: `[folder, title, cases]`. */
function collectFieldsSubgroups() {
  const operation = [
    fieldsCase('summary', 'summary', ({ operation }) => { operation.summary = 'Update an order' }),
    fieldsCase('operation-id', 'operation ID', ({ operation }) => { operation.operationId = 'updateOrder' }),
    fieldsCase('description', 'markdown description', ({ operation }) => {
      operation.description = 'Replaces the order.\n\n- Validates the **status** transition.\n- Returns the stored order.'
    }),
    fieldsCase('external-docs', 'external docs (description in a tooltip)', ({ operation }) => {
      operation.externalDocs = { url: 'https://docs.example.com/orders', description: 'Orders guide' }
    }),
    fieldsCase('extensions', 'operation `x-*` extensions', ({ operation }) => {
      Object.assign(operation, { 'x-rate-limit': 100, 'x-audience': { visibility: 'public', owners: ['orders-team'] } })
    }),
  ]
  const security = SECURITY_TYPES.flatMap(([slug, title, scheme, scopes, optional]) => optional
    ? [
        securityCase(`${slug}-required-scope`, `${title}, required scope`, scheme, scopes, { schemeName: slug }),
        securityCase(`${slug}-${optional[0]}`, `${title}, ${optional[1]}`, scheme, [], { schemeName: slug }),
      ]
    : [securityCase(slug, title, scheme, scopes)])
  security.push(securityCase('scheme-description', 'scheme with a markdown `description`', {
    ...SECURITY_TYPES[0][2],
    description: 'Key issued in the **developer portal**.\n\n- Send it with every request.\n- Rotate it every 90 days.',
  }, []))
  const parameters = PARAMETER_LOCATIONS.map(([slug, location, title]) => fieldsCase(slug, `${title}: required, optional, deprecated, \`content\``, ({ operation }) => {
    operation.parameters = parametersOf(location)
  }, { path: location === 'path' ? PATH_WITH_ALL_PATH_PARAMETERS : SHORT_PATH }))
  // Every pair of request sections, in display order: how two of them look next to each other.
  // Parameter groups carry the full variant set; the body is required with a description.
  const requestSections = [
    ...PARAMETER_LOCATIONS.map(([slug, location, title]) => ({
      slug,
      title,
      path: location === 'path' ? PATH_WITH_ALL_PATH_PARAMETERS : undefined,
      apply: (operation) => { operation.parameters = [...(operation.parameters ?? []), ...parametersOf(location)] },
    })),
    {
      slug: 'request-body',
      title: 'request body',
      apply: (operation) => { operation.requestBody = { description: 'New order state.', required: true, content: bodyContent({ mediaTypes: 1 }) } },
    },
  ]
  const requestCombinations = []
  for (let i = 0; i < requestSections.length; i++) {
    for (let j = i + 1; j < requestSections.length; j++) {
      const [first, second] = [requestSections[i], requestSections[j]]
      requestCombinations.push(fieldsCase(`${first.slug}--${second.slug}`, `${first.title} + ${second.title}`, ({ operation }) => {
        first.apply(operation)
        second.apply(operation)
      }, { path: first.path ?? second.path ?? SHORT_PATH }))
    }
  }
  const requestBody = []
  for (const mediaTypes of [1, 2]) {
    for (const [slug, title, fields, deprecated] of REQUEST_BODY_VARIANTS) {
      requestBody.push(fieldsCase(
        `${slug}-${mediaTypes}-media-type${mediaTypes === 2 ? 's' : ''}`,
        `${title}, ${mediaTypes} media type${mediaTypes === 2 ? 's (2nd auto-switched)' : ''}`,
        ({ operation }) => { operation.requestBody = { ...fields, content: bodyContent({ mediaTypes, deprecated }) } },
        { switchTo: mediaTypes === 2 ? [`request-media-type-${SECOND_MEDIA_TYPE}`] : [] },
      ))
    }
  }
  requestBody.push(fieldsCase('body-and-schema-descriptions', 'body description + its schema description', ({ operation }) => {
    operation.requestBody = {
      description: 'New order state.',
      content: { 'application/json': { schema: { ...bodySchema(false), description: 'Order state object.' } } },
    }
  }))
  const responses = RESPONSE_KINDS.map(([kind, code]) => {
    const cases = [
      responseCase(kind, code, 'status-only', 'status only', {}),
      responseCase(kind, code, 'description-only', 'description only', { description: 'The result of the request.' }),
      responseCase(kind, code, 'headers-only', 'headers only: required, optional, deprecated, `content`', { headers: responseHeaderVariants() }),
      ...RESPONSE_BODY_VARIANTS.map(([slug, title, mediaTypes, deprecated]) => responseCase(
        kind, code, slug, `body only, ${title}`, { content: bodyContent({ mediaTypes, deprecated }) },
        mediaTypes === 2 ? [`response-media-type-${SECOND_MEDIA_TYPE}`] : [],
      )),
      responseCase(kind, code, 'description-and-headers', 'description + headers', { description: 'The result of the request.', headers: responseHeaderVariants() }),
      responseCase(kind, code, 'description-and-body', 'description + body', { description: 'The result of the request.', content: bodyContent({ mediaTypes: 1 }) }),
      responseCase(kind, code, 'headers-and-body', 'headers + body', { headers: responseHeaderVariants(), content: bodyContent({ mediaTypes: 1 }) }),
      responseCase(kind, code, 'description-and-body-schema-description', 'description + body schema description', {
        description: 'The result of the request.',
        content: { 'application/json': { schema: { ...bodySchema(false), description: 'Order object.' } } },
      }),
    ]
    return [`responses/${kind}`, `Responses/${kind.toUpperCase()}`, cases]
  })
  return [
    ['operation', 'Operation', operation],
    ['security', 'Security', security],
    ['parameters', 'Parameters', parameters],
    ['request-body', 'Request Body', requestBody],
    ['request-combinations', 'Request Combinations', requestCombinations],
    ...responses,
  ]
}

// ---------------------------------------------------------------------------------------------
// Group 4: document structure

function structureCase(slug, title, build, { path = SHORT_PATH, method = METHOD, switchTo = [] } = {}) {
  const document = createDocument()
  build(document)
  return { slug, title, document, path, method, switchTo }
}

function collectStructureCases() {
  return [
    structureCase('path-item-parameters-with-override', 'path-item parameters merged into the operation; the operation overrides one; a `content` parameter', (document) => {
      document.paths['/orders/{orderId}'] = {
        parameters: [
          { name: 'orderId', in: 'path', required: true, description: 'Declared on the path item.', schema: { type: 'string' } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'X-Tenant', in: 'header', schema: { type: 'string' } },
        ],
        get: {
          parameters: [
            { name: 'X-Tenant', in: 'header', required: true, description: 'Overridden by the operation.', schema: { type: 'string' } },
            {
              name: 'filter',
              in: 'query',
              content: { 'application/json': { schema: { type: 'object', description: 'JSON-encoded filter, described with `content` instead of `schema`.', properties: { status: { type: 'string' } } } } },
            },
          ],
          responses: { 200: statusOnly() },
        },
      }
    }, { path: '/orders/{orderId}', method: 'get' }),
    structureCase('ref-parameter-body-response', '`$ref` parameter, request body, and response from `components`', (document) => {
      document.paths[SHORT_PATH] = {
        post: {
          parameters: [{ $ref: '#/components/parameters/PageSize' }],
          requestBody: { $ref: '#/components/requestBodies/OrderBody' },
          responses: { 200: statusOnly(), 404: { $ref: '#/components/responses/NotFound' } },
        },
      }
      Object.assign(components(document), {
        parameters: { PageSize: { name: 'pageSize', in: 'query', description: 'Page size from components.', schema: { type: 'integer' } } },
        requestBodies: { OrderBody: { description: 'Order body from components.', required: true, content: { 'application/json': { schema: bodySchema(false) } } } },
        responses: { NotFound: { description: 'Not found (from components).', content: { 'application/problem+json': { schema: objectSchema({ title: 'string' }) } } } },
      })
    }, { switchTo: ['response-code-404'] }),
    structureCase('ignored-headers-shown', '`Accept`, `Content-Type`, `Authorization` request headers and a `Content-Type` response header (shown as is)', (document) => {
      document.paths[SHORT_PATH] = {
        post: {
          parameters: ['Accept', 'Content-Type', 'Authorization'].map(name => ({ name, in: 'header', schema: { type: 'string' } })),
          responses: { 200: { description: '', headers: { 'Content-Type': { schema: { type: 'string' } } } } },
        },
      }
    }),
    structureCase('response-code-order', 'response codes declared out of order (canonical order, colors)', (document) => {
      document.paths[SHORT_PATH] = {
        post: {
          responses: Object.fromEntries(['500', '4XX', '201', '101', 'default', '302', '2XX', '404'].map(code => [code, statusOnly()])),
        },
      }
    }),
    structureCase('security-inherited-from-document', 'document `security` inherited by the operation', (document) => {
      document.security = [{ api_key: [] }]
      securitySchemes(document).api_key = { type: 'apiKey', in: 'header', name: 'X-API-Key' }
      document.paths[SHORT_PATH] = { post: { responses: { 200: statusOnly() } } }
    }),
    structureCase('security-disabled', 'document `security` disabled by `security: []` (no section)', (document) => {
      document.security = [{ api_key: [] }]
      securitySchemes(document).api_key = { type: 'apiKey', in: 'header', name: 'X-API-Key' }
      document.paths[SHORT_PATH] = { post: { security: [], responses: { 200: statusOnly() } } }
    }),
    structureCase('security-anonymous-alternative', '`{}` alternative: `Optional` badge on the Security title, no option of its own', (document) => {
      securitySchemes(document).api_key = { type: 'apiKey', in: 'header', name: 'X-API-Key' }
      document.paths[SHORT_PATH] = { post: { security: [{ api_key: [] }, {}], responses: { 200: statusOnly() } } }
    }),
    structureCase('deprecated-operation', 'deprecated operation with a summary (tag in the title row)', (document) => {
      document.paths[SHORT_PATH] = { post: { summary: 'Update an order', deprecated: true, responses: { 200: statusOnly() } } }
    }),
    structureCase('deprecated-operation-without-summary', 'deprecated operation without a summary (tag on the address row)', (document) => {
      document.paths[SHORT_PATH] = { post: { deprecated: true, responses: { 200: statusOnly() } } }
    }),
    structureCase('security-anonymous-only', '`security: [{}]`: Security title with the `Optional` badge only (no toolbar, no cards)', (document) => {
      document.paths[SHORT_PATH] = { post: { security: [{}], responses: { 200: statusOnly() } } }
    }),
  ]
}

// ---------------------------------------------------------------------------------------------
// OAS 3.1

const OAS31 = '3.1.0'

function bodyPropertyCase(slug, title, property) {
  return fieldsCase(slug, title, ({ operation }) => {
    operation.requestBody = { content: { 'application/json': { schema: { type: 'object', properties: { value: property } } } } }
  }, { openapi: OAS31 })
}

function collectOas31FieldsSubgroups() {
  const cases = [
    securityCase('mutual-tls', '`mutualTLS`', { type: 'mutualTLS' }, [], { openapi: OAS31 }),
    fieldsCase('roles-on-api-key', '`Required roles` on an apiKey scheme', ({ document, operation }) => {
      operation.security = [{ api_key: ['admin', 'auditor'] }]
      securitySchemes(document).api_key = { type: 'apiKey', in: 'header', name: 'X-API-Key' }
    }, { openapi: OAS31 }),
    fieldsCase('roles-on-http-bearer', '`Required roles` on an http bearer scheme', ({ document, operation }) => {
      operation.security = [{ bearer: ['admin'] }]
      securitySchemes(document).bearer = { type: 'http', scheme: 'bearer' }
    }, { openapi: OAS31 }),
    fieldsCase('no-responses', 'no `responses` (allowed in 3.1: no Responses section)', ({ operation }) => {
      delete operation.responses
    }, { openapi: OAS31 }),
    fieldsCase('nullable-type-array-parameter', 'query parameter `type: [string, "null"]`', ({ operation }) => {
      operation.parameters = [{ name: 'note', in: 'query', schema: { type: ['string', 'null'] } }]
    }, { openapi: OAS31 }),
    bodyPropertyCase('nullable-type-array-body', 'body property `type: [integer, "null"]`', { type: ['integer', 'null'] }),
    bodyPropertyCase('numeric-exclusive-bounds', 'numeric `exclusiveMinimum` / `exclusiveMaximum`', { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 100 }),
    bodyPropertyCase('examples-array', 'schema `examples` array', { type: 'string', examples: ['new', 'paid'] }),
    bodyPropertyCase('const', '`const`', { const: 'fixed' }),
    bodyPropertyCase('enum-without-type', '`enum` without `type`', { enum: ['new', 'paid', 1] }),
    bodyPropertyCase('boolean-schema', 'boolean schema `true`', true),
    bodyPropertyCase('content-media-type-encoding', '`contentMediaType` / `contentEncoding`', { type: 'string', contentMediaType: 'image/png', contentEncoding: 'base64' }),
  ]
  const SECURITY = ['mutual-tls', 'roles-on-api-key', 'roles-on-http-bearer']
  const RESPONSES = ['no-responses']
  return [
    ['security', 'Security', cases.filter(c => SECURITY.includes(c.slug))],
    ['responses', 'Responses', cases.filter(c => RESPONSES.includes(c.slug))],
    ['schemas', 'Schemas', cases.filter(c => !SECURITY.includes(c.slug) && !RESPONSES.includes(c.slug))],
  ]
}

function collectOas31StructureCases() {
  const reference = structureCase('reference-description-overrides', 'Reference Object `description` overrides on a parameter, a request body, and a response', (document) => {
    document.openapi = OAS31
    document.paths[SHORT_PATH] = {
      post: {
        parameters: [{ $ref: '#/components/parameters/PageSize', description: 'Overridden next to the `$ref`.' }],
        requestBody: { $ref: '#/components/requestBodies/OrderBody', description: 'Body description overridden next to the `$ref`.' },
        responses: { 200: { $ref: '#/components/responses/Ok', description: 'Response description overridden next to the `$ref`.' } },
      },
    }
    Object.assign(components(document), {
      parameters: { PageSize: { name: 'pageSize', in: 'query', description: 'Original description.', schema: { type: 'integer' } } },
      requestBodies: { OrderBody: { description: 'Original body description.', content: { 'application/json': { schema: bodySchema(false) } } } },
      responses: { Ok: { description: 'Original response description.' } },
    })
  })
  const pathItems = structureCase('components-path-items', 'path item referenced from `components.pathItems`', (document) => {
    document.openapi = OAS31
    document.paths[SHORT_PATH] = { $ref: '#/components/pathItems/Orders' }
    components(document).pathItems = {
      Orders: { post: { summary: 'Update an order (from components.pathItems)', responses: { 200: statusOnly() } } },
    }
  })
  return [reference, pathItems]
}

/** Groups in Storybook order; `fields` is split into semantic sub-groups. */
export function collectGroups() {
  const oas30 = { dialect: 'oas30', dialectTitle: 'OAS 3.0', digits: 2 }
  const oas31 = { dialect: 'oas31', dialectTitle: 'OAS 3.1', digits: 2 }
  const fields = (dialect, subgroups) => subgroups.map(([folder, title, cases]) => ({ ...dialect, group: `fields/${folder}`, title: `Fields/${title}`, cases }))
  return [
    { ...oas30, group: 'e2e', title: 'E2E', cases: collectE2eCases(), digits: 3 },
    { ...oas30, group: 'minimal', title: 'Minimal', cases: collectMinimalCases() },
    { ...oas30, group: 'http-methods', title: 'HTTP Methods', ...collectHttpMethodsGroup() },
    ...fields(oas30, collectFieldsSubgroups()),
    { ...oas30, group: 'structure', title: 'Document Structure', cases: collectStructureCases() },
    ...fields(oas31, collectOas31FieldsSubgroups()),
    { ...oas31, group: 'structure', title: 'Document Structure', cases: collectOas31StructureCases() },
  ]
}

export const E2E_SECTION_IDS = SECTIONS.map(section => section.id)
