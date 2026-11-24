import { describe, expect, test } from '@jest/globals'
import {
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  APIHUB_API_COMPATIBILITY_KIND_NO_BWC,
  ApihubApiCompatibilityKind,
  ASYNCAPI_API_TYPE,
  BuildConfig,
  GRAPHQL_API_TYPE,
  OperationsApiType,
  REST_API_TYPE,
  stringifyYaml,
  VERSION_STATUS,
} from '../src'
import {
  ChangeCounts,
  changelogEditor,
  expectChangeCounts,
  expectSummariesMatchDiffs,
  LocalRegistry,
  NO_CHANGES,
} from './helpers'

const BWC = APIHUB_API_COMPATIBILITY_KIND_BWC
const NO_BWC = APIHUB_API_COMPATIBILITY_KIND_NO_BWC

describe('Duplicate operations with different API kinds', () => {
  test.each([false, true])('reports only the owning document pair with reversed order %s', async (reverse) => {
    const folder = 'multi-document-api-kind'
    const packageId = `${folder}/${reverse ? 'reversed' : 'forward'}`
    // The smallest document slug owns the operation, regardless of file order.
    const names = ['a-no-bwc.yaml', 'b-bwc.yaml']
    if (reverse) names.reverse()
    const registry = LocalRegistry.openPackage(packageId)
    for (const version of ['v1', 'v2']) {
      await registry.publish(`${folder}/${version}`, {
        packageId,
        version,
        files: names.map(name => ({ fileId: name })),
      })
    }

    const result = await changelogEditor(packageId, registry).run()
    expectChangeCounts(result, { changes: { risky: 1 }, impacted: { risky: 1 } })
    expectSummariesMatchDiffs(result)
    const sharedChanges = result.comparisons.flatMap(comparison => comparison.data ?? [])
      .filter(change => change.operationId === 'items-get')
    expect(sharedChanges).toHaveLength(1)
  })

  /**
   * Two documents per version share one operation and disagree on its api kind. Each document also has an
   * operation of its own, so both documents own something and both pairs are compared. The owner of the shared
   * operation is the document with the smaller slug, `a-no-bwc`, so its `no-BWC` kind classifies the change.
   */
  type SharedOperationState = 'original' | 'changed' | 'removed'

  interface ApiTypeCase {
    apiType: OperationsApiType
    extension: string
    sharedOperationId: string
    /** The document `name` with the api kind `apiKind`; `changed` breaks the shared operation, `removed` drops it. */
    document: (name: string, apiKind: ApihubApiCompatibilityKind, shared: SharedOperationState) => string
    /** Labels a file needs to carry its api kind, for a type that takes it from labels. */
    labels?: (apiKind: ApihubApiCompatibilityKind) => string[]
    /** A duplicate AsyncAPI operation id is an `Error` notification, which fails a release build. */
    status?: BuildConfig['status']
  }

  const OK_RESPONSES = { 200: { description: 'OK' } }

  const API_TYPES: ApiTypeCase[] = [
    {
      apiType: REST_API_TYPE,
      extension: 'yaml',
      sharedOperationId: 'items-get',
      document: (name, apiKind, shared) =>
        stringifyYaml({
          openapi: '3.0.3',
          info: { title: name, version: '1.0.0', 'x-api-kind': apiKind },
          paths: {
            ...(shared !== 'removed' && {
              '/items': {
                get: {
                  // removing a query parameter is breaking
                  ...(shared === 'original' && {
                    parameters: [{ name: 'filter', in: 'query', schema: { type: 'string' } }],
                  }),
                  responses: OK_RESPONSES,
                },
              },
            }),
            [`/${name}`]: { get: { responses: OK_RESPONSES } },
          },
        }),
    },
    {
      apiType: GRAPHQL_API_TYPE,
      extension: 'gql',
      sharedOperationId: 'query-items',
      // changing the type of a field is breaking
      document: (name, _apiKind, shared) => {
        const items = shared === 'removed' ? '' : `  items: ${shared === 'changed' ? 'Int' : 'String'}\n`
        return `type Query {\n${items}  ${name.replace(/-/g, '_')}: String\n}`
      },
      labels: apiKind => [`apihub/x-api-kind: ${apiKind}`],
    },
    {
      apiType: ASYNCAPI_API_TYPE,
      extension: 'yaml',
      sharedOperationId: 'send-items-item',
      document: (name, apiKind, shared) =>
        stringifyYaml({
          asyncapi: '3.0.0',
          info: { title: name, version: '1.0.0' },
          channels: {
            items: { address: 'items', messages: { item: { $ref: '#/components/messages/item' } } },
            [name]: { address: name, messages: { own: { $ref: '#/components/messages/own' } } },
          },
          operations: {
            ...(shared !== 'removed' && {
              'send-items': {
                action: 'send',
                channel: { $ref: '#/channels/items' },
                messages: [{ $ref: '#/channels/items/messages/item' }],
                'x-api-kind': apiKind,
              },
            }),
            [`send-${name}`]: {
              action: 'send',
              channel: { $ref: `#/channels/${name}` },
              messages: [{ $ref: `#/channels/${name}/messages/own` }],
            },
          },
          components: {
            messages: {
              // changing the type of a payload property is breaking
              item: {
                payload: { type: 'object', properties: { id: { type: shared === 'changed' ? 'string' : 'number' } } },
              },
              own: { payload: { type: 'object', properties: { id: { type: 'number' } } } },
            },
          },
        }),
      status: VERSION_STATUS.DRAFT,
    },
  ]

  interface Scenario {
    /** The shared operation in v2 of the owner, `a-no-bwc`, and of the copy, `b-bwc`. */
    owner: SharedOperationState
    copy: SharedOperationState
    counts: ChangeCounts
    sharedChanges: number
  }

  const RISKY_ONCE: ChangeCounts = { changes: { risky: 1 }, impacted: { risky: 1 } }

  const SCENARIOS: Record<string, Scenario> = {
    'both documents change it': { owner: 'changed', copy: 'changed', counts: RISKY_ONCE, sharedChanges: 1 },
    'only the owner changes it': { owner: 'changed', copy: 'original', counts: RISKY_ONCE, sharedChanges: 1 },
    // the version publishes the owner's copy, which did not change, so there is nothing to report
    'only the copy changes it': { owner: 'original', copy: 'changed', counts: NO_CHANGES, sharedChanges: 0 },
    // a removed operation has a document only in the previous version, the branch of `belongsToPair` it guards
    'both documents remove it': { owner: 'removed', copy: 'removed', counts: RISKY_ONCE, sharedChanges: 1 },
  }

  const cases = API_TYPES.flatMap(apiTypeCase =>
    Object.keys(SCENARIOS).map(scenario => [apiTypeCase.apiType, scenario, apiTypeCase] as const),
  )

  test.each(cases)(
    '%s: classifies the shared operation by its owner when %s',
    async (apiType, scenario, apiTypeCase) => {
      const { extension, sharedOperationId, document, labels, status } = apiTypeCase
      const { owner, copy, counts, sharedChanges } = SCENARIOS[scenario]
      const packageId = `multi-document-api-kind/${apiType}/${scenario.replace(/ /g, '-')}`
      // `a-no-bwc` sorts first, so it owns the shared operation
      const documents: { name: string; apiKind: ApihubApiCompatibilityKind; v2: SharedOperationState }[] = [
        { name: 'a-no-bwc', apiKind: NO_BWC, v2: owner },
        { name: 'b-bwc', apiKind: BWC, v2: copy },
      ]
      const registry = new LocalRegistry(packageId)
      for (const version of ['v1', 'v2']) {
        await registry.publishFromContent(
          Object.fromEntries(
            documents.map((
              { name, apiKind, v2 },
            ) => [`${name}.${extension}`, document(name, apiKind, version === 'v2' ? v2 : 'original')]),
          ),
          {
            packageId,
            version,
            ...(status && { status }),
            files: documents.map(({ name, apiKind }) => ({
              fileId: `${name}.${extension}`,
              ...(labels && { labels: labels(apiKind) }),
            })),
          },
        )
      }

      const result = await changelogEditor(packageId, registry).run()
      expectChangeCounts(result, counts, apiType)
      const changes = result.comparisons.flatMap(comparison => comparison.data ?? [])
      const sharedOperationChanges = changes.filter(change =>
        (change.operationId ?? change.previousOperationId) === sharedOperationId,
      )
      expect(sharedOperationChanges).toHaveLength(sharedChanges)
      // the helper requires at least one operation change, which the copy-only scenario does not have
      if (sharedChanges > 0) {
        expectSummariesMatchDiffs(result)
      }
    },
  )
})
