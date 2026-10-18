/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
