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
