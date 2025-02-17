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
