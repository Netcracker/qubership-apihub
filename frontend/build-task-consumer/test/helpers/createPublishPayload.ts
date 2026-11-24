import fs from 'fs/promises'
import path from 'path'
import AdmZip from 'adm-zip'
import { PublishFilesConfigType } from '../../src/modules/builder/builder.schema'

export const createPublishPayload = async (serviceId: string) => {
  const indexPath = path.join(__dirname, '../resources/services/index.json')
  const services = JSON.parse(await fs.readFile(indexPath, 'utf8'))
  const config: PublishFilesConfigType = services[serviceId]
  const zip = new AdmZip()

  for (const file of config.files) {
    const filePath = path.join(__dirname, `../resources/services/${serviceId}/${file.fileId}`)
    zip.addFile(file.fileId, Buffer.from(await fs.readFile(filePath, 'utf8')))
  }

  const sources = await zip.toBufferPromise()
  return { config, sources }
}
