import { loadYaml, RefErrorTypes } from '@netcracker/qubership-apihub-api-unifier'
import { afterEach, jest } from '@jest/globals'
import { restApiBuilder } from '../src/apitypes'
import { REST_DOCUMENT_TYPE } from '../src/apitypes/rest/rest.consts'
import { FILE_FORMAT_YAML, FILE_KIND } from '../src'
import {
  documentOf,
  LocalRegistry,
  notificationMatcher,
  notificationOf,
  notificationsMatcher,
  operationOf,
  publishVersion,
} from './helpers'
import {
  MESSAGE_CATEGORY,
  MESSAGE_SEVERITY,
  VALIDATION_RULES_SEVERITY_LEVEL_ERROR,
  VALIDATION_RULES_SEVERITY_LEVEL_WARNING,
  ValidationRulesSeverityLevel,
  VERSION_STATUS,
} from '../src'
import { createBundlingErrorHandler } from '../src/utils/document'
import { BuildConfigFile, BuilderContext, BuildResult } from '../src/types'
import { NotificationMessage } from '../src/types/package/notifications'
import { RestOperationData } from '../src/apitypes/rest/rest.types'
import { OpenAPIV3 } from 'openapi-types'

// What each reference error does to a publication — its severity, the document it names, whether a release
// still goes out — is one row per `errorType` in `notification-catalogue.test.ts`. What is left here is what
// the bundler does with the document: which dependencies it keeps, and which operations survive.

describe('Reference bundling test', () => {
  test('should bundle external references', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case1')
    const result = await pkg.publish(pkg.packageId)

    expect(documentOf(result, 'openapi.yaml').dependencies).toEqual(['reference.yaml'])
  })

  test('should collect missing external reference notifications if severity level is not configured', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case2')
    const result = await pkg.publish(pkg.packageId)

    // no `brokenRefs` in the config means the lenient default, so these do not block the release
    expect(result).toEqual(notificationsMatcher([
      notificationMatcher(MESSAGE_SEVERITY.Warning,'can\'t be resolved'),
      notificationMatcher(MESSAGE_SEVERITY.Warning,'does not exist'),
    ]))
    expect(result.operations.size).toBe(1)
    expect(documentOf(result, 'openapi.yaml').dependencies.length).toBe(0)

    // reference problems are attributed to the document slug and each carries its own category
    expect(result.notifications.every(({ documentId }) => documentId === 'openapi')).toBe(true)
    expect(result.notifications.every(({ category }) => category?.startsWith('ref-'))).toBe(true)
  })

  test('should bundle transitive external references', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case3')
    const result = await pkg.publish(pkg.packageId)

    expect(documentOf(result, 'openapi.yaml').dependencies).toEqual([
      'reference.yaml',
      'transitive-reference.yaml',
    ])
  })

  test('should collect notifications when transitive external reference is missing if severity level is not configured', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case4')
    const result = await pkg.publish(pkg.packageId)

    expect(result).toEqual(notificationsMatcher([
      notificationMatcher(MESSAGE_SEVERITY.Warning,'can\'t be resolved'),
      notificationMatcher(MESSAGE_SEVERITY.Warning,'does not exist'),
    ]))
    expect(result.operations.size).toBe(1)
    expect(documentOf(result, 'openapi.yaml').dependencies).toEqual(['reference.yaml'])
  })

  // this one throws from `buildRestOperations`, so it is the per-document loop that catches it
  test('should collect missing internal reference notification if severity level is not configured', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case5')
    const result = await pkg.publish(pkg.packageId)

    expect(result).toEqual(notificationsMatcher([notificationMatcher(MESSAGE_SEVERITY.Warning,'can\'t be resolved')]))
    expect(result.operations.size).toBe(1)
  })

  test('should collect notifications on publishing specification with incorrect description override', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/description-override')
    const result = await pkg.publish(pkg.packageId, {
      validationRulesSeverity: {
        brokenRefs: VALIDATION_RULES_SEVERITY_LEVEL_ERROR,
      },
    })

    expect(result).toEqual(notificationsMatcher([
      notificationMatcher(MESSAGE_SEVERITY.Warning,'can\'t have siblings in this specification version'),
    ]))
    expect(result.operations.size).toBe(1)
  })
})

// Reference severity is not one constant: two of the four kinds resolve anyway and stay Warning, and the two
// that leave the document incomplete follow `validationRulesSeverity.brokenRefs`. That is how the host says
// why the build is running — an ordinary publication must not ship a broken reference in a release, while a
// migration rebuild of an already-published version must still succeed.
// See https://github.com/Netcracker/qubership-apihub/issues/113.
describe('Reference severity comes from the error type and the caller', () => {
  const report = (brokenRefs: ValidationRulesSeverityLevel): NotificationMessage[] => {
    const notifications: NotificationMessage[] = []
    const ctx = { notifications, config: { validationRulesSeverity: { brokenRefs } } } as unknown as BuilderContext

    createBundlingErrorHandler(ctx, 'petstore')([
      { errorType: RefErrorTypes.RICH_REF_NOT_ALLOWED, message: 'siblings' },
      { errorType: RefErrorTypes.REF_NOT_ALLOWED, message: 'not allowed here' },
      { errorType: RefErrorTypes.REF_NOT_FOUND, message: 'cannot be resolved' },
      { errorType: RefErrorTypes.REF_NOT_VALID_FORMAT, message: 'cannot be parsed' },
    ])
    return notifications
  }

  test('should report the two incomplete-document kinds as Errors for an ordinary publication', () => {
    expect(report(VALIDATION_RULES_SEVERITY_LEVEL_ERROR).map(({ category, severity }) => [category, severity]))
      .toEqual([
        [MESSAGE_CATEGORY.RefHasSiblings, MESSAGE_SEVERITY.Warning],
        [MESSAGE_CATEGORY.RefNotAllowed, MESSAGE_SEVERITY.Warning],
        [MESSAGE_CATEGORY.RefNotFound, MESSAGE_SEVERITY.Error],
        [MESSAGE_CATEGORY.RefNotValidFormat, MESSAGE_SEVERITY.Error],
      ])
  })

  test('should report all four as Warnings for a migration rebuild, keeping the version rebuildable', () => {
    const notifications = report(VALIDATION_RULES_SEVERITY_LEVEL_WARNING)
    expect(notifications.every(({ severity }) => severity === MESSAGE_SEVERITY.Warning)).toBe(true)
    // the categories do not change with the caller — only how much they cost
    expect(notifications.map(({ category }) => category)).toEqual([
      MESSAGE_CATEGORY.RefHasSiblings,
      MESSAGE_CATEGORY.RefNotAllowed,
      MESSAGE_CATEGORY.RefNotFound,
      MESSAGE_CATEGORY.RefNotValidFormat,
    ])
  })

  test('should attribute all four to the document that pulled them in, never to the referenced file', () => {
    expect(report(VALIDATION_RULES_SEVERITY_LEVEL_ERROR).every(({ documentId }) => documentId === 'petstore'))
      .toBe(true)
  })
})

// A `$ref` into `#/components` that names no component matches the component pattern with nothing left to
// grep. Reading the name that is not there threw, and the throw cost the document every operation it had.
// Severities travel to the consumer as the numbers `MESSAGE_SEVERITY` defines, and a value outside that set
// makes it reject the whole archive. A parser is free to grade its own diagnostics, so what it reports is
// taken only when the contract knows it.
describe('A parser diagnostic graded outside the contract', () => {
  afterEach(() => { jest.restoreAllMocks() })

  // a single REST document whose parser reports one complaint graded `42`
  test('should fall back to the api type instead of shipping the unknown value', async () => {
    const packageId = 'broken'
    const registry = LocalRegistry.openPackage(packageId)

    jest.spyOn(restApiBuilder, 'parser').mockImplementation(async (fileId, source) => ({
      fileId,
      type: REST_DOCUMENT_TYPE.OAS3,
      format: FILE_FORMAT_YAML,
      kind: FILE_KIND.TEXT,
      source,
      data: loadYaml(await source.text()),
      errors: [{ message: 'graded by a scale of its own', severity: 42 }],
    } as never))

    const result = await registry.publish(packageId, {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'openapi.yaml' }],
    })

    // the parser's own 42 is dropped and the REST fallback stands in
    expect(result).toEqual(notificationsMatcher([
      notificationMatcher(MESSAGE_SEVERITY.Warning, /scale of its own/),
    ]))
  }, 30000)
})

describe('A $ref that names no component', () => {
  const SPEC = `openapi: 3.0.1
info: { title: t, version: 1.0.0 }
paths:
  /pets:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema: { $ref: '#/components/schemas' }
components:
  schemas:
    Pet: { type: object }
`

  test('should keep the operations of the document that carries it', async () => {
    const registry = LocalRegistry.openPackage('reference-bundling/case2')
    const result = await registry.publishFromContent({ 'api.yaml': SPEC }, {
      packageId: 'reference-bundling/two-segment-component-ref',
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'api.yaml' }],
    } as never)

    expect([...result.operations.values()].map(({ operationId }) => operationId)).toEqual(['pets-get'])
    expect(result.notifications).toEqual([])
  })
})

// The reason the emission lives in the document build: `parseFile` caches by fileId and would report a shared
// file once, attributing it to whichever document happened to parse it first.
describe('A broken file behind a $ref', () => {
  test('should report a broken $ref-ed file to every document that pulled it in, naming the file', async () => {
    const packageId = 'reference-bundling/shared-broken-reference'
    // both roots pull in the same broken file, which is the whole point of the fixture
    const result = await publishVersion(packageId, 'v1', ['spec1.yaml', 'spec2.yaml'])

    const referenced = result.notifications.filter(({ message }) => message.includes('referenced from this document'))
    // one notification per parse error per root, so both documents are flagged and neither is left out
    expect([...new Set(referenced.map(({ documentId }) => documentId))].sort()).toEqual(['spec1', 'spec2'])
    expect(referenced.filter(({ documentId }) => documentId === 'spec1').length)
      .toBe(referenced.filter(({ documentId }) => documentId === 'spec2').length)
    for (const notification of referenced) {
      // the offending path belongs in the text — never in documentId, which names the document that bundles it
      expect(notification.message).toContain('shared.yaml')
      expect(notification.category).toBe(MESSAGE_CATEGORY.InvalidTextFile)
    }
  })

  // A configured file that will not be published is, to the version, a `$ref` target like any other: the
  // documents that bundle it report its problems and name it in the text. Reporting them again under its own
  // slug would point at a document `documents.json` does not contain.
  test('should keep an unpublished $ref target out of the attributions', async () => {
    const packageId = 'reference-bundling/shared-broken-reference'
    const publish = (files: BuildConfigFile[]): Promise<BuildResult> =>
      new LocalRegistry(packageId).publish(packageId, {
        packageId,
        version: 'v1',
        status: VERSION_STATUS.DRAFT,
        files,
      })

    const unpublished = await publish([{ fileId: 'spec1.yaml' }, { fileId: 'shared.yaml', publish: false }])
    expect([...new Set(unpublished.notifications.map(({ documentId }) => documentId))]).toEqual(['spec1'])
    expect(unpublished.notifications.every(({ message }) => message.includes('\'shared.yaml\' referenced'))).toBe(true)

    // published, it is a document of the version and reports its own file as well — one form each
    const published = await publish([{ fileId: 'spec1.yaml' }, { fileId: 'shared.yaml' }])
    expect([...new Set(published.notifications.map(({ documentId }) => documentId))].sort()).toEqual(['shared', 'spec1'])
    expect(published.notifications.filter(({ documentId }) => documentId === 'shared')
      .every(({ message }) => !message.includes('referenced from'))).toBe(true)
  }, 30000)

  // A parser that throws leaves a binary fallback carrying the reason. The bundler can only say that the
  // `$ref` did not resolve, and it says so at the severity broken references carry — a Warning for a
  // migration. Without the parse error beside it the document is not flagged and nothing names the defect.
  test('should report the parse failure of a $ref-ed file its parser could not read', async () => {
    const packageId = 'reference-bundling/unparsable-reference'
    // draft: the parse failure is an Error, and a release carrying one does not publish
    const result = await publishVersion(packageId, 'v1', 'root.yaml', { status: VERSION_STATUS.DRAFT })

    const parseFailure = notificationOf(result.notifications, MESSAGE_CATEGORY.ParseFile)
    expect(parseFailure.severity).toBe(MESSAGE_SEVERITY.Error)
    expect(parseFailure.documentId).toBe('root')
    expect(parseFailure.message).toContain('\'broken.yaml\' referenced from this document')
    // the parser's own words: what to fix is in the file, not in the $ref
    expect(parseFailure.message).toContain('Nested mappings are not allowed')
  })
})

// the referenced files are published from memory and left out of `files`, as a referenced file usually is
describe('External references by shape', () => {
  const TAG = `type: object
properties:
  id:
    type: integer
  name:
    type: string
`
  const TAG_CATEGORY = `Tag:
  type: object
  properties:
    name:
      type: string
Category:
  type: object
  properties:
    category:
      type: string
`

  const publishMain = (packageId: string, main: string, referenced: Record<string, string>): Promise<BuildResult> =>
    new LocalRegistry(packageId).publishFromContent(
      { 'main.yaml': main, ...referenced },
      { packageId, version: 'v1', files: [{ fileId: 'main.yaml' }] },
    )

  // the path is joined inside the bundler library, so every `src` change that fails this case also fails the
  // sibling-file cases above; what it guards on its own is an upgrade of that library
  test('should bundle an OpenAPI reference into a subfolder', async () => {
    const main = `openapi: 3.0.0
info:
  title: Subfolder
  version: '1.0'
paths:
  /tag:
    get:
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: 'schemas/Tag.yaml'
`
    const result = await publishMain('reference-bundling/subfolder', main, { 'schemas/Tag.yaml': TAG })

    expect(documentOf(result, 'main.yaml').dependencies).toEqual(['schemas/Tag.yaml'])
    expect(result.notifications).toEqual([])
    // the bundler moves the target into the components under a name taken from the file
    const data = operationOf(result, 'tag-get').data as RestOperationData
    expect(data.components?.schemas?.Tag).toEqual(loadYaml(TAG))
  })

  // bundling runs before the conversion to OpenAPI 3.0, so each shape is resolved in Swagger 2.0 terms first;
  // after the conversion the target sits in the operation's response schema
  describe('in a Swagger 2.0 document', () => {
    const swagger = (ref: string): string => `swagger: '2.0'
info:
  title: Refs
  version: '1.0'
paths:
  /tag:
    get:
      produces:
        - application/json
      responses:
        '200':
          description: OK
          schema:
            $ref: '${ref}'
`

    const responseSchemaOf = (result: BuildResult): unknown => {
      const data = operationOf(result, 'tag-get').data as RestOperationData
      const response = data.paths['/tag']?.get?.responses?.['200'] as OpenAPIV3.ResponseObject
      return response.content?.['application/json']?.schema
    }

    test('should bundle a reference to a whole file', async () => {
      const result = await publishMain(
        'reference-bundling/swagger-whole-file',
        swagger('Tag.yaml'),
        { 'Tag.yaml': TAG },
      )

      expect(documentOf(result, 'main.yaml').dependencies).toEqual(['Tag.yaml'])
      expect(result.notifications).toEqual([])
      expect(responseSchemaOf(result)).toEqual(loadYaml(TAG))
    })

    test('should bundle a reference to a fragment of a file', async () => {
      const result = await publishMain(
        'reference-bundling/swagger-fragment',
        swagger('TagCategory.yaml#/Category'),
        { 'TagCategory.yaml': TAG_CATEGORY },
      )

      expect(documentOf(result, 'main.yaml').dependencies).toEqual(['TagCategory.yaml'])
      expect(result.notifications).toEqual([])
      // a lost target is reported as unresolved and fails the line above first; this one pins which fragment the
      // bundler library took
      expect(responseSchemaOf(result)).toEqual((loadYaml(TAG_CATEGORY) as Record<string, unknown>).Category)
    })

    test('should bundle a reference through an intermediate file', async () => {
      const result = await publishMain(
        'reference-bundling/swagger-intermediate',
        swagger('Intermediate.yaml'),
        { 'Intermediate.yaml': '$ref: \'Tag.yaml\'\n', 'Tag.yaml': TAG },
      )

      expect(documentOf(result, 'main.yaml').dependencies).toEqual(['Intermediate.yaml', 'Tag.yaml'])
      expect(result.notifications).toEqual([])
      expect(responseSchemaOf(result)).toEqual(loadYaml(TAG))
    })
  })
})
