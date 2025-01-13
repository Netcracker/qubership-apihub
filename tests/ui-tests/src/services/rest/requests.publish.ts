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

import type { APIRequestContext, APIResponse } from '@playwright/test'
import type { RestPublishVersion } from './rest.types'

export async function rPublishVersionViaUpload(rc: APIRequestContext, params: RestPublishVersion): Promise<APIResponse> {
  const formData = new FormData()
  formData.append('config', params.config)
  if (params.sources) {
    formData.append('sources', params.sources, 'package.zip')
  }
  return await rc.post(`/api/v2/packages/${params.packageId}/publish`, {
    multipart: formData,
  })
}

export async function rGetPublishStatus(rc: APIRequestContext, params: {
  packageId: string
  publishId: string
}): Promise<APIResponse> {
  return await rc.get(`/api/v2/packages/${params.packageId}/publish/${params.publishId}/status`)
}
