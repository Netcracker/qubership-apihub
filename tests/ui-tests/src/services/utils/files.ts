import JSZip from 'jszip'
import type { TestFile } from '@shared/entities'

export const packToZip = async (files: TestFile[]): Promise<Blob> => {
  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.name, (await file.blob()).arrayBuffer())
  }
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  })
}
