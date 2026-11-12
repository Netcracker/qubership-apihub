import AdmZip from 'adm-zip'

import { PublishFilesConfigType } from '../../src/modules/builder/builder.schema'
import { loadFile } from './utils'

export const createPublishPayload = async (serviceId: string) => {
  const services = JSON.parse(await loadFile("test/resources", "services", "index.json"))
  const config: PublishFilesConfigType = services[serviceId]
  const zip = new AdmZip()

  for (const file of config.files) {
    zip.addFile(file.fileId, Buffer.from(await loadFile('test/resources/services', serviceId, file.fileId)))
  }

  const sources = await zip.toBufferPromise()
  return { config, sources }
}
