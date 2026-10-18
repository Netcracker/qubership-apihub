import { BUILD_TYPE, FILE_FORMAT_HTML, FILE_FORMAT_JSON, FILE_FORMAT_YAML } from '../src'
import { Editor, exportDocumentMatcher, exportDocumentsMatcher, LocalRegistry } from './helpers'

describe('Export AsyncAPI version test', () => {
  const ASYNCAPI_EXPORT_PACKAGE = 'asyncapi-export'
  const SINGLE_ASYNC_YAML_VERSION = 'single-async-yaml-version@1'
  const SINGLE_ASYNC_JSON_VERSION = 'single-async-json-version@1'
  const DUAL_ASYNC_VERSION = 'dual-async-version@1'
  let asyncEditor: Editor

  const getExportedAsyncapiVersion = async (document: { data: Blob }): Promise<string | undefined> => {
    return (JSON.parse(await document.data.text()) as { asyncapi?: string }).asyncapi
  }

  beforeAll(async () => {
    const asyncPkg = LocalRegistry.openPackage(ASYNCAPI_EXPORT_PACKAGE)
    await asyncPkg.publish(asyncPkg.packageId, {
      version: SINGLE_ASYNC_YAML_VERSION,
      files: [{ fileId: 'valid-async-yaml.yaml' }],
    })
    await asyncPkg.publish(asyncPkg.packageId, {
      version: SINGLE_ASYNC_JSON_VERSION,
      files: [{ fileId: 'valid-async-json.json' }],
    })
    await asyncPkg.publish(asyncPkg.packageId, {
      version: DUAL_ASYNC_VERSION,
      files: [
        { fileId: 'valid-async-yaml.yaml' },
        { fileId: 'valid-async-json.json' },
      ],
    })
    asyncEditor = await Editor.openProject(asyncPkg.packageId, asyncPkg)
  })

  const versionExportFormats = [FILE_FORMAT_JSON, FILE_FORMAT_YAML, FILE_FORMAT_HTML] as const
  type VersionExportFormat = typeof versionExportFormats[number]

  test.each(versionExportFormats)(
    'should keep AsyncAPI JSON output for single YAML source regardless of requested export version format %p',
    async (format: VersionExportFormat) => {
      const result = await asyncEditor.run({
        version: SINGLE_ASYNC_YAML_VERSION,
        buildType: BUILD_TYPE.EXPORT_VERSION,
        format,
      })
      expect(result.exportFileName).toEqual('asyncapi-export_single-async-yaml-version_valid-async-yaml.json')
      expect(result).toEqual(exportDocumentsMatcher([
        exportDocumentMatcher('valid-async-yaml.json'),
      ]))
      expect(await getExportedAsyncapiVersion(result.exportDocuments[0])).toEqual('3.0.0')
    },
  )

  test.each(versionExportFormats)(
    'should keep AsyncAPI JSON output for single JSON source regardless of requested export version format %p',
    async (format: VersionExportFormat) => {
      const result = await asyncEditor.run({
        version: SINGLE_ASYNC_JSON_VERSION,
        buildType: BUILD_TYPE.EXPORT_VERSION,
        format,
      })
      expect(result.exportFileName).toEqual('asyncapi-export_single-async-json-version_valid-async-json.json')
      expect(result).toEqual(exportDocumentsMatcher([
        exportDocumentMatcher('valid-async-json.json'),
      ]))
      expect(await getExportedAsyncapiVersion(result.exportDocuments[0])).toEqual('3.0.0')
    },
  )

  test('should keep original extensions when exporting two async files', async () => {
    const result = await asyncEditor.run({
      version: DUAL_ASYNC_VERSION,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: FILE_FORMAT_JSON,
    })
    expect(result.exportFileName).toEqual('asyncapi-export_dual-async-version.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('valid-async-yaml.json'),
      exportDocumentMatcher('valid-async-json.json'),
    ]))

    const yamlExport = result.exportDocuments.find((document) => document.filename === 'valid-async-yaml.json')!
    const jsonExport = result.exportDocuments.find((document) => document.filename === 'valid-async-json.json')!
    expect(await getExportedAsyncapiVersion(yamlExport)).toEqual('3.0.0')
    expect(await getExportedAsyncapiVersion(jsonExport)).toEqual('3.0.0')
  })
})
