import { OpenApiTreeBuilder } from "@netcracker/qubership-apihub-next-data-model"
import { resolveChildPrecededBy } from "../src/components/JsonSchemaViewer/utils/resolve-child-preceded-by"
import { PrecededBy } from "../src/components/shared-components/WithPrecededByProps"
import { getSecurityAlternatives } from "../src/utils/security/node-type-checkers"
import {
  findOpenApiChild,
  isOpenApiOperationNode,
  isOpenApiRequestBodyNode,
  isOpenApiRequestNode,
  isOpenApiResponsesNode,
  isOpenApiSecurityNode,
} from "../src/utils/openapi/node-type-checkers"
import { OpenApiViewSelection } from "../src/utils/openapi/view-selection"

const schema = { type: 'object', properties: { id: { type: 'string' } } }

function operation() {
  const tree = new OpenApiTreeBuilder({
    source: {
      openapi: '3.0.3',
      info: { title: 'Orders', version: '1.0.0' },
      components: { securitySchemes: { api_key: { type: 'apiKey', in: 'header', name: 'X-API-Key' }, basic: { type: 'http', scheme: 'basic' } } },
      paths: {
        '/orders': {
          post: {
            security: [{ api_key: [] }, { basic: [] }],
            requestBody: { content: { 'application/json': { schema }, 'application/xml': { schema } } },
            responses: { 400: { description: 'Bad.' }, 201: { description: 'Created.' }, default: { description: 'Error.' } },
          },
        },
      },
    },
    operationKeys: { path: '/orders', method: 'post' },
  }).build()
  const node = tree.root
  if (!isOpenApiOperationNode(node)) {
    throw new Error('no operation')
  }
  return node
}

function required<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('missing node')
  }
  return value
}

describe("OpenAPI view selection", () => {
  it("defaults to the first alternative and follows the selection", () => {
    const security = required(findOpenApiChild(operation(), isOpenApiSecurityNode))
    const first = OpenApiViewSelection.alternative(security, new Map())
    // The alternatives are nested nodes of the section's `securityAlternatives` container.
    const [firstAlternative, second] = getSecurityAlternatives(security)
    expect(first?.id).toBe(firstAlternative.id)
    expect(OpenApiViewSelection.alternative(security, new Map([[security.id, second.id]]))?.id).toBe(second.id)
  })

  it("defaults to the first 2XX response, not to the first code", () => {
    const responses = required(findOpenApiChild(operation(), isOpenApiResponsesNode))
    expect(OpenApiViewSelection.response(responses, new Map())?.key).toBe('201')
  })

  it("keeps the media-type selection per owner and ignores unknown ids", () => {
    const body = required(findOpenApiChild(findOpenApiChild(operation(), isOpenApiRequestNode), isOpenApiRequestBodyNode))
    const xml = OpenApiViewSelection.mediaTypes(body)[1]
    expect(OpenApiViewSelection.mediaType(body, new Map())?.key).toBe('application/json')
    expect(OpenApiViewSelection.mediaType(body, new Map([[body.id, xml.id]]))?.key).toBe('application/xml')
    expect(OpenApiViewSelection.mediaType(body, new Map([['another-owner', xml.id]]))?.key).toBe('application/json')
    expect(OpenApiViewSelection.mediaType(body, new Map([[body.id, 'unknown']]))?.key).toBe('application/json')
  })
})

describe("JSON Schema first row hook", () => {
  it("hands the root's precededBy to the first child only when the root row is suppressed", () => {
    expect(resolveChildPrecededBy(true, PrecededBy.SEPARATOR_LAYOUT_NESTED_VIEWER_START, 0)).toBe(PrecededBy.SEPARATOR_LAYOUT_NESTED_VIEWER_START)
    expect(resolveChildPrecededBy(true, PrecededBy.SEPARATOR_LAYOUT_NESTED_VIEWER_START, 1)).toBe(PrecededBy.JSON_SCHEMA_PROPERTY)
    expect(resolveChildPrecededBy(false, PrecededBy.SEPARATOR_LAYOUT_NESTED_VIEWER_START, 0)).toBe(PrecededBy.JSON_SCHEMA_PROPERTY)
    expect(resolveChildPrecededBy(true, undefined, 0)).toBe(PrecededBy.JSON_SCHEMA_PROPERTY)
  })
})
