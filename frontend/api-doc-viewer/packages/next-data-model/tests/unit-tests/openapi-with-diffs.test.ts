import { OPENAPI_SECURITY_DISPLAY_LABELS } from '../../src/model/openapi/security-presentation'
import { TreeNodeComplexityTypes } from '../../src/model/abstract/tree/tree-node.interface'
import { SecurityRowDiffs } from '../../src/model/security/tree-with-diffs/row-diffs'
import { DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { OpenApiTreeWithDiffsBuilder } from '../../src/building-service/openapi/tree-with-diffs/builder'
import { NODE_LEVEL_DIFF_KEY, NodeDiffsSeverityPlacemennt } from '../../src/model/abstract/tree-with-diffs/tree-node.interface'
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from '../../src/model/abstract/layout-side'
import { OpenApiNodeVisibility } from '../../src/model/openapi/node-visibility'
import { OpenApiRowDiffs } from '../../src/model/openapi/tree-with-diffs/row-diffs'
import { OpenApiTreeWithDiffs } from '../../src/model/openapi/tree-with-diffs/tree.impl'
import { OpenApiTreeNodeWithDiffs } from '../../src/model/openapi/types/aliases'
import { OpenApiTreeNodeKind, OpenApiTreeNodeKinds } from '../../src/model/openapi/types/node-kind'
import { isOpenApiTreeNodeWithDiffs } from '../../src/shared/openapi/guards/tree-node'
import { isObject } from '../../src/utilities'
import { loadMergedOpenApiSample, OPENAPI_TEST_DIFF_META_KEYS } from '../helpers/openapi-fixtures'

const M = OPENAPI_TEST_DIFF_META_KEYS.diffsMetaKey
const OPERATION = { path: '/orders', method: 'post' }

function build(caseId: string, operationKeys = OPERATION): OpenApiTreeWithDiffs {
  return new OpenApiTreeWithDiffsBuilder({
    source: loadMergedOpenApiSample(caseId),
    operationKeys,
    diffsMetaKeys: OPENAPI_TEST_DIFF_META_KEYS,
  }).build()
}

function root(tree: OpenApiTreeWithDiffs): OpenApiTreeNodeWithDiffs {
  const node = tree.root
  if (!node || !isOpenApiTreeNodeWithDiffs(node)) {
    throw new Error('no root')
  }
  return node
}

function child(node: OpenApiTreeNodeWithDiffs, kind: OpenApiTreeNodeKind, key?: string | number): OpenApiTreeNodeWithDiffs {
  // A complex container's options are its nested nodes (selector options rule).
  const found = (node.type === TreeNodeComplexityTypes.COMPLEX ? node.nestedNodes() : node.childrenNodes()).find(candidate => candidate.kind === kind && (key === undefined || String(candidate.key) === String(key)))
  if (!found) {
    throw new Error(`no ${kind} ${key ?? ''} under ${node.kind}`)
  }
  return found
}

function wholeAction(node: OpenApiTreeNodeWithDiffs): string | undefined {
  return node.diffs[NODE_LEVEL_DIFF_KEY]?.data.action
}

function recordOf(value: unknown): Record<string, { action: string, beforeValue?: unknown, afterValue?: unknown, beforeKey?: unknown, afterKey?: unknown }> {
  const record = isObject(value) || Array.isArray(value) ? Reflect.get(value, M) : undefined
  return isObject(record) ? record as never : {}
}

function parametersSchema(tree: OpenApiTreeWithDiffs, location: string): Record<string, unknown> {
  const group = child(child(root(tree), OpenApiTreeNodeKinds.REQUEST), OpenApiTreeNodeKinds.PARAMETERS, location)
  const value = group.value()
  return isObject(value) && isObject(value.schema) ? value.schema : {}
}

function queryProperty(tree: OpenApiTreeWithDiffs, name: string): Record<string, unknown> {
  const properties = parametersSchema(tree, 'query').properties
  const property = isObject(properties) ? properties[name] : undefined
  return isObject(property) ? property : {}
}

function security(tree: OpenApiTreeWithDiffs): OpenApiTreeNodeWithDiffs {
  return child(root(tree), OpenApiTreeNodeKinds.SECURITY)
}

/** The alternatives of a Security section: nested nodes of its `securityAlternatives` container. */
function alternativesOf(security: OpenApiTreeNodeWithDiffs): OpenApiTreeNodeWithDiffs[] {
  return child(security, OpenApiTreeNodeKinds.SECURITY_ALTERNATIVES).nestedNodes()
}

function requestBody(tree: OpenApiTreeWithDiffs): OpenApiTreeNodeWithDiffs {
  return child(child(root(tree), OpenApiTreeNodeKinds.REQUEST), OpenApiTreeNodeKinds.REQUEST_BODY)
}

function responsesNode(tree: OpenApiTreeWithDiffs): OpenApiTreeNodeWithDiffs {
  return child(root(tree), OpenApiTreeNodeKinds.RESPONSES)
}

describe('OpenAPI with diffs: operation', () => {
  it('summary replace paints the title field', () => {
    expect(root(build('operation/03-summary-changed')).diffs.title?.data.action).toBe(DiffAction.replace)
  })

  it('path rename becomes an address replace and a path-parameter rename', () => {
    const tree = build('path-parameters/03-entry-renamed', { path: '/orders/{id}', method: 'post' })
    const pathDiff = root(tree).diffs.path?.data
    expect(pathDiff?.action).toBe(DiffAction.replace)
    expect(pathDiff && 'beforeValue' in pathDiff ? pathDiff.beforeValue : undefined).toBe('/orders/{orderId}')
    expect(wholeAction(root(tree))).toBeUndefined()
    const properties = parametersSchema(tree, 'path').properties
    expect(recordOf(properties).id).toMatchObject({ action: DiffAction.rename, beforeKey: 'orderId', afterKey: 'id' })
  })

  it('a wholly added operation is inherited by every node and lights no change marker', () => {
    const tree = build('operation/23-operation-added')
    expect(wholeAction(root(tree))).toBe(DiffAction.add)
    const responses = responsesNode(tree)
    expect(responses.diffs[NODE_LEVEL_DIFF_KEY]?.inherited).toBe(true)
    for (const response of responses.nestedNodes()) {
      expect(wholeAction(response)).toBe(DiffAction.add)
      expect([...response.descendantDiffsSummary]).toEqual([])
    }
  })

  it('deprecated and operation ID changes are field diffs', () => {
    expect(root(build('operation/14-deprecated-added')).diffs.deprecated?.data.action).toBe(DiffAction.add)
    expect(root(build('operation/06-operation-id-changed')).diffs.operationId?.data.action).toBe(DiffAction.replace)
  })

  it('the deprecated tag row is the title row, else the operation ID row, else the address row', () => {
    const value = { method: 'post', path: '/orders' }
    expect(OpenApiNodeVisibility.resolveOperation({ ...value, title: 'Update', operationId: 'update' }, false, 'detailed').deprecatedTagRow).toBe('title')
    expect(OpenApiNodeVisibility.resolveOperation({ ...value, title: 'Update', operationId: 'update' }, true, 'detailed').deprecatedTagRow).toBe('operationId')
    expect(OpenApiNodeVisibility.resolveOperation({ ...value }, false, 'detailed').deprecatedTagRow).toBe('address')
  })

  it.each([
    ['operation/16-deprecated-added-without-summary'],
    ['operation/17-deprecated-removed-without-summary'],
  ])('%s: a yellow operation ID row and its badge carry the deprecated change', (caseId) => {
    const operation = root(build(caseId))
    const rowDiff = OpenApiRowDiffs.Operation.takeOperationIdRowDiff(operation, 'operationId')
    expect(rowDiff?.styles.before.backgroundColor).toBe('yellow')
    expect(rowDiff?.styles.after.backgroundColor).toBe('yellow')
    expect(rowDiff?.styles.after.textHighlighterColor).toBeUndefined()
    expect(OpenApiRowDiffs.Operation.takeAddressRowDiff(operation, 'operationId')).toBeUndefined()
    const placement = OpenApiRowDiffs.Operation.resolveOperationIdRowSeverityPlacement('operationId')
    expect(placement).toBe(NodeDiffsSeverityPlacemennt.OperationIdRowWithDeprecatedTag)
    expect(operation.diffsSeverities?.[placement]?.type).toBe(operation.diffs.deprecated?.data.type)
    expect(operation.diffsSeverities?.[NodeDiffsSeverityPlacemennt.OperationIdRow]).toBeUndefined()
  })

  it('with a title row the deprecated change keeps painting and badging the title row', () => {
    const operation = root(build('operation/14-deprecated-added'))
    expect(OpenApiRowDiffs.Operation.takeTitleRowDiff(operation)?.styles.after.backgroundColor).toBe('yellow')
    expect(OpenApiRowDiffs.Operation.takeOperationIdRowDiff(operation, 'title')).toBeUndefined()
    expect(OpenApiRowDiffs.Operation.resolveOperationIdRowSeverityPlacement('title')).toBe(NodeDiffsSeverityPlacemennt.OperationIdRow)
    expect(operation.diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow]?.type).toBe(operation.diffs.deprecated?.data.type)
  })

  it('an external docs description change paints the row yellow and highlights the link (Q16, option A)', () => {
    const operation = root(build('operation/13-external-docs-description-changed'))
    const rowDiff = OpenApiRowDiffs.Operation.takeExternalDocsRowDiff(operation)
    expect(rowDiff?.styles.after.backgroundColor).toBe('yellow')
    expect(rowDiff?.styles.after.textHighlighterColor).toBe('yellow')
    expect(rowDiff?.styles.before.textHighlighterColor).toBe('yellow')
    expect(operation.diffsSeverities?.[NodeDiffsSeverityPlacemennt.ExternalDocsRow]).toBeDefined()
  })
})

describe('OpenAPI with diffs: parameters', () => {
  it('a group whose parameters were all removed is wholly removed; a mixed group is not', () => {
    const removed = child(child(root(build('request-headers/20-all-removed')), OpenApiTreeNodeKinds.REQUEST), OpenApiTreeNodeKinds.PARAMETERS, 'header')
    expect(wholeAction(removed)).toBe(DiffAction.remove)
    const mixed = child(child(root(build('request-headers/03-entry-renamed')), OpenApiTreeNodeKinds.REQUEST), OpenApiTreeNodeKinds.PARAMETERS, 'header')
    expect(wholeAction(mixed)).toBeUndefined()
  })

  it('required change is a required-array item diff', () => {
    const schema = parametersSchema(build('query-parameters/04-required-added'), 'query')
    expect(Array.isArray(schema.required) ? [...schema.required] : undefined).toEqual(['dryRun'])
    expect(recordOf(schema.required)['0']).toMatchObject({ action: DiffAction.add, afterValue: 'dryRun' })
  })

  it.each([
    ['query-parameters/21-description-moved-entry-to-schema', undefined],
    ['query-parameters/23-description-entry-removed-schema-added', DiffAction.replace],
    ['query-parameters/24-description-schema-removed-entry-added', DiffAction.replace],
    ['query-parameters/25-description-both-places-changed', DiffAction.replace],
    ['query-parameters/26-description-schema-changed-under-entry', undefined],
  ])('description precedence: %s', (caseId, expected) => {
    const property = queryProperty(build(caseId), 'dryRun')
    expect(recordOf(property).description?.action).toBe(expected)
  })

  it('both-places change shows the entry text only', () => {
    const property = queryProperty(build('query-parameters/25-description-both-places-changed'), 'dryRun')
    expect(property.description).toBe('Entry text v2.')
    expect(recordOf(property).description).toMatchObject({ beforeValue: 'Entry text v1.', afterValue: 'Entry text v2.' })
  })

  it('schema -> content switch with the same schema adds only the media type annotation', () => {
    const property = queryProperty(build('query-parameters/11-schema-to-content'), 'dryRun')
    const record = recordOf(property)
    expect(record.type).toBeUndefined()
    expect(record.description).toBeUndefined()
    expect(recordOf(property.customAnnotations).mediaType?.action).toBe(DiffAction.add)
  })

  it('content -> schema switch with the same schema removes only the media type annotation', () => {
    const property = queryProperty(build('query-parameters/12-content-to-schema'), 'dryRun')
    const record = recordOf(property)
    expect(record.type).toBeUndefined()
    expect(record.description).toBeUndefined()
    expect(recordOf(property.customAnnotations).mediaType?.action).toBe(DiffAction.remove)
  })

  it('content media type change with the same schema changes only the media type annotation', () => {
    const property = queryProperty(build('query-parameters/13-content-media-type-renamed'), 'dryRun')
    const record = recordOf(property)
    expect(record.type).toBeUndefined()
    expect(record.description).toBeUndefined()
    const annotations = property.customAnnotations
    const mediaType = isObject(annotations) ? annotations.mediaType : undefined
    expect(recordOf(mediaType).value).toMatchObject({ action: DiffAction.replace, beforeValue: 'application/json', afterValue: 'application/json; charset=utf-8' })
  })

  it('entry extensions move flat into the property with their diffs', () => {
    const changed = queryProperty(build('query-parameters/16-extension-changed'), 'dryRun')
    expect(changed['x-owner']).toBe('billing-team')
    expect(recordOf(changed)['x-owner']?.action).toBe(DiffAction.replace)
    expect(recordOf(changed)['x-internal']?.action).toBe(DiffAction.add)
    const moved = queryProperty(build('query-parameters/17-extension-moved-to-schema'), 'dryRun')
    expect(moved['x-owner']).toBe('orders-team')
    expect(recordOf(moved)['x-owner']).toBeUndefined()
  })
})

describe('OpenAPI with diffs: request body', () => {
  it.each([
    ['request-body/02-body-removed', DiffAction.remove],
    ['request-body/12-only-media-type-removed', DiffAction.remove],
    ['request-body/16-schema-removed', DiffAction.remove],
    ['request-body/15-schema-added', DiffAction.add],
    ['request-body/14-media-type-removed-description-kept', undefined],
    ['request-body/01-body-added', DiffAction.add],
  ])('presence of the Body: %s', (caseId, expected) => {
    expect(wholeAction(requestBody(build(caseId)))).toBe(expected)
  })

  it('the only schema removed also removes its media type option', () => {
    const content = child(requestBody(build('request-body/16-schema-removed')), OpenApiTreeNodeKinds.CONTENT)
    const option = content.nestedNodes()[0]
    expect(wholeAction(option)).toBe(DiffAction.remove)
  })

  it('renamed media type stays one option with a rename diff', () => {
    const content = child(requestBody(build('request-body/10-media-type-renamed')), OpenApiTreeNodeKinds.CONTENT)
    expect(content.nestedNodes().map(option => [option.key, wholeAction(option)])).toEqual([
      ['application/json; charset=utf-8', DiffAction.rename],
    ])
  })

  it.each([
    ['request-body/08-media-type-added', 'application/xml', 'non-breaking'],
    ['request-body/09-media-type-removed', 'application/xml', 'breaking'],
    ['request-body/10-media-type-renamed', 'application/json; charset=utf-8', undefined],
  ])('media type option changed (%s): yellow Body row badged by the option, no change marker on the option', (caseId, mediaType, severity) => {
    const node = requestBody(build(caseId))
    const header = OpenApiRowDiffs.RequestBody.takeHeaderRowDiff(node)
    expect(header?.styles.before.backgroundColor).toBe('yellow')
    expect(header?.styles.after.backgroundColor).toBe('yellow')
    expect(header?.styles.after.textHighlighterColor).toBeUndefined()
    const titleRowSeverity = node.diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow]?.type
    if (severity) {
      expect(titleRowSeverity).toBe(severity)
    } else {
      expect(titleRowSeverity).toBeDefined()
    }
    const option = child(child(node, OpenApiTreeNodeKinds.CONTENT), OpenApiTreeNodeKinds.MEDIA_TYPE, mediaType)
    expect([...OpenApiRowDiffs.MediaType.takeChangesMarkerSummary(option)]).toEqual([])
  })

  it('renamed media type: the option title is highlighted yellow on both sides; other options are not', () => {
    const renamed = child(child(requestBody(build('request-body/10-media-type-renamed')), OpenApiTreeNodeKinds.CONTENT), OpenApiTreeNodeKinds.MEDIA_TYPE)
    expect(OpenApiRowDiffs.MediaType.resolveSideTitleHighlight(renamed, ORIGIN_LAYOUT_SIDE)).toBe('yellow')
    expect(OpenApiRowDiffs.MediaType.resolveSideTitleHighlight(renamed, CHANGED_LAYOUT_SIDE)).toBe('yellow')
    const added = child(child(requestBody(build('request-body/08-media-type-added')), OpenApiTreeNodeKinds.CONTENT), OpenApiTreeNodeKinds.MEDIA_TYPE, 'application/xml')
    expect(OpenApiRowDiffs.MediaType.resolveSideTitleHighlight(added, CHANGED_LAYOUT_SIDE)).toBeUndefined()
  })

  it('a schema change inside a media type keeps the plain Body row and the option marker', () => {
    const node = requestBody(build('request-body/17-schema-property-added'))
    expect(OpenApiRowDiffs.RequestBody.takeHeaderRowDiff(node)).toBeUndefined()
    const option = child(node, OpenApiTreeNodeKinds.CONTENT).nestedNodes()[0]
    expect([...OpenApiRowDiffs.MediaType.takeChangesMarkerSummary(option)]).toEqual(['non-breaking'])
  })

  it.each([
    ['request-body/03-required-added', DiffAction.add],
    ['request-body/04-required-removed', DiffAction.remove],
  ])('required change (%s): yellow Body row that keeps the title on both sides', (caseId, requiredAction) => {
    const node = requestBody(build(caseId))
    const header = OpenApiRowDiffs.RequestBody.takeHeaderRowDiff(node)
    // A value-less replace: an add / remove here would hide the `Body` title on the opposite side.
    expect(header?.data).toMatchObject({ action: DiffAction.replace, beforeValue: undefined, afterValue: undefined })
    expect(header?.styles.before.backgroundColor).toBe('yellow')
    expect(header?.styles.after.backgroundColor).toBe('yellow')
    expect(header?.styles.after.textHighlighterColor).toBeUndefined()
    // The `required` tag keeps its side-exclusive add / remove.
    expect(OpenApiRowDiffs.RequestBody.takeRequiredTagDiff(node)?.data.action).toBe(requiredAction)
  })

  it('required became false', () => {
    expect(requestBody(build('request-body/04-required-removed')).diffs.required?.data.action).toBe(DiffAction.remove)
  })

  it('request body and media type extensions are cloned into the schema root with precedence', () => {
    const option = child(requestBody(build('request-body/24-extensions-changed')), OpenApiTreeNodeKinds.CONTENT).nestedNodes()[0]
    const value = option.value()
    const schema = isObject(value) && isObject(value.schema) ? value.schema : {}
    expect(schema['x-max-size']).toBe('5MB')
    expect(recordOf(schema)['x-max-size']?.action).toBe(DiffAction.replace)
    expect(recordOf(schema)['x-codec']?.action).toBe(DiffAction.add)

    const shadowing = child(requestBody(build('request-body/25-media-type-extension-shadows-schema-root')), OpenApiTreeNodeKinds.CONTENT).nestedNodes()[0]
    const shadowingValue = shadowing.value()
    const shadowingSchema = isObject(shadowingValue) && isObject(shadowingValue.schema) ? shadowingValue.schema : {}
    expect(shadowingSchema['x-codec']).toBe('gzip')
    expect(recordOf(shadowingSchema)['x-codec']).toMatchObject({ action: DiffAction.replace, beforeValue: 'none', afterValue: 'gzip' })
  })
})

describe('OpenAPI with diffs: responses', () => {
  function response(tree: OpenApiTreeWithDiffs, code: string): OpenApiTreeNodeWithDiffs {
    return child(responsesNode(tree), OpenApiTreeNodeKinds.RESPONSE, code)
  }

  it.each([
    ['responses/07-response-4xx-added', '404', []],
    ['responses/03-response-2xx-added', '201', []],
    ['responses/15-code-case-renamed', '4XX', []],
    ['responses/16-code-renamed-and-description-changed', '4XX', ['annotation']],
    ['responses/17-description-changed', '200', ['annotation']],
    ['response-body/17-schema-property-added', '200', ['non-breaking']],
    ['response-body/02-body-removed', '200', ['breaking']],
    ['responses/25-changes-of-different-severity', '200', ['breaking', 'non-breaking', 'annotation']],
  ])('change marker summary of %s %s', (caseId, code, expectedTypes) => {
    const summary = [...response(build(caseId), code).descendantDiffsSummary].sort()
    expect(summary).toEqual([...expectedTypes].sort())
  })

  it('response option add / rename', () => {
    expect(wholeAction(response(build('responses/07-response-4xx-added'), '404'))).toBe(DiffAction.add)
    expect(wholeAction(response(build('responses/15-code-case-renamed'), '4XX'))).toBe(DiffAction.rename)
  })

  it.each([
    ['responses/01-response-1xx-added', '101', 'green'],
    ['responses/04-response-2xx-removed', '201', 'red'],
    ['responses/11-response-range-added', '5XX', 'green'],
    ['responses/12-response-range-removed', '5XX', 'red'],
    ['responses/14-response-default-removed', 'default', 'red'],
  ])('response option wholly changed (%s): yellow Responses row, neutral option with a %s border', (caseId, code, border) => {
    const tree = build(caseId)
    const responses = responsesNode(tree)
    const header = OpenApiRowDiffs.Responses.takeTitleRowDiff(responses)
    expect(header?.styles.before.backgroundColor).toBe('yellow')
    expect(header?.styles.after.backgroundColor).toBe('yellow')
    expect(header?.styles.after.textHighlighterColor).toBeUndefined()
    expect(responses.diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow]).toBeDefined()
    const option = response(tree, code)
    expect(OpenApiRowDiffs.Response.keepsCodeTone(option)).toBe(false)
    const shadow = option.diffs[NODE_LEVEL_DIFF_KEY]?.styles
    expect(border === 'green' ? shadow?.after.borderShadowColor : shadow?.before.borderShadowColor).toBe(border)
  })

  it('renamed response code: yellow Responses row, toned option with a highlighted code', () => {
    const tree = build('responses/15-code-case-renamed')
    expect(OpenApiRowDiffs.Responses.takeTitleRowDiff(responsesNode(tree))?.styles.after.backgroundColor).toBe('yellow')
    const renamed = response(tree, '4XX')
    expect(OpenApiRowDiffs.Response.keepsCodeTone(renamed)).toBe(true)
    expect(OpenApiRowDiffs.Response.resolveSideCodeHighlight(renamed, ORIGIN_LAYOUT_SIDE)).toBe('yellow')
    expect(OpenApiRowDiffs.Response.resolveSideCodeHighlight(renamed, CHANGED_LAYOUT_SIDE)).toBe('yellow')
    expect(OpenApiRowDiffs.Response.resolveSideCodeHighlight(response(tree, '200'), CHANGED_LAYOUT_SIDE)).toBeUndefined()
  })

  it('no option added / removed / renamed: plain Responses row; a wholly added operation keeps its green row', () => {
    expect(OpenApiRowDiffs.Responses.takeTitleRowDiff(responsesNode(build('responses/17-description-changed')))).toBeUndefined()
    const operationAdded = responsesNode(build('operation/23-operation-added'))
    expect(OpenApiRowDiffs.Responses.takeTitleRowDiff(operationAdded)?.styles.after.backgroundColor).toBe('green')
    // Inherited whole changes keep the code tone: the option has no border of its own.
    for (const option of operationAdded.childrenNodes()) {
      expect(OpenApiRowDiffs.Response.keepsCodeTone(option)).toBe(true)
    }
  })

  it.each([
    ['response-body/08-media-type-added', 'application/xml'],
    ['response-body/09-media-type-removed', 'application/xml'],
    ['response-body/10-media-type-renamed', 'application/json; charset=utf-8'],
  ])('response media type option changed (%s): yellow Body row, no change marker on the option', (caseId, mediaType) => {
    const content = child(response(build(caseId), '200'), OpenApiTreeNodeKinds.CONTENT)
    expect(OpenApiRowDiffs.ResponseBody.takeHeaderRowDiff(content)?.styles.before.backgroundColor).toBe('yellow')
    expect(content.diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow]).toBeDefined()
    const option = child(content, OpenApiTreeNodeKinds.MEDIA_TYPE, mediaType)
    expect([...OpenApiRowDiffs.MediaType.takeChangesMarkerSummary(option)]).toEqual([])
  })

  it('response sections presence: Body and Headers wholly removed', () => {
    expect(wholeAction(child(response(build('response-body/02-body-removed'), '200'), OpenApiTreeNodeKinds.CONTENT))).toBe(DiffAction.remove)
    expect(wholeAction(child(response(build('response-body/16-schema-removed'), '200'), OpenApiTreeNodeKinds.CONTENT))).toBe(DiffAction.remove)
    expect(wholeAction(child(response(build('response-headers/20-all-removed'), '200'), OpenApiTreeNodeKinds.RESPONSE_HEADERS))).toBe(DiffAction.remove)
  })

  it('Response and Responses Object extensions', () => {
    const tree = build('responses/24-responses-and-response-extensions-changed')
    const responsesExtensions = child(root(tree), OpenApiTreeNodeKinds.EXTENSIONS, 'responsesExtensions')
    expect(wholeAction(responsesExtensions)).toBe(DiffAction.add)
    const responseExtensions = child(response(tree, '200'), OpenApiTreeNodeKinds.EXTENSIONS)
    const rawValues = responseExtensions.value()
    expect(recordOf(isObject(rawValues) ? rawValues.rawValues : undefined)['x-cache']?.action).toBe(DiffAction.replace)
  })
})

describe('OpenAPI with diffs: security', () => {
  it('alternative added', () => {
    const alternatives = alternativesOf(security(build('security/05-alternative-added')))
    expect(alternatives.map(wholeAction)).toEqual([undefined, DiffAction.add])
  })

  it('scope added becomes a requiredScopes replace with both lists', () => {
    const scheme = alternativesOf(security(build('security/11-required-scope-added')))[0].childrenNodes()[0]
    expect(scheme.diffs.requiredScopes?.data).toMatchObject({
      action: DiffAction.replace,
      beforeValue: ['orders:write'],
      afterValue: ['orders:write', 'orders:read'],
    })
  })

  it('scheme added to an alternative is a wholly added card', () => {
    const alternative = alternativesOf(security(build('security/09-scheme-added-to-alternative')))[0]
    expect(alternative.childrenNodes().map(scheme => [scheme.key, wholeAction(scheme)])).toEqual([
      ['oauth', undefined],
      ['basic', DiffAction.add],
    ])
  })

  it('scheme definition changes reach the flow rows', () => {
    const flow = (caseId: string) => alternativesOf(security(build(caseId)))[0].childrenNodes()[0].childrenNodes()[0]
    expect(flow('security/27-token-url-changed').diffs.tokenUrl?.data.action).toBe(DiffAction.replace)
    expect(flow('security/30-flow-scope-added').diffs.scopes?.data.action).toBe(DiffAction.replace)
  })

  it('switch from the document security to an operation override', () => {
    const node = security(build('security/03-document-security-overridden'))
    expect(alternativesOf(node).map(alternative => [alternative.value(), wholeAction(alternative)])).toEqual([
      [{ schemeNames: ['oauth'] }, DiffAction.add],
      [{ schemeNames: ['api_key'] }, DiffAction.remove],
    ])
  })

  it('security: [] removes the whole section', () => {
    expect(wholeAction(security(build('security/02-security-removed')))).toBe(DiffAction.remove)
  })
})

describe('OpenAPI with diffs: side accessors', () => {
  it('resolves a replaced field per side', () => {
    const flow = alternativesOf(security(build('security/27-token-url-changed')))[0].childrenNodes()[0].childrenNodes()[0]
    expect(OpenApiRowDiffs.NodeLevel.resolveSideField(flow, 'tokenUrl', ORIGIN_LAYOUT_SIDE)).toBe('https://auth.example.com/token')
    expect(OpenApiRowDiffs.NodeLevel.resolveSideField(flow, 'tokenUrl', CHANGED_LAYOUT_SIDE)).toBe('https://auth.example.com/oauth2/token')
  })

  it('hides fields of a wholly added node on the origin side and keeps its type badge undecorated', () => {
    const scheme = child(alternativesOf(security(build('security/09-scheme-added-to-alternative')))[0], OpenApiTreeNodeKinds.SECURITY_SCHEME, 'basic')
    expect(OpenApiRowDiffs.NodeLevel.resolveSideField(scheme, 'type', ORIGIN_LAYOUT_SIDE)).toBeUndefined()
    expect(OpenApiRowDiffs.NodeLevel.resolveSideField(scheme, 'type', CHANGED_LAYOUT_SIDE)).toBe('http')
    expect(SecurityRowDiffs.Scheme.takeTypeTextDiff(scheme)).toBeUndefined()
  })
})

describe('OpenAPI with diffs: security card accessors', () => {
  const scheme = (caseId: string): OpenApiTreeNodeWithDiffs => alternativesOf(security(build(caseId)))[0].childrenNodes()[0]
  const flows = (node: OpenApiTreeNodeWithDiffs): OpenApiTreeNodeWithDiffs[] => node.childrenNodes()

  it('scope added to a flow: added row, absent on the origin side', () => {
    const oauth = scheme('security/30-flow-scope-added')
    const row = SecurityRowDiffs.OAuthFlow.resolveScopeRows(flows(oauth)[0], oauth).find(r => r.name === 'orders:delete')
    expect(row?.origin).toBeUndefined()
    expect(row?.changed).toEqual({ description: 'Delete orders', required: false })
    expect(row?.rowDiff?.data.action).toBe(DiffAction.add)
    expect(row?.requiredDiff).toBeUndefined()
  })

  it('scope description replaced: replace row with a text highlighter', () => {
    const oauth = scheme('security/32-flow-scope-description-changed')
    const row = SecurityRowDiffs.OAuthFlow.resolveScopeRows(flows(oauth)[0], oauth).find(r => r.name === 'orders:read')
    expect(row?.rowDiff?.data.action).toBe(DiffAction.replace)
    expect(row?.rowDiff?.styles.after.textHighlighterColor).toBeDefined()
  })

  it('required scope added: a required diff on a scope present on both sides', () => {
    const oauth = scheme('security/11-required-scope-added')
    const rows = SecurityRowDiffs.OAuthFlow.resolveScopeRows(flows(oauth)[0], oauth)
    const read = rows.find(r => r.name === 'orders:read')
    expect(read?.origin?.required).toBe(false)
    expect(read?.changed?.required).toBe(true)
    expect(read?.requiredDiff?.data.action).toBe(DiffAction.add)
    // synthetic row replace: yellow on both sides, no text highlighter
    expect(read?.rowDiff?.styles.before.backgroundColor).toBe('yellow')
    expect(read?.rowDiff?.styles.after.backgroundColor).toBe('yellow')
    expect(read?.rowDiff?.styles.after.textHighlighterColor).toBeUndefined()
    expect(rows.find(r => r.name === 'orders:write')?.rowDiff).toBeUndefined()
    expect(rows.find(r => r.name === 'orders:write')?.origin?.required).toBe(true)
    expect(SecurityRowDiffs.Scheme.resolveUndeclaredRequiredScopeRows(oauth)).toEqual([])
  })

  it('wholly added flow: its scope rows inherit the whole add', () => {
    const oauth = scheme('security/25-oauth-flow-added')
    const added = flows(oauth).find(flow => flow.key === 'authorizationCode')
    expect(added).toBeDefined()
    const rows = SecurityRowDiffs.OAuthFlow.resolveScopeRows(added!, oauth)
    expect(rows.map(r => [r.name, r.origin, r.rowDiff?.data.action])).toEqual([['orders:read', undefined, DiffAction.add]])
  })

  it('scheme type change: yellow title row that keeps the scheme name, highlighted type text', () => {
    const apiKey = scheme('security/16-scheme-type-changed')
    const title = SecurityRowDiffs.Scheme.takeTitleRowDiff(apiKey)
    expect(title?.styles.before.backgroundColor).toBe('yellow')
    expect(title?.styles.after.textHighlighterColor).toBeUndefined()
    expect(title?.data.action).toBe(DiffAction.replace)
    expect(title && 'beforeValue' in title.data ? title.data.beforeValue : 'absent').toBeUndefined()
    expect(SecurityRowDiffs.Scheme.takeTypeTextDiff(apiKey)?.styles.after.textHighlighterColor).toBe('yellow')
  })

  it.each([
    ['security/17-scheme-definition-added', undefined, 'green'],
    ['security/18-scheme-definition-removed', 'red', undefined],
    ['security/16-scheme-type-changed', 'yellow', 'yellow'],
  ])('type text marker of %s: origin %s, changed %s', (caseId, origin, changed) => {
    const node = scheme(caseId)
    expect(SecurityRowDiffs.Scheme.resolveTypeTextHighlight(node, ORIGIN_LAYOUT_SIDE)).toBe(origin)
    expect(SecurityRowDiffs.Scheme.resolveTypeTextHighlight(node, CHANGED_LAYOUT_SIDE)).toBe(changed)
  })

  it('apiKey location change: per-side label, yellow row, highlighter on the place word only', () => {
    const apiKey = scheme('security/19-api-key-location-changed')
    expect(SecurityRowDiffs.Scheme.resolveParameterNameLabel(apiKey, ORIGIN_LAYOUT_SIDE, OPENAPI_SECURITY_DISPLAY_LABELS)).toEqual({ place: 'Header', suffix: ' parameter name' })
    expect(SecurityRowDiffs.Scheme.resolveParameterNameLabel(apiKey, CHANGED_LAYOUT_SIDE, OPENAPI_SECURITY_DISPLAY_LABELS)).toEqual({ place: 'Query', suffix: ' parameter name' })
    const rowDiff = SecurityRowDiffs.Scheme.takeParameterNameRowDiff(apiKey)
    expect(rowDiff?.styles.after.backgroundColor).toBe('yellow')
    expect(rowDiff?.styles.after.textHighlighterColor).toBeUndefined()
    const locationDiff = SecurityRowDiffs.Scheme.takeParameterLocationTextDiff(apiKey)
    expect(locationDiff?.styles.before.textHighlighterColor).toBe('yellow')
    expect(locationDiff?.styles.after.textHighlighterColor).toBe('yellow')
    // `in` removed with the type change: no highlighter on the place word (replace only).
    const removedLocation = SecurityRowDiffs.Scheme.takeParameterLocationTextDiff(scheme('security/16-scheme-type-changed'))
    expect(removedLocation?.styles.before.textHighlighterColor).toBeUndefined()
  })

  it('alternative added: yellow toolbar row with the severity of the option; the option gets a green border', () => {
    const alternatives = child(security(build('security/05-alternative-added')), OpenApiTreeNodeKinds.SECURITY_ALTERNATIVES)
    const toolbar = SecurityRowDiffs.Alternatives.takeToolbarRowDiff(alternatives)
    expect(toolbar?.styles.before.backgroundColor).toBe('yellow')
    expect(alternatives.diffsSeverities?.[NodeDiffsSeverityPlacemennt.SelectorRow]?.type).toBe('non-breaking')
    expect(alternatives.nestedNodes()[1].diffs[NODE_LEVEL_DIFF_KEY]?.styles.after.borderShadowColor).toBe('green')
    expect(SecurityRowDiffs.Alternatives.takeToolbarRowDiff(child(security(build('security/11-required-scope-added')), OpenApiTreeNodeKinds.SECURITY_ALTERNATIVES))).toBeUndefined()
  })
})
