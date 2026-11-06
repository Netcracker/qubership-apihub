/**
 * Case definitions of the OpenAPI Operation Diffs Suite (`packages/samples/openapi-diffs/`).
 *
 * Every case is a before / after pair derived from its category's minimal base document by
 * mutators. Rules (docs/design/openapi/features/diffs-case-matrix.md):
 * - Minimal operation: a base document holds only what its category covers (the cookies base has
 *   cookie parameters only, the security base one scheme and requirement). Anything else a case
 *   needs is added by its `setup`, so a change to an unrelated fragment never touches a case.
 *   OAS 3.0 requires `responses`: categories that do not cover responses keep a status-only
 *   `200` (`description: ''`); the OAS 3.1 base has no `responses`.
 * - `pair(...)` emits a change and its opposite next to each other (add <-> remove, on <-> off,
 *   A -> B <-> B -> A for moves); `change(...)` emits a value replace with no opposite.
 * - Parameter-like fragments (path / query / header / cookie parameters, response headers) and
 *   the two bodies share one case list, so the same case id means the same change in every
 *   fragment folder; a change that a fragment cannot express is skipped (gap in the numbering).
 * - Changes inside JSON Schemas are not fanned out: one representative case per body.
 *
 * Regenerate: `node bin/generate-openapi-diffs-suite.mjs`.
 */

/** Path of every case except path parameters (no path parameters, no template). */
const OPERATION_PATH = '/orders'
/** Path of the path-parameter cases. */
const PATH_PARAMETERS_PATH = '/orders/{orderId}'

/** OAS 3.0 requires `responses`: the smallest valid value (the viewer hides the empty text). */
const statusOnlyResponses = () => ({ 200: { description: '' } })

/** A minimal document: `POST <path>` holding `post` only (plus `components` when given). */
function createDocument(post, { openapi = '3.0.3', path = OPERATION_PATH, components } = {}) {
  return {
    openapi,
    info: { title: 'Orders', version: '1.0.0' },
    paths: { [path]: { post } },
    ...(components ? { components } : {}),
  }
}

/** Security scheme definitions; a case defines only the schemes it references. */
const SECURITY_SCHEMES = {
  api_key: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
  basic: { type: 'http', scheme: 'basic' },
  bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  oauth: {
    type: 'oauth2',
    flows: {
      clientCredentials: {
        tokenUrl: 'https://auth.example.com/token',
        scopes: { 'orders:read': 'Read orders', 'orders:write': 'Modify orders' },
      },
    },
  },
  oidc: { type: 'openIdConnect', openIdConnectUrl: 'https://auth.example.com/.well-known/openid-configuration' },
  mtls: { type: 'mutualTLS' },
}

const PARAMETER_ENTRIES = {
  path: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
  query: [
    { name: 'dryRun', in: 'query', schema: { type: 'boolean' } },
    { name: 'expand', in: 'query', schema: { type: 'string' } },
  ],
  header: [
    { name: 'X-Request-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
    { name: 'X-Trace', in: 'header', schema: { type: 'string' } },
  ],
  cookie: [
    { name: 'session', in: 'cookie', schema: { type: 'string' } },
    { name: 'theme', in: 'cookie', schema: { type: 'string' } },
  ],
}

const createRequestBody = () => ({
  description: 'New order state.',
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['new', 'paid'] },
          note: { type: 'string' },
        },
      },
    },
  },
})

const createResponseContent = () => ({
  'application/json': {
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string' },
      },
    },
  },
})

/** Operation category: a bare operation; every case adds the operation fields it covers. */
export const createOperationBase = () => createDocument({ responses: statusOnlyResponses() })

/** Parameter categories: the parameters of one location only. */
const createParametersBase = (location) => () => createDocument(
  { parameters: structuredClone(PARAMETER_ENTRIES[location]), responses: statusOnlyResponses() },
  { path: location === 'path' ? PATH_PARAMETERS_PATH : OPERATION_PATH },
)

/** Response headers category: the headers of a status-only `200`. */
const createResponseHeadersBase = () => createDocument({
  responses: {
    200: {
      description: '',
      headers: {
        ETag: { schema: { type: 'string' } },
        'X-Request-Id': { schema: { type: 'string', format: 'uuid' } },
      },
    },
  },
})

/** Request body category: the request body only. */
const createRequestBodyBase = () => createDocument({ requestBody: createRequestBody(), responses: statusOnlyResponses() })

/** Response body category: the body of a `200` without a description. */
const createResponseBodyBase = () => createDocument({ responses: { 200: { description: '', content: createResponseContent() } } })

/** Responses category: `200` (headers + body; initially selected) and a description-only `400`. */
const createResponsesBase = () => createDocument({
  responses: {
    200: {
      description: 'Updated order.',
      headers: { ETag: { schema: { type: 'string' } } },
      content: createResponseContent(),
    },
    400: { description: 'Invalid request.' },
  },
})

/** Security category: one OAuth requirement and its scheme definition. */
const createSecurityBase = () => createDocument(
  { security: [{ oauth: ['orders:write'] }], responses: statusOnlyResponses() },
  { components: { securitySchemes: { oauth: structuredClone(SECURITY_SCHEMES.oauth) } } },
)

/** OAS 3.1 base: a bare operation, no `responses` (optional in 3.1); every case adds its own content. */
export const createOas31Base = () => createDocument({}, { openapi: '3.1.0' })

// ---------------------------------------------------------------------------------------------
// Accessors

export const operation = (doc) => Object.values(doc.paths)[0].post
const response = (doc, code = '200') => operation(doc).responses[code]
const requestBody = (doc) => operation(doc).requestBody
const scheme = (doc, name) => doc.components.securitySchemes[name]

/** Adds the definitions of `names` to `components.securitySchemes`. */
function defineSchemes(doc, ...names) {
  doc.components ??= {}
  doc.components.securitySchemes ??= {}
  for (const name of names) {
    doc.components.securitySchemes[name] = structuredClone(SECURITY_SCHEMES[name])
  }
}

/** Replaces the operation security by `requirement`; only its schemes stay defined. */
const withSecurity = (requirement) => (doc) => {
  operation(doc).security = [requirement]
  doc.components = { securitySchemes: {} }
  defineSchemes(doc, ...Object.keys(requirement))
}

function renameKey(record, from, to) {
  const entries = Object.entries(record).map(([key, value]) => [key === from ? to : key, value])
  for (const key of Object.keys(record)) {
    delete record[key]
  }
  Object.assign(record, Object.fromEntries(entries))
}

// ---------------------------------------------------------------------------------------------
// Parameter-like fragments: one adapter per fragment, the same case list for all of them.

function parameterFragment(location, target, extra) {
  const all = (doc) => operation(doc).parameters
  return {
    location,
    target,
    extra,
    get: (doc, name = target) => all(doc).find(entry => entry.in === location && entry.name === name),
    add: (doc, name, entry) => { all(doc).push({ name, in: location, ...entry }) },
    remove: (doc, name) => {
      operation(doc).parameters = all(doc).filter(entry => !(entry.in === location && entry.name === name))
    },
    removeAll: (doc) => {
      operation(doc).parameters = all(doc).filter(entry => entry.in !== location)
      if (operation(doc).parameters.length === 0) {
        delete operation(doc).parameters
      }
    },
    rename: (doc, from, to) => { all(doc).find(entry => entry.in === location && entry.name === from).name = to },
  }
}

const RESPONSE_HEADERS_FRAGMENT = {
  location: 'response header',
  target: 'ETag',
  extra: 'X-Rate-Limit-Remaining',
  get: (doc, name = 'ETag') => response(doc).headers[name],
  add: (doc, name, entry) => { response(doc).headers[name] = entry },
  remove: (doc, name) => { delete response(doc).headers[name] },
  removeAll: (doc) => { delete response(doc).headers },
  rename: (doc, from, to) => renameKey(response(doc).headers, from, to),
}

const PATH_PARAMETERS_FRAGMENT = {
  ...parameterFragment('path', 'orderId', undefined),
  // A path parameter cannot be added, removed, or made optional without changing the path template
  // (apiDiff then pairs different paths = a different operation); its rename renames the template.
  rename: (doc, from, to) => {
    const pathItem = doc.paths[PATH_PARAMETERS_PATH]
    delete doc.paths[PATH_PARAMETERS_PATH]
    doc.paths[PATH_PARAMETERS_PATH.replace(`{${from}}`, `{${to}}`)] = pathItem
    pathItem.post.parameters.find(entry => entry.in === 'path' && entry.name === from).name = to
  },
  pathTemplate: true,
}

export const PARAMETER_FRAGMENTS = [
  { folder: 'path-parameters', title: 'Path Parameters', fragment: PATH_PARAMETERS_FRAGMENT, createBase: createParametersBase('path') },
  { folder: 'query-parameters', title: 'Query Parameters', fragment: parameterFragment('query', 'dryRun', 'limit'), createBase: createParametersBase('query') },
  { folder: 'request-headers', title: 'Request Headers', fragment: parameterFragment('header', 'X-Trace', 'X-Client'), createBase: createParametersBase('header') },
  { folder: 'cookies', title: 'Cookies', fragment: parameterFragment('cookie', 'session', 'locale'), createBase: createParametersBase('cookie') },
  { folder: 'response-headers', title: 'Response Headers', fragment: RESPONSE_HEADERS_FRAGMENT, createBase: createResponseHeadersBase },
]

// Both forms carry the same schema: a `schema` <-> `content` switch differs only by the media type.
const ENTRY_SCHEMA = { type: 'boolean', description: 'Boolean flag.' }

function setDescriptions(entry, entryText, schemaText) {
  entry.description = entryText
  entry.schema.description = schemaText
}

const setSchemaForm = (f) => (doc) => {
  const entry = f.get(doc)
  delete entry.content
  entry.schema = structuredClone(ENTRY_SCHEMA)
}
const setContentForm = (f) => (doc) => {
  const entry = f.get(doc)
  delete entry.schema
  entry.content = { 'application/json': { schema: structuredClone(ENTRY_SCHEMA) } }
}

/**
 * The shared parameter-like case list. `skip(f)` marks fragments that cannot express the change.
 * Entries: `{ pair: [slugA, slugB], titles, apply, setup?, skip? }` or `{ change: slug, title, before, after, setup?, skip? }`.
 */
export const PARAMETER_CASES = [
  {
    pair: ['entry-added', 'entry-removed'],
    titles: ['one more entry added', 'one of several entries removed'],
    skip: f => f.pathTemplate,
    apply: f => doc => f.add(doc, f.extra, { schema: { type: 'string' } }),
  },
  {
    change: 'entry-renamed',
    title: 'entry renamed (path: the path template is renamed too)',
    after: f => doc => f.rename(doc, f.target, f.pathTemplate ? 'id' : `${f.target}-v2`),
  },
  {
    pair: ['required-added', 'required-removed'],
    titles: ['entry became required', 'entry became optional'],
    skip: f => f.pathTemplate,
    apply: f => doc => { f.get(doc).required = true },
  },
  {
    pair: ['description-added', 'description-removed'],
    titles: ['entry description added', 'entry description removed'],
    apply: f => doc => { f.get(doc).description = 'Entry text v1.' },
  },
  {
    change: 'description-changed',
    title: 'entry description replaced',
    setup: f => doc => { f.get(doc).description = 'Entry text v1.' },
    after: f => doc => { f.get(doc).description = 'Entry text v2.' },
  },
  {
    pair: ['deprecated-added', 'deprecated-removed'],
    titles: ['entry became deprecated', 'entry is no longer deprecated'],
    apply: f => doc => { f.get(doc).deprecated = true },
  },
  {
    pair: ['schema-to-content', 'content-to-schema'],
    titles: ['`schema` replaced by `content` (media type annotation added)', '`content` replaced by `schema`'],
    setup: setSchemaForm,
    apply: setContentForm,
  },
  {
    change: 'content-media-type-renamed',
    title: '`content` media type renamed, same schema',
    setup: setContentForm,
    after: f => doc => renameKey(f.get(doc).content, 'application/json', 'application/json; charset=utf-8'),
  },
  {
    pair: ['extension-added', 'extension-removed'],
    titles: ['entry `x-*` added', 'entry `x-*` removed'],
    apply: f => doc => { f.get(doc)['x-owner'] = 'orders-team' },
  },
  {
    change: 'extension-changed',
    title: 'entry `x-*` replaced and another one added',
    setup: f => doc => { f.get(doc)['x-owner'] = 'orders-team' },
    after: f => doc => Object.assign(f.get(doc), { 'x-owner': 'billing-team', 'x-internal': true }),
  },
  {
    pair: ['extension-moved-to-schema', 'extension-moved-to-entry'],
    titles: ['`x-*` moved from the entry to its schema (no diff)', '`x-*` moved from the schema to the entry (no diff)'],
    setup: f => doc => { f.get(doc)['x-owner'] = 'orders-team' },
    apply: f => doc => {
      const entry = f.get(doc)
      delete entry['x-owner']
      entry.schema['x-owner'] = 'orders-team'
    },
  },
  {
    pair: ['all-added', 'all-removed'],
    titles: ['the whole group appears', 'the whole group disappears'],
    skip: f => f.pathTemplate,
    reversed: true,
    apply: f => doc => f.removeAll(doc),
  },
  {
    pair: ['description-moved-entry-to-schema', 'description-moved-schema-to-entry'],
    titles: ['same text moved from the entry to the schema root (no diff)', 'same text moved from the schema root to the entry (no diff)'],
    setup: f => doc => { f.get(doc).description = 'Entry text v1.' },
    apply: f => doc => {
      const entry = f.get(doc)
      delete entry.description
      entry.schema.description = 'Entry text v1.'
    },
  },
  {
    pair: ['description-entry-removed-schema-added', 'description-schema-removed-entry-added'],
    titles: ['entry text removed, other text added to the schema root', 'schema-root text removed, other text added to the entry'],
    setup: f => doc => { f.get(doc).description = 'Entry text v1.' },
    apply: f => doc => {
      const entry = f.get(doc)
      delete entry.description
      entry.schema.description = 'Schema text v2.'
    },
  },
  {
    change: 'description-both-places-changed',
    title: 'entry and schema-root texts both replaced (the entry text wins)',
    setup: f => doc => setDescriptions(f.get(doc), 'Entry text v1.', 'Schema text v1.'),
    after: f => doc => setDescriptions(f.get(doc), 'Entry text v2.', 'Schema text v2.'),
  },
  {
    change: 'description-schema-changed-under-entry',
    title: 'only the shadowed schema-root text replaced (no diff)',
    setup: f => doc => setDescriptions(f.get(doc), 'Entry text v1.', 'Schema text v1.'),
    after: f => doc => setDescriptions(f.get(doc), 'Entry text v1.', 'Schema text v2.'),
  },
]

/** Cases only one fragment can express, appended after the shared list of that fragment. */
export const PARAMETER_EXTRA_CASES = {
  'query-parameters': [
    {
      pair: ['moved-query-to-header', 'moved-header-to-query'],
      titles: ['`dryRun` moved from query to header', '`dryRun` moved from header to query'],
      apply: () => doc => { operation(doc).parameters.find(entry => entry.name === 'dryRun').in = 'header' },
    },
  ],
}

// ---------------------------------------------------------------------------------------------
// Bodies: request body and the response body of `200` share one case list.

const REQUEST_BODY_FRAGMENT = {
  isRequest: true,
  owner: requestBody,
  content: doc => requestBody(doc).content,
  removeBody: doc => { delete operation(doc).requestBody },
}

const RESPONSE_BODY_FRAGMENT = {
  isRequest: false,
  owner: doc => response(doc),
  content: doc => response(doc).content,
  removeBody: doc => { delete response(doc).content },
}

export const BODY_FRAGMENTS = [
  { folder: 'request-body', title: 'Request Body', fragment: REQUEST_BODY_FRAGMENT, createBase: createRequestBodyBase },
  { folder: 'response-body', title: 'Response Body', fragment: RESPONSE_BODY_FRAGMENT, createBase: createResponseBodyBase },
]

const jsonMediaType = b => doc => b.content(doc)['application/json']

export const BODY_CASES = [
  {
    pair: ['body-added', 'body-removed'],
    titles: ['the whole Body appears', 'the whole Body disappears'],
    reversed: true,
    apply: b => doc => b.removeBody(doc),
  },
  {
    pair: ['required-added', 'required-removed'],
    titles: ['Body became required', 'Body became optional'],
    skip: b => !b.isRequest,
    setup: () => doc => { delete requestBody(doc).required },
    apply: () => doc => { requestBody(doc).required = true },
  },
  {
    pair: ['description-added', 'description-removed'],
    titles: ['Body description added', 'Body description removed'],
    skip: b => !b.isRequest,
    setup: () => doc => { delete requestBody(doc).description },
    apply: () => doc => { requestBody(doc).description = 'New order state.' },
  },
  {
    change: 'description-changed',
    title: 'Body description replaced',
    skip: b => !b.isRequest,
    after: () => doc => { requestBody(doc).description = 'The new state of the order.' },
  },
  {
    pair: ['media-type-added', 'media-type-removed'],
    titles: ['second media type added', 'one of two media types removed'],
    apply: b => doc => { b.content(doc)['application/xml'] = { schema: { type: 'string' } } },
  },
  {
    change: 'media-type-renamed',
    title: 'the only media type renamed, same schema',
    after: b => doc => renameKey(b.content(doc), 'application/json', 'application/json; charset=utf-8'),
  },
  {
    pair: ['only-media-type-added', 'only-media-type-removed'],
    titles: ['the only media type appears, no description (Body appears)', 'the only media type disappears, no description (Body disappears)'],
    skip: b => !b.isRequest,
    reversed: true,
    setup: () => doc => { delete requestBody(doc).description },
    apply: () => doc => { requestBody(doc).content = {} },
  },
  {
    pair: ['media-type-added-description-kept', 'media-type-removed-description-kept'],
    titles: ['the only media type appears next to a description (Body stays)', 'the only media type disappears, the description stays (Body stays)'],
    skip: b => !b.isRequest,
    reversed: true,
    apply: () => doc => { requestBody(doc).content = {} },
  },
  {
    pair: ['schema-added', 'schema-removed'],
    titles: ['the only media type gets a schema (Body appears)', 'the only media type loses its schema (Body disappears)'],
    reversed: true,
    setup: b => doc => { if (b.isRequest) delete requestBody(doc).description },
    apply: b => doc => { delete jsonMediaType(b)(doc).schema },
  },
  {
    pair: ['schema-property-added', 'schema-property-removed'],
    titles: ['schema property added (one representative JSON Schema change)', 'schema property removed'],
    apply: b => doc => { jsonMediaType(b)(doc).schema.properties.total = { type: 'number' } },
  },
  {
    change: 'schema-type-changed',
    title: 'schema replaced: object -> array of objects',
    after: b => doc => {
      const mediaType = jsonMediaType(b)(doc)
      mediaType.schema = { type: 'array', items: mediaType.schema }
    },
  },
  {
    pair: ['body-extension-added', 'body-extension-removed'],
    titles: ['Request Body `x-*` added (cloned into every schema)', 'Request Body `x-*` removed'],
    skip: b => !b.isRequest,
    apply: () => doc => { requestBody(doc)['x-max-size'] = '1MB' },
  },
  {
    pair: ['media-type-extension-added', 'media-type-extension-removed'],
    titles: ['media type `x-*` added (cloned into its schema)', 'media type `x-*` removed'],
    apply: b => doc => { jsonMediaType(b)(doc)['x-codec'] = 'gzip' },
  },
  {
    change: 'extensions-changed',
    title: 'Request Body `x-*` replaced, media type `x-*` added; an `x-*` key in `content` is ignored',
    skip: b => !b.isRequest,
    setup: () => doc => { requestBody(doc)['x-max-size'] = '1MB' },
    after: () => doc => {
      requestBody(doc)['x-max-size'] = '5MB'
      jsonMediaType(REQUEST_BODY_FRAGMENT)(doc)['x-codec'] = 'gzip'
      requestBody(doc).content['x-not-a-media-type'] = 'ignored'
    },
  },
  {
    change: 'media-type-extension-shadows-schema-root',
    title: 'media type `x-*` added over a schema-root `x-*` of the same key (replace)',
    setup: b => doc => { jsonMediaType(b)(doc).schema['x-codec'] = 'none' },
    after: b => doc => { jsonMediaType(b)(doc)['x-codec'] = 'gzip' },
  },
]

// ---------------------------------------------------------------------------------------------
// Single-folder categories

const RESPONSE_CODE_KINDS = [
  ['1xx', '101', 'Switching protocols.'],
  ['2xx', '201', 'Order created.'],
  ['3xx', '303', 'See the order.'],
  ['4xx', '404', 'Order not found.'],
  ['5xx', '500', 'Server error.'],
  ['range', '5XX', 'Any server error.'],
  ['default', 'default', 'Unexpected error.'],
]

const addResponse = (code, description) => doc => {
  operation(doc).responses[code] = {
    description,
    headers: { 'Retry-After': { schema: { type: 'integer' } } },
    content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } },
  }
}

const withSummary = doc => { operation(doc).summary = 'Update an order' }
const withOperationId = doc => { operation(doc).operationId = 'updateOrder' }
const withDescription = doc => { operation(doc).description = 'Replaces the order.' }
const withRateLimitExtension = doc => { operation(doc)['x-rate-limit'] = 100 }
const withPath = path => doc => renameKey(doc.paths, OPERATION_PATH, path)

/** Too long for one side at the base font size, fits at a smaller one. */
const LONG_OPERATION_PATH = '/achmeainsurancecontracts/orders/insuredwagecalculationpercentages/yearendbonusandholidayallowance'
/** Too long for one side even at the minimum font size: wraps. */
const VERY_LONG_OPERATION_PATH = `${LONG_OPERATION_PATH}/payrolladministrations/employments/wagecomponents/calculationresults/historicalperiodsoverview/exportdefinitions`

export const OPERATION_CASES = [
  { pair: ['summary-added', 'summary-removed'], titles: ['summary added (title row appears)', 'summary removed'], apply: () => withSummary },
  { change: 'summary-changed', title: 'summary replaced', setup: () => withSummary, after: () => doc => { operation(doc).summary = 'Replace an order' } },
  { pair: ['operation-id-added', 'operation-id-removed'], titles: ['operation ID added', 'operation ID removed'], apply: () => withOperationId },
  { change: 'operation-id-changed', title: 'operation ID replaced', setup: () => withOperationId, after: () => doc => { operation(doc).operationId = 'replaceOrder' } },
  { pair: ['description-added', 'description-removed'], titles: ['description added', 'description removed'], apply: () => withDescription },
  { change: 'description-changed', title: 'description replaced', setup: () => withDescription, after: () => doc => { operation(doc).description = 'Replaces the whole order.' } },
  {
    pair: ['external-docs-added', 'external-docs-removed'],
    titles: ['external docs added', 'external docs removed'],
    apply: () => doc => { operation(doc).externalDocs = { url: 'https://docs.example.com/orders', description: 'Orders guide' } },
  },
  {
    change: 'external-docs-url-changed',
    title: 'external docs URL replaced (row painted)',
    setup: () => doc => { operation(doc).externalDocs = { url: 'https://docs.example.com/orders', description: 'Orders guide' } },
    after: () => doc => { operation(doc).externalDocs.url = 'https://docs.example.com/v2/orders' },
  },
  {
    change: 'external-docs-description-changed',
    title: 'external docs description replaced (yellow row, highlighted link; each tooltip shows its own side)',
    setup: () => doc => { operation(doc).externalDocs = { url: 'https://docs.example.com/orders', description: 'Orders guide' } },
    after: () => doc => { operation(doc).externalDocs.description = 'Orders guide v2' },
  },
  {
    pair: ['deprecated-added', 'deprecated-removed'],
    titles: ['operation became deprecated (tag on the title row)', 'operation is no longer deprecated'],
    setup: () => withSummary,
    apply: () => doc => { operation(doc).deprecated = true },
  },
  {
    pair: ['deprecated-added-without-summary', 'deprecated-removed-without-summary'],
    titles: ['became deprecated, no summary (tag and yellow row on the operation ID row)', 'no longer deprecated, no summary (tag and yellow row on the operation ID row)'],
    setup: () => withOperationId,
    apply: () => doc => { operation(doc).deprecated = true },
  },
  {
    pair: ['extension-added', 'extension-removed'],
    titles: ['one more `x-*` added', 'one of several `x-*` removed'],
    setup: () => withRateLimitExtension,
    apply: () => doc => { operation(doc)['x-audience'] = { visibility: 'public' } },
  },
  { change: 'extension-changed', title: '`x-*` replaced', setup: () => withRateLimitExtension, after: () => doc => { operation(doc)['x-rate-limit'] = 200 } },
  { pair: ['extensions-added', 'extensions-removed'], titles: ['Extensions section appears', 'Extensions section disappears'], apply: () => withRateLimitExtension },
  {
    pair: ['operation-added', 'operation-removed'],
    titles: ['whole operation added next to an existing GET', 'whole operation removed, GET stays'],
    reversed: true,
    setup: () => doc => { doc.paths[OPERATION_PATH].get = { responses: { 200: { description: 'The order.' } } } },
    apply: () => doc => { delete doc.paths[OPERATION_PATH].post },
  },
  {
    change: 'long-path-summary-changed',
    title: 'summary replaced, long path: the address value font shrinks to fit each side (same size on both sides)',
    setup: () => withPath(LONG_OPERATION_PATH),
    before: () => withSummary,
    after: () => doc => { operation(doc).summary = 'Replace an order' },
  },
  {
    change: 'very-long-path-summary-changed',
    title: 'summary replaced, very long path: the address value wraps at the minimum font size',
    setup: () => withPath(VERY_LONG_OPERATION_PATH),
    before: () => withSummary,
    after: () => doc => { operation(doc).summary = 'Replace an order' },
  },
]

export const RESPONSES_CASES = [
  ...RESPONSE_CODE_KINDS.map(([kind, code, description]) => ({
    pair: [`response-${kind}-added`, `response-${kind}-removed`],
    titles: [`\`${code}\` response added (headers + body)`, `\`${code}\` response removed`],
    apply: () => addResponse(code, description),
    clicks: [`response-code-${code}`],
  })),
  {
    change: 'code-case-renamed',
    title: '`4xx` renamed to `4XX`',
    setup: () => addResponse('4xx', 'Client error.'),
    after: () => doc => renameKey(operation(doc).responses, '4xx', '4XX'),
    clicks: ['response-code-4XX'],
  },
  {
    change: 'code-renamed-and-description-changed',
    title: '`4xx` renamed to `4XX` and its description replaced',
    setup: () => addResponse('4xx', 'Client error.'),
    after: () => doc => {
      renameKey(operation(doc).responses, '4xx', '4XX')
      operation(doc).responses['4XX'].description = 'Any client error.'
    },
    clicks: ['response-code-4XX'],
  },
  { change: 'description-changed', title: 'response description replaced', after: () => doc => { response(doc).description = 'The order after the update.' } },
  {
    change: 'description-changed-non-initial-code',
    title: 'description of `400` replaced (marker on `400`, `200` selected)',
    after: () => doc => { response(doc, '400').description = 'The request is invalid.' },
  },
  { pair: ['response-extension-added', 'response-extension-removed'], titles: ['Response `x-*` added (Extensions subsection appears)', 'Response `x-*` removed'], apply: () => doc => { response(doc)['x-cache'] = 'private' } },
  {
    change: 'response-extension-changed',
    title: 'Response `x-*` replaced',
    setup: () => doc => { response(doc)['x-cache'] = 'private' },
    after: () => doc => { response(doc)['x-cache'] = 'public' },
  },
  { pair: ['responses-extension-added', 'responses-extension-removed'], titles: ['Responses Object `x-*` added', 'Responses Object `x-*` removed'], apply: () => doc => { operation(doc).responses['x-rate-limited'] = true } },
  {
    change: 'responses-and-response-extensions-changed',
    title: 'Responses Object `x-*` added, Response `x-*` replaced, media type `x-*` added',
    setup: () => doc => { response(doc)['x-cache'] = 'private' },
    after: () => doc => {
      response(doc)['x-cache'] = 'public'
      response(doc).content['application/json']['x-codec'] = 'br'
      operation(doc).responses['x-rate-limited'] = true
    },
  },
  {
    change: 'changes-of-different-severity',
    title: 'description replaced, header added, property and media type removed (strongest marker wins)',
    setup: () => doc => { response(doc).content['application/xml'] = { schema: { type: 'string' } } },
    after: () => doc => {
      response(doc).description = 'The order after the update.'
      response(doc).headers['X-Rate-Limit-Remaining'] = { schema: { type: 'integer' } }
      delete response(doc).content['application/json'].schema.properties.status
      delete response(doc).content['application/xml']
    },
  },
]

export const SECURITY_CASES = [
  {
    pair: ['security-added', 'security-removed'],
    titles: ['`security: []` replaced by a requirement (section appears)', 'requirement replaced by `security: []` (section disappears)'],
    reversed: true,
    apply: () => doc => { operation(doc).security = [] },
  },
  {
    pair: ['document-security-overridden', 'document-security-override-removed'],
    titles: ['inherited document security replaced by an operation override', 'operation override removed, document security inherited'],
    reversed: true,
    setup: () => doc => {
      doc.security = [{ api_key: [] }]
      defineSchemes(doc, 'api_key')
    },
    apply: () => doc => { delete operation(doc).security },
  },
  {
    pair: ['alternative-added', 'alternative-removed'],
    titles: ['second alternative added', 'one of two alternatives removed'],
    setup: () => doc => defineSchemes(doc, 'api_key'),
    apply: () => doc => { operation(doc).security.push({ api_key: [] }) },
    clicks: ['security-alternative-1'],
  },
  {
    pair: ['anonymous-alternative-added', 'anonymous-alternative-removed'],
    titles: ['`{}` added: `Optional` badge appears (yellow title row, toolbar uncolored)', '`{}` removed: `Optional` badge disappears'],
    apply: () => doc => { operation(doc).security.push({}) },
  },
  {
    pair: ['scheme-added-to-alternative', 'scheme-removed-from-alternative'],
    titles: ['second scheme added to the alternative (AND)', 'one of two schemes removed from the alternative'],
    setup: () => doc => defineSchemes(doc, 'basic'),
    apply: () => doc => { operation(doc).security[0].basic = [] },
  },
  {
    pair: ['required-scope-added', 'required-scope-removed'],
    titles: ['required scope added', 'required scope removed'],
    apply: () => doc => { operation(doc).security[0].oauth.push('orders:read') },
  },
  {
    pair: ['scheme-description-added', 'scheme-description-removed'],
    titles: ['scheme description added', 'scheme description removed'],
    apply: () => doc => { scheme(doc, 'oauth').description = 'OAuth 2.0 client credentials.' },
  },
  {
    change: 'scheme-description-changed',
    title: 'scheme description replaced',
    setup: () => doc => { scheme(doc, 'oauth').description = 'OAuth 2.0 client credentials.' },
    after: () => doc => { scheme(doc, 'oauth').description = 'OAuth 2.0 client credentials for back-end services.' },
  },
  {
    change: 'scheme-type-changed',
    title: 'scheme type replaced: apiKey -> http bearer (type badge only)',
    setup: () => withSecurity({ api_key: [] }),
    after: () => doc => { doc.components.securitySchemes.api_key = { type: 'http', scheme: 'bearer' } },
  },
  {
    pair: ['scheme-definition-added', 'scheme-definition-removed'],
    titles: ['missing scheme definition added to components', 'scheme definition removed (unresolved card)'],
    setup: () => withSecurity({ api_key: [] }),
    reversed: true,
    apply: () => doc => { delete doc.components.securitySchemes.api_key },
  },
  { change: 'api-key-location-changed', title: 'apiKey `in` replaced: header -> query', setup: () => withSecurity({ api_key: [] }), after: () => doc => { scheme(doc, 'api_key').in = 'query' } },
  { change: 'api-key-name-changed', title: 'apiKey `name` replaced', setup: () => withSecurity({ api_key: [] }), after: () => doc => { scheme(doc, 'api_key').name = 'X-Orders-Key' } },
  { change: 'http-scheme-changed', title: 'http `scheme` replaced: basic -> digest', setup: () => withSecurity({ basic: [] }), after: () => doc => { scheme(doc, 'basic').scheme = 'digest' } },
  {
    pair: ['bearer-format-added', 'bearer-format-removed'],
    titles: ['http `bearerFormat` added', 'http `bearerFormat` removed'],
    setup: () => doc => {
      withSecurity({ bearer: [] })(doc)
      delete scheme(doc, 'bearer').bearerFormat
    },
    apply: () => doc => { scheme(doc, 'bearer').bearerFormat = 'JWT' },
  },
  {
    change: 'openid-connect-url-changed',
    title: '`openIdConnectUrl` replaced',
    setup: () => withSecurity({ oidc: [] }),
    after: () => doc => { scheme(doc, 'oidc').openIdConnectUrl = 'https://login.example.com/.well-known/openid-configuration' },
  },
  {
    pair: ['oauth-flow-added', 'oauth-flow-removed'],
    titles: ['OAuth flow added', 'one of two OAuth flows removed'],
    apply: () => doc => {
      scheme(doc, 'oauth').flows.authorizationCode = {
        authorizationUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        scopes: { 'orders:read': 'Read orders' },
      }
    },
  },
  { change: 'token-url-changed', title: 'flow `tokenUrl` replaced', after: () => doc => { scheme(doc, 'oauth').flows.clientCredentials.tokenUrl = 'https://auth.example.com/oauth2/token' } },
  {
    pair: ['refresh-url-added', 'refresh-url-removed'],
    titles: ['flow `refreshUrl` added', 'flow `refreshUrl` removed'],
    apply: () => doc => { scheme(doc, 'oauth').flows.clientCredentials.refreshUrl = 'https://auth.example.com/refresh' },
  },
  {
    pair: ['flow-scope-added', 'flow-scope-removed'],
    titles: ['available scope added', 'available scope removed'],
    apply: () => doc => { scheme(doc, 'oauth').flows.clientCredentials.scopes['orders:delete'] = 'Delete orders' },
  },
  {
    change: 'flow-scope-description-changed',
    title: 'available scope description replaced (tooltip)',
    after: () => doc => { scheme(doc, 'oauth').flows.clientCredentials.scopes['orders:read'] = 'Read all orders' },
  },
  {
    // apiDiff pairs alternatives by index: the slot is `{}` on one side and `{ api_key }` on the other.
    pair: ['anonymous-alternative-replaced-by-api-key', 'api-key-alternative-replaced-by-anonymous'],
    titles: ['`{}` replaced by an `api_key` alternative (badge removed, option added)', '`api_key` alternative replaced by `{}` (option removed, badge added)'],
    setup: () => doc => {
      operation(doc).security.push({})
      defineSchemes(doc, 'api_key')
    },
    apply: () => doc => { operation(doc).security[1] = { api_key: [] } },
    clicks: ['security-alternative-1'],
  },
]

export const OAS31_CASES = [
  {
    change: 'nullable-via-type-array',
    title: 'request body property became nullable via a type array',
    setup: () => doc => {
      operation(doc).requestBody = { content: { 'application/json': { schema: { type: 'object', properties: { note: { type: 'string' } } } } } }
    },
    after: () => doc => { requestBody(doc).content['application/json'].schema.properties.note.type = ['string', 'null'] },
  },
  {
    pair: ['mutual-tls-alternative-added', 'mutual-tls-alternative-removed'],
    titles: ['`mutualTLS` alternative added', '`mutualTLS` alternative removed'],
    setup: () => doc => {
      withSecurity({ api_key: [] })(doc)
      defineSchemes(doc, 'mtls')
    },
    apply: () => doc => { operation(doc).security.push({ mtls: [] }) },
    clicks: ['security-alternative-1'],
  },
  {
    pair: ['role-scopes-added', 'role-scopes-removed'],
    titles: [
      '`Required roles` added on an apiKey scheme (known gap: apiDiff reports no diff, both sides show the after roles)',
      '`Required roles` removed (known gap: apiDiff reports no diff)',
    ],
    setup: () => withSecurity({ api_key: [] }),
    apply: () => doc => { operation(doc).security[0].api_key = ['admin'] },
  },
  {
    pair: ['responses-added', 'responses-removed'],
    titles: ['`responses` appears (section appears)', '`responses` disappears (allowed in 3.1)'],
    apply: () => doc => { operation(doc).responses = { 200: { description: 'Updated order.' } } },
  },
]

/** Folders in Storybook order: { folder, title, createBase, cases, fragment?, family? }. */
export function collectCategories() {
  return [
    { folder: 'operation', title: 'Operation', createBase: createOperationBase, cases: OPERATION_CASES },
    ...PARAMETER_FRAGMENTS.map(({ folder, title, fragment, createBase }) => ({
      folder, title, createBase, fragment, family: 'parameters',
      cases: [...PARAMETER_CASES, ...(PARAMETER_EXTRA_CASES[folder] ?? [])],
    })),
    ...BODY_FRAGMENTS.map(({ folder, title, fragment, createBase }) => ({
      folder, title, createBase, fragment, family: 'bodies', cases: BODY_CASES,
    })),
    { folder: 'responses', title: 'Responses', createBase: createResponsesBase, cases: RESPONSES_CASES },
    { folder: 'security', title: 'Security', createBase: createSecurityBase, cases: SECURITY_CASES },
    { folder: 'oas31', title: 'OAS 3.1', createBase: createOas31Base, cases: OAS31_CASES },
  ]
}
