import JSZip from 'jszip'
import { Editor, LocalRegistry, VERSIONS_PATH, registryFs, documentOf } from './helpers'
import { DOCUMENT_TYPE } from '../src'

const packageId = 'unsupported'
const classificationBugsPackage = LocalRegistry.openPackage(packageId)
let editor: Editor

describe('Unsupported files test', () => {
  beforeAll(async () => {
    await classificationBugsPackage.publish(packageId, {
      packageId: packageId,
      version: 'v1',
      files: [{ fileId: 'Document.docx' }, { fileId: 'Test.png' }],
    })
    editor = await Editor.openProject(packageId)
  })

  test('Publish unsupported files', async () => {
    const result = await editor.run()

    const doc = documentOf(result, 'Document.docx')
    const png = documentOf(result, 'Test.png')

    expect(doc.format).toEqual(DOCUMENT_TYPE.UNKNOWN)
    expect(doc.type).toEqual(DOCUMENT_TYPE.UNKNOWN)
    expect(doc.source instanceof Blob).toBe(true)

    expect(png.format).toEqual(DOCUMENT_TYPE.UNKNOWN)
    expect(png.type).toEqual(DOCUMENT_TYPE.UNKNOWN)
    expect(png.source instanceof Blob).toBe(true)
  })

  // Packing is what these two check, so the archive has to be opened again: writing it out and stopping
  // there passes whatever the packer produced, including nothing.
  const PACKED_DOCUMENTS = ['documents/Document.docx', 'documents/Test.png']

  test('Pack unsupported files using js zip', async () => {
    await editor.run()
    const packageZip = await editor.createVersionPackage()
    await registryFs.writeFile(`${VERSIONS_PATH}/unsupported-files-jszip-result.zip`, packageZip)

    const zip = await JSZip.loadAsync(packageZip)
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(PACKED_DOCUMENTS))
  }, 100000)

  test('Pack unsupported files using admzip', async () => {
    await editor.run()
    const { packageVersion } = await editor.createNodeVersionPackage()
    await registryFs.writeFile(`${VERSIONS_PATH}/unsupported-files-admzip-result.zip`, packageVersion)

    const zip = await JSZip.loadAsync(packageVersion)
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(PACKED_DOCUMENTS))
  }, 100000)
})
