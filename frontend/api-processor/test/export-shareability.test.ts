import {
  BUILD_TYPE,
  FILE_FORMAT_HTML,
  FILE_FORMAT_JSON,
  FILE_FORMAT_YAML,
  SHAREABILITY_STATUS_NON_SHAREABLE,
  SHAREABILITY_STATUS_SHAREABLE,
  SHAREABILITY_STATUS_UNKNOWN,
  SHAREABILITY_STATUSES,
} from '../src'
import { Editor, LocalRegistry } from './helpers'

describe('Export shareability filtering', () => {
  let shareabilityPkg: LocalRegistry
  let shareabilityEditor: Editor
  const SHAREABILITY_PACKAGE_ID = 'shareability'
  const SHAREABILITY_VERSION = 'shareability-version@1'

  beforeAll(async () => {
    shareabilityPkg = LocalRegistry.openPackage(SHAREABILITY_PACKAGE_ID)
    await shareabilityPkg.publish(shareabilityPkg.packageId, { version: SHAREABILITY_VERSION })

    shareabilityPkg.setDocumentShareability('1', SHAREABILITY_STATUS_SHAREABLE)
    shareabilityPkg.setDocumentShareability('2', SHAREABILITY_STATUS_NON_SHAREABLE)
    shareabilityPkg.setDocumentShareability('3', SHAREABILITY_STATUS_UNKNOWN)

    shareabilityEditor = await Editor.openProject(shareabilityPkg.packageId, shareabilityPkg)
  })

  test('should export all documents when allowedShareabilityStatuses includes all statuses', async () => {
    const result = await shareabilityEditor.run({
      packageId: shareabilityPkg.packageId,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      version: SHAREABILITY_VERSION,
      format: FILE_FORMAT_YAML,
      allowedShareabilityStatuses: SHAREABILITY_STATUSES,
    })
    const exportedFilenames = result.exportDocuments.map(d => d.filename)
    expect(exportedFilenames).toContain('1.yaml')
    expect(exportedFilenames).toContain('2.yaml')
    expect(exportedFilenames).toContain('3.yaml')
  })

  test('should export all documents when allowedShareabilityStatuses is not provided', async () => {
    const result = await shareabilityEditor.run({
      packageId: shareabilityPkg.packageId,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      version: SHAREABILITY_VERSION,
      format: FILE_FORMAT_YAML,
    })
    const exportedFilenames = result.exportDocuments.map(d => d.filename)
    expect(exportedFilenames).toContain('1.yaml')
    expect(exportedFilenames).toContain('2.yaml')
    expect(exportedFilenames).toContain('3.yaml')
  })

  const shareabilityOnlyCases = [
    {
      label: 'non-shareable',
      version: 'shareability-non-shareable@1',
      statuses: [
        ['1', SHAREABILITY_STATUS_SHAREABLE],
        ['2', SHAREABILITY_STATUS_NON_SHAREABLE],
      ] as const,
    },
    {
      label: 'unknown',
      version: 'shareability-unknown@1',
      statuses: [
        ['1', SHAREABILITY_STATUS_SHAREABLE],
        ['2', SHAREABILITY_STATUS_UNKNOWN],
      ] as const,
    },
  ] as const

  test.each(shareabilityOnlyCases)(
    'should export only shareable documents when allowedShareabilityStatuses is [shareable] and second doc is $label',
    async ({ version, statuses }) => {
      const pkg = LocalRegistry.openPackage(SHAREABILITY_PACKAGE_ID)
      await pkg.publish(pkg.packageId, { version })
      statuses.forEach(([slug, status]) => pkg.setDocumentShareability(slug, status))

      const caseEditor = await Editor.openProject(pkg.packageId, pkg)

      const exportFormats = [FILE_FORMAT_YAML, FILE_FORMAT_HTML, FILE_FORMAT_JSON] as const
      for (const format of exportFormats) {
        const result = await caseEditor.run({
          packageId: pkg.packageId,
          buildType: BUILD_TYPE.EXPORT_VERSION,
          version,
          format,
          allowedShareabilityStatuses: [SHAREABILITY_STATUS_SHAREABLE],
        })

        const exportedFilenames = result.exportDocuments.map(d => d.filename)

        expect(exportedFilenames).toContain(`1.${format}`)
        expect(exportedFilenames).not.toContain(`2.${format}`)
      }
    },
  )
})
