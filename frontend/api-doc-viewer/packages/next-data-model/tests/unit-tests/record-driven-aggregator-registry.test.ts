import { RecordDrivenAggregatorRegistry } from '../../src/building-service/abstract/tree-with-diffs/node-diffs-data/record-driven-aggregators'
import { OPENAPI_AGGREGATION_TABLES } from '../../src/building-service/openapi/tree-with-diffs/aggregation-tables'
import { SECURITY_AGGREGATION_TABLES, securityFieldDiffKeys } from '../../src/building-service/security/tree-with-diffs/aggregation-tables'
import { NodeDiffsSeverityPlacemennt } from '../../src/model/abstract/tree-with-diffs/tree-node.interface'
import { OPENAPI_RESPONSE_OPTIONS_DIFF_KEY } from '../../src/model/openapi/tree-with-diffs/diff-keys'
import { OpenApiTreeNodeKind, OpenApiTreeNodeKinds } from '../../src/model/openapi/types/node-kind'
import { OpenApiTreeNodeMeta } from '../../src/model/openapi/types/node-meta'
import { OpenApiAnyTreeNodeValue } from '../../src/model/openapi/types/node-value'
import { SECURITY_FIELD_PLACEMENTS, SECURITY_NODE_PLACEMENTS } from '../../src/model/security/tree-with-diffs/placements'
import { SecurityTreeNodeKinds } from '../../src/model/security/types/node-kind'

// Design: docs/design/openapi/architecture/data-model-with-diffs.md (one record-driven family per API type).
describe('RecordDrivenAggregatorRegistry and the aggregation tables', () => {
  const registry = () => new RecordDrivenAggregatorRegistry<OpenApiAnyTreeNodeValue | null, OpenApiTreeNodeKind, OpenApiTreeNodeMeta, OpenApiTreeNodeKind>(OPENAPI_AGGREGATION_TABLES)

  it('builds one aggregator per kind and family and reuses it', () => {
    const aggregators = registry()
    expect(aggregators.nodeDiffs(OpenApiTreeNodeKinds.RESPONSE)).toBe(aggregators.nodeDiffs(OpenApiTreeNodeKinds.RESPONSE))
    expect(aggregators.nodeDiffs(OpenApiTreeNodeKinds.RESPONSE)).not.toBe(aggregators.nodeDiffs(OpenApiTreeNodeKinds.OPERATION))
    expect(aggregators.severities(OpenApiTreeNodeKinds.RESPONSES)).toBe(aggregators.severities(OpenApiTreeNodeKinds.RESPONSES))
    expect(aggregators.diffsSummary()).toBe(aggregators.diffsSummary())
  })

  it('OpenAPI field keys are the value props plus the synthetic row keys', () => {
    expect(OPENAPI_AGGREGATION_TABLES.fieldDiffKeys(OpenApiTreeNodeKinds.RESPONSES)).toEqual([OPENAPI_RESPONSE_OPTIONS_DIFF_KEY])
    expect(OPENAPI_AGGREGATION_TABLES.fieldDiffKeys(OpenApiTreeNodeKinds.RESPONSE)).toEqual(['code', 'codeClass', 'description'])
  })

  it('OpenAPI uses the shared Security tables unchanged (the AsyncAPI registry reads the same ones)', () => {
    for (const kind of Object.values(SecurityTreeNodeKinds)) {
      expect(OPENAPI_AGGREGATION_TABLES.fieldDiffKeys(kind)).toEqual(securityFieldDiffKeys(kind))
      expect(OPENAPI_AGGREGATION_TABLES.fieldPlacements[kind]).toBe(SECURITY_FIELD_PLACEMENTS[kind])
      expect(OPENAPI_AGGREGATION_TABLES.nodePlacements[kind]).toBe(SECURITY_NODE_PLACEMENTS[kind])
    }
    expect(SECURITY_AGGREGATION_TABLES.fieldPlacements).toBe(SECURITY_FIELD_PLACEMENTS)
    expect(SECURITY_AGGREGATION_TABLES.nodePlacements).toBe(SECURITY_NODE_PLACEMENTS)
    expect(SECURITY_FIELD_PLACEMENTS[SecurityTreeNodeKinds.SECURITY_ALTERNATIVES]).toBeDefined()
    expect(OPENAPI_AGGREGATION_TABLES.nodePlacements[OpenApiTreeNodeKinds.RESPONSE]).toEqual([NodeDiffsSeverityPlacemennt.DescriptionRow])
  })
})
