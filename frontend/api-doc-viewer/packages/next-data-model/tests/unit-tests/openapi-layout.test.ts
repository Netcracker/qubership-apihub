import { OpenApiTreeWithDiffsBuilder } from '../../src/building-service/openapi/tree-with-diffs/builder'
import { TreeNodeComplexityTypes } from '../../src/model/abstract/tree/tree-node.interface'
import { DiffType } from '@netcracker/qubership-apihub-api-diff'
import { HighlightVariant, NodeDiffsSeverityPlacemennt } from '../../src/model/abstract/tree-with-diffs/tree-node.interface'
import {
  LayoutBlock,
  LayoutBlockEdge,
  LayoutItem,
  LayoutPlanner,
  LayoutSeparatorRow,
} from '../../src/model/abstract/layout'
import {
  DEFAULT_OPENAPI_SPACING_CONFIG,
  OpenApiBlockEdges,
  OpenApiLayoutLevel,
  OpenApiSpacing,
} from '../../src/model/openapi/layout'
import { OpenApiNodeVisibility } from '../../src/model/openapi/node-visibility'
import { OpenApiTreeNodeWithDiffs } from '../../src/model/openapi/types/aliases'
import { OpenApiTreeNodeKind, OpenApiTreeNodeKinds } from '../../src/model/openapi/types/node-kind'
import { isOpenApiTreeNodeWithDiffs } from '../../src/shared/openapi/guards/tree-node'
import { loadMergedOpenApiSample, OPENAPI_TEST_DIFF_META_KEYS } from '../helpers/openapi-fixtures'

const OPERATION = { path: '/orders', method: 'post' }
const { Yellow, Green, Red, Gray } = HighlightVariant

/**
 * The separator / planner cases are worked out on these numbers (rows and cards own 4px, only the
 * operation level adds 4px), frozen here so that tuning `DEFAULT_OPENAPI_SPACING_CONFIG` breaks only
 * the test pinning the shipped defaults, not the algorithm tests.
 */
const CONFIG = OpenApiSpacing.withOverrides({
  halfGap: { row: 4, card: 4, nested: 0 },
  levelGap: { operation: 4, operationHeader: 0, security: 0, request: 0, responses: 0, section: 0, card: 0 },
  cardInnerInset: 8,
})

function operation(caseId: string): OpenApiTreeNodeWithDiffs {
  const node = new OpenApiTreeWithDiffsBuilder({
    source: loadMergedOpenApiSample(caseId),
    operationKeys: OPERATION,
    diffsMetaKeys: OPENAPI_TEST_DIFF_META_KEYS,
  }).build().root
  if (!node || !isOpenApiTreeNodeWithDiffs(node)) {
    throw new Error('no root')
  }
  return node
}

function child(node: OpenApiTreeNodeWithDiffs, kind: OpenApiTreeNodeKind, key?: string): OpenApiTreeNodeWithDiffs {
  // A complex container's options are its nested nodes (selector options rule).
  const found = (node.type === TreeNodeComplexityTypes.COMPLEX ? node.nestedNodes() : node.childrenNodes()).find(candidate => candidate.kind === kind && (key === undefined || String(candidate.key) === key))
  if (!found) {
    throw new Error(`no ${kind} ${key ?? ''} under ${node.kind}`)
  }
  return found
}

const row = (before?: HighlightVariant, after?: HighlightVariant, badge?: DiffType): LayoutBlockEdge => ({ kind: 'row', tones: { before, after }, badge })
const nested = (before?: HighlightVariant, after?: HighlightVariant): LayoutBlockEdge => ({ kind: 'nested', tones: { before, after } })
const card = (before?: HighlightVariant, after?: HighlightVariant, badge?: DiffType): LayoutBlockEdge => ({ kind: 'card', tones: { before, after }, badge })
const block = (id: string, head: LayoutBlockEdge, tail = head): LayoutBlock<string> => ({ id, head, tail, payload: id })

function between(above: LayoutBlockEdge, below: LayoutBlockEdge, level: OpenApiLayoutLevel): LayoutSeparatorRow | undefined {
  return LayoutPlanner.separator(above, below, level, CONFIG)
}

function ids(items: LayoutItem<string>[]): string[] {
  return items.map(item => item.type === 'block' ? item.block.id : item.id)
}

describe('OpenAPI layout: spacing config', () => {
  it('rows and cards own 8px above and below, nested viewers none; only the operation level adds 8px', () => {
    expect(DEFAULT_OPENAPI_SPACING_CONFIG.halfGap).toEqual({ row: 8, card: 8, nested: 0 })
    expect(DEFAULT_OPENAPI_SPACING_CONFIG.levelGap).toEqual({ operation: 8, operationHeader: 0, security: 0, request: 0, responses: 0, section: 0, card: 0 })
    expect(DEFAULT_OPENAPI_SPACING_CONFIG.cardInnerInset).toBe(8)
    expect(DEFAULT_OPENAPI_SPACING_CONFIG.viewerEdges).toBe(true)
  })

  it('indents a collapsible section\'s content by its expander column and the row gap (16 + 8)', () => {
    expect(DEFAULT_OPENAPI_SPACING_CONFIG.sectionExpander).toEqual({ width: 16, gap: 8 })
    expect(OpenApiSpacing.sectionContentIndent(DEFAULT_OPENAPI_SPACING_CONFIG)).toBe(24)
    expect(OpenApiSpacing.sectionContentIndent(OpenApiSpacing.withOverrides({ sectionExpander: { width: 20, gap: 8 } }))).toBe(28)
  })

  it('splits a level gap into halves for different neighbours, one piece for equal ones', () => {
    const { splitBands, splitBadge } = DEFAULT_OPENAPI_SPACING_CONFIG
    expect(splitBands(undefined, undefined, 4)).toEqual([{ height: 4, tone: undefined }])
    expect(splitBands(Red, Green, 4)).toEqual([{ height: 2, tone: Red }, { height: 2, tone: Green }])
    expect(splitBadge('annotation', undefined, 4)).toEqual([{ height: 2, type: 'annotation' }, { height: 2, type: undefined }])
  })
})

describe('OpenAPI layout: separators', () => {
  it('8px between rows of a block, 12px between top-level blocks (unchanged: one white band)', () => {
    expect(between(row(), row(), 'operationHeader')).toMatchObject({ height: 8, before: [{ height: 8, tone: undefined }], after: [{ height: 8, tone: undefined }] })
    expect(between(row(), row(), 'operation')).toMatchObject({ height: 12, before: [{ height: 12, tone: undefined }] })
  })

  it('a row that changed alone inside a block: its own 4px, the neighbour its 4px (operation ID removed)', () => {
    const separator = between(row(Red, Gray, 'breaking'), row(), 'operationHeader')
    expect(separator?.before).toEqual([{ height: 4, tone: Red }, { height: 4, tone: undefined }])
    expect(separator?.after).toEqual([{ height: 4, tone: Gray }, { height: 4, tone: undefined }])
    expect(separator?.badge).toEqual([{ height: 4, type: 'breaking' }, { height: 4, type: undefined }])
  })

  it('a changed row at a top-level edge continues 2px into the level gap (operation/09: 4 + 2 | 2 + 4)', () => {
    const separator = between(row(Yellow, Yellow, 'annotation'), row(), 'operation')
    expect(separator?.before).toEqual([{ height: 6, tone: Yellow }, { height: 6, tone: undefined }])
    expect(separator?.after).toEqual([{ height: 6, tone: Yellow }, { height: 6, tone: undefined }])
    expect(separator?.badge).toEqual([{ height: 6, type: 'annotation' }, { height: 6, type: undefined }])
  })

  it('after a nested viewer only the level half and the next row\'s half (0 + 2 | 2 + 4)', () => {
    expect(between(nested(), row(Yellow, Yellow), 'operation')?.before).toEqual([{ height: 2, tone: undefined }, { height: 6, tone: Yellow }])
    expect(between(nested(), row(), 'request')).toMatchObject({ height: 4, before: [{ height: 4, tone: undefined }] })
    expect(between(row(), nested(), 'section')).toMatchObject({ height: 4 })
    expect(between(nested(), nested(), 'section')).toBeUndefined()
  })

  it('a removed block above an added one: each side splits by its own tones', () => {
    const separator = between(row(Red, Gray, 'breaking'), row(Gray, Green, 'non-breaking'), 'operation')
    expect(separator?.before).toEqual([{ height: 6, tone: Red }, { height: 6, tone: Gray }])
    expect(separator?.after).toEqual([{ height: 6, tone: Gray }, { height: 6, tone: Green }])
    expect(separator?.badge).toEqual([{ height: 6, type: 'breaking' }, { height: 6, type: 'non-breaking' }])
  })

  it('cards own 4px outside their border: toolbar -> card, card -> added card', () => {
    expect(between(row(), card(), 'security')).toMatchObject({ height: 8 })
    expect(between(card(), card(Gray, Green, 'non-breaking'), 'security')?.after).toEqual([{ height: 4, tone: undefined }, { height: 4, tone: Green }])
  })

  it('equal separators have one stable signature, different separators another', () => {
    const a = between(row(Yellow, Yellow), row(), 'operation')
    const b = between(row(Yellow, Yellow), row(), 'operation')
    expect(a).toEqual(b)
    expect(a?.signature).toBe('6yellow,6-/6yellow,6-/12-')
    expect(between(row(), row(), 'operationHeader')?.signature).not.toBe(a?.signature)
  })
})

describe('OpenAPI layout: planner', () => {
  it('interleaves separators between blocks; outer halves only on request', () => {
    const blocks = [block('a', row()), block('b', row()), block('c', nested())]
    expect(ids(LayoutPlanner.plan(blocks, 'section', CONFIG))).toEqual(['a', 'a|b', 'b', 'b|c', 'c'])
    // A trailing nested viewer owns no half: no trailing separator.
    expect(ids(LayoutPlanner.plan(blocks, 'section', CONFIG, { outerHalves: true }))).toEqual(['^a', 'a', 'a|b', 'b', 'b|c', 'c'])
  })

  it('an outer half is the edge element\'s own 4px, no level gap', () => {
    const [first] = LayoutPlanner.plan([block('title', row(Yellow, Yellow))], 'operation', CONFIG, { outerHalves: true })
    expect(first.type === 'separator' && first.separator.before).toEqual([{ height: 4, tone: Yellow }])
  })

  it('follows a config override (rows 6px each: 12 inside a block)', () => {
    const config = OpenApiSpacing.withOverrides({ halfGap: { row: 6, card: 4, nested: 0 } })
    expect(LayoutPlanner.separator(row(), row(), 'operationHeader', config)?.height).toBe(12)
  })
})

describe('OpenAPI layout: edges on fixtures', () => {
  it('operation/09: the description row is yellow with its badge, the address row is not', () => {
    const node = operation('operation/09-description-changed')
    const { deprecatedTagRow } = OpenApiNodeVisibility.resolveOperation(node.value(), false, 'detailed')
    const description = OpenApiBlockEdges.operationHeaderRow(node, 'description', deprecatedTagRow)
    expect(description.tones).toEqual({ before: Yellow, after: Yellow })
    expect(description.badge).toBe(node.diffsSeverities?.[NodeDiffsSeverityPlacemennt.DescriptionRow]?.type)
    expect(description.badge).toBeDefined()
    expect(OpenApiBlockEdges.operationHeaderRow(node, 'address', deprecatedTagRow)).toEqual(row())
  })

  it('a wholly added parameter group: green title row and green nested viewer, both badged', () => {
    const group = child(child(operation('query-parameters/19-all-added'), OpenApiTreeNodeKinds.REQUEST), OpenApiTreeNodeKinds.PARAMETERS, 'query')
    const badge = group.diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow]?.type
    expect(badge).toBeDefined()
    expect(OpenApiBlockEdges.sectionTitleRow(group)).toEqual(row(Gray, Green, badge))
    expect(OpenApiBlockEdges.nested(group)).toEqual({ ...nested(Gray, Green), badge })
  })

  it('a changed property inside an unchanged group leaves the nested viewer edge white', () => {
    const group = child(child(operation('query-parameters/08-description-changed'), OpenApiTreeNodeKinds.REQUEST), OpenApiTreeNodeKinds.PARAMETERS, 'query')
    expect(OpenApiBlockEdges.nested(group)).toEqual({ kind: 'nested', tones: { before: undefined, after: undefined }, badge: undefined })
  })

  it('an added card: green card edge and frame rows; a type change paints neither', () => {
    const security = (caseId: string): OpenApiTreeNodeWithDiffs => child(operation(caseId), OpenApiTreeNodeKinds.SECURITY)
    const [alternative] = child(security('security/09-scheme-added-to-alternative'), OpenApiTreeNodeKinds.SECURITY_ALTERNATIVES).nestedNodes()
    const added = child(alternative, OpenApiTreeNodeKinds.SECURITY_SCHEME, 'basic')
    const addedBadge = added.diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow]?.type
    expect(addedBadge).toBeDefined()
    expect(OpenApiBlockEdges.card(added)).toEqual(card(Gray, Green, addedBadge))
    expect(LayoutPlanner.frameRow(added, CONFIG)).toEqual({ height: 8, tones: { before: Gray, after: Green }, badge: addedBadge })
    expect(LayoutPlanner.frameRow(added, OpenApiSpacing.withOverrides({ frameRowBadge: false })).badge).toBeUndefined()
    const retyped = security('security/16-scheme-type-changed').childrenNodes()[0].childrenNodes()[0]
    expect(OpenApiBlockEdges.card(retyped)).toEqual(card())
  })

  it('the yellow Body and Responses title rows are row edges with their badges', () => {
    const body = child(child(operation('request-body/03-required-added'), OpenApiTreeNodeKinds.REQUEST), OpenApiTreeNodeKinds.REQUEST_BODY)
    expect(OpenApiBlockEdges.requestBodyTitleRow(body).tones).toEqual({ before: Yellow, after: Yellow })
    expect(OpenApiBlockEdges.requestBodyTitleRow(body).badge).toBeDefined()
    const responses = child(operation('responses/15-code-case-renamed'), OpenApiTreeNodeKinds.RESPONSES)
    expect(OpenApiBlockEdges.responsesTitleRow(responses).tones).toEqual({ before: Yellow, after: Yellow })
  })

  it('a Body ends with its schema, its description, or - collapsed - its title row', () => {
    const body = child(child(operation('request-body/03-required-added'), OpenApiTreeNodeKinds.REQUEST), OpenApiTreeNodeKinds.REQUEST_BODY)
    const mediaType = child(child(body, OpenApiTreeNodeKinds.CONTENT), OpenApiTreeNodeKinds.MEDIA_TYPE)
    const title = OpenApiBlockEdges.requestBodyTitleRow(body)
    const description = OpenApiBlockEdges.descriptionRow(body)
    const elements = OpenApiBlockEdges.bodyElements(title, description, mediaType)
    expect(elements.map(element => element.id)).toEqual(['title', 'description', 'schema'])
    expect(elements[2]).toEqual({ id: 'schema', edge: OpenApiBlockEdges.nested(mediaType), mediaType })
    expect(OpenApiBlockEdges.body(elements).tail.kind).toBe('nested')
    expect(OpenApiBlockEdges.body(OpenApiBlockEdges.bodyElements(title, description, undefined)).tail).toBe(description)
    expect(OpenApiBlockEdges.bodyElements(title, undefined, undefined).map(element => element.id)).toEqual(['title'])
    const collapsed = OpenApiBlockEdges.bodyElements(title, description, mediaType, { expanded: false })
    expect(collapsed.map(element => element.id)).toEqual(['title'])
    expect(OpenApiBlockEdges.body(collapsed)).toEqual({ head: title, tail: title })
  })

  it('a container takes the head of its first child and the tail of its last one', () => {
    const title = row(Yellow, Yellow)
    const viewer = nested(Green)
    expect(OpenApiBlockEdges.container([OpenApiBlockEdges.single(title), OpenApiBlockEdges.single(viewer)])).toEqual({ head: title, tail: viewer })
  })
})
