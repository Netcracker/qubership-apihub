import JSZip from 'jszip'
import { BUILD_TYPE, PACKAGE, VERSION_STATUS } from '../src'
import { ANY_REST_SPEC, contentEditor, Editor } from './helpers'

const buildOneRestDocument = async (packageId: string): Promise<{ editor: Editor; operationIds: string[] }> => {
  const editor = contentEditor(
    { packageId, version: 'v1', status: VERSION_STATUS.RELEASE, buildType: BUILD_TYPE.BUILD },
    { 'rest.json': ANY_REST_SPEC },
  )
  const result = await editor.run()
  const operationIds = [...result.operations.values()].map(({ operationId }) => operationId)
  // one operation is what `ANY_REST_SPEC` promises; without it the comparison below would hold on two empty lists
  expect(operationIds).toHaveLength(1)
  return { editor, operationIds }
}

const expectPackageOf = async (archive: Buffer, operationIds: string[]): Promise<void> => {
  const zip = await JSZip.loadAsync(archive)

  // compared as data: how the archive formats the document is not what either writer is responsible for
  const document = await zip.file(`${PACKAGE.DOCUMENTS_DIR_NAME}/rest.json`)!.async('string')
  expect(JSON.parse(document)).toEqual(JSON.parse(ANY_REST_SPEC))

  const { operations } = JSON.parse(await zip.file(PACKAGE.OPERATIONS_FILE_NAME)!.async('string'))
  expect(operations.map(({ operationId }: { operationId: string }) => operationId)).toEqual(operationIds)

  const { documents } = JSON.parse(await zip.file(PACKAGE.DOCUMENTS_FILE_NAME)!.async('string'))
  expect(documents.map(({ fileId }: { fileId: string }) => fileId)).toEqual(['rest.json'])
}

// the two archive writers, JSZip for the browser and AdmZip for node, each read back with JSZip
describe('Version package', () => {
  test('should pack one REST document with JSZip', async () => {
    const { editor, operationIds } = await buildOneRestDocument('package/js-zip')

    await expectPackageOf(await editor.createVersionPackage(), operationIds)
  })

  test('should pack one REST document with AdmZip', async () => {
    const { editor, operationIds } = await buildOneRestDocument('package/adm-zip')

    const { packageVersion } = await editor.createNodeVersionPackage()
    await expectPackageOf(packageVersion, operationIds)
  })
})
