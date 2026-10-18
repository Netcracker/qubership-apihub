import { BUILD_TYPE, BuildResult, VERSION_STATUS } from '../src'
import { Editor, expectSummariesMatchDiffs, LocalRegistry, operationChangesOf } from './helpers'

/**
 * The point of the api kind scope element in one document: two operations share a schema, one of them is
 * marked no-BWC, and the property removed from that schema is reported to each of them on its own terms.
 */
const PACKAGE_ID = 'api-kind-splitting'
const FILE_ID = 'shared.json'

const spec = (properties: Record<string, unknown>): string => JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Shared schema', version: '1.0.0' },
  paths: {
    '/marked': {
      post: {
        'x-api-kind': 'no-BWC',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Shared' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/plain': {
      post: {
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Shared' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
  },
  components: { schemas: { Shared: { type: 'object', properties: properties } } },
})

describe('One removal, two operations, two verdicts', () => {
  let result: BuildResult

  beforeAll(async () => {
    const portal = new LocalRegistry(PACKAGE_ID)

    await portal.publishFromContent(
      { [FILE_ID]: spec({ keep: { type: 'string' }, gone: { type: 'string' } }) },
      { packageId: PACKAGE_ID, version: 'v1', files: [{ fileId: FILE_ID, publish: true }] },
    )
    await portal.publishFromContent(
      { [FILE_ID]: spec({ keep: { type: 'string' } }) },
      { packageId: PACKAGE_ID, version: 'v2', files: [{ fileId: FILE_ID, publish: true }] },
    )

    result = await new Editor(PACKAGE_ID, {
      packageId: PACKAGE_ID,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.CHANGELOG,
    }, {}, portal).run()
  })

  it('should report the same removal as risky for the marked operation and breaking for the other', () => {
    const marked = operationChangesOf(result, 'marked-post')
    const plain = operationChangesOf(result, 'plain-post')

    expect(marked.changeSummary.risky).toBe(1)
    expect(marked.changeSummary.breaking).toBe(0)
    expect(plain.changeSummary.breaking).toBe(1)
    expect(plain.changeSummary.risky).toBe(0)
  })

  it('should give every operation a changeSummary matching its own changes', () => {
    // The same shape that produced the reported bug, softened by the api kind rule rather than the
    // deprecation one: one removal, two operations, two verdicts
    expectSummariesMatchDiffs(result)
  })
})
