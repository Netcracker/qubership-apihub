import { BUILD_TYPE, FILE_FORMAT_JSON, FILE_FORMAT_YAML } from '../src'
import { Editor, exportDocumentMatcher, exportDocumentsMatcher, LocalRegistry } from './helpers'

describe('Export non-rest documents version test', () => {
  const NON_REST_MARKDOWN_VERSION = 'single-markdown-version@1'
  const NON_REST_PNG_VERSION = 'single-png-version@1'
  let nonRestEditor: Editor

  beforeAll(async () => {
    const pkg = LocalRegistry.openPackage('export')
    await pkg.publish(pkg.packageId, {
      version: NON_REST_MARKDOWN_VERSION,
      files: [{ fileId: 'README.md' }],
    })
    await pkg.publish(pkg.packageId, {
      version: NON_REST_PNG_VERSION,
      files: [{ fileId: 'Test.png' }],
    })
    nonRestEditor = await Editor.openProject(pkg.packageId, pkg)
  })

  test('should export single markdown file with original extension', async () => {
    const result = await nonRestEditor.run({
      version: NON_REST_MARKDOWN_VERSION,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: FILE_FORMAT_JSON,
    })
    expect(result.exportFileName).toEqual('export_single-markdown-version_README.md')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('README.md'),
    ]))
  })

  test('should export single png file with original extension', async () => {
    const result = await nonRestEditor.run({
      version: NON_REST_PNG_VERSION,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: FILE_FORMAT_YAML,
    })
    expect(result.exportFileName).toEqual('export_single-png-version_Test.png')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('Test.png'),
    ]))
  })
})
