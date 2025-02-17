import type { APIRequestContext, APIResponse } from '@playwright/test'
import type { VersionStatuses } from '@shared/entities'
import type { RestOperationGroup, RestOperationGroupUpdate } from '@services/rest/rest.types'

export async function rGetPackageVersion(rc: APIRequestContext, params: {
  packageId: string
  version: string
}): Promise<APIResponse> {
  return await rc.get(`/api/v2/packages/${params.packageId}/versions/${params.version}`)
}

export async function rUpdatePackageVersion(rc: APIRequestContext, params: {
  packageId: string
  version: string
  status?: VersionStatuses
  versionLabels?: string[]
}): Promise<APIResponse> {
  return await rc.patch(`/api/v2/packages/${params.packageId}/versions/${params.version}`, {
    data: {
      status: params.status,
      versionLabels: params.versionLabels || undefined,
    },
  })
}

export async function rCreateOperationGroup(rc: APIRequestContext, params: RestOperationGroup): Promise<APIResponse> {
  const formData = new FormData()
  formData.append('groupName', params.groupName)
  formData.append('description', params.description || '')
  if (params.template) {
    formData.append('template', await params.template.blob(), params.template.name)
  }
  return await rc.post(`/api/v3/packages/${params.packageId}/versions/${params.version}/${params.apiType}/groups`, {
    multipart: formData,
  })
}

export async function rUpdateOperationGroup(rc: APIRequestContext, params: RestOperationGroupUpdate): Promise<APIResponse> {
  const formData = new FormData()
  formData.append('groupName', params.newGroupName || params.groupName)
  formData.append('description', params.description || '')
  formData.append('operations', JSON.stringify(params.operations) || '')
  if (params.template) {
    formData.append('template', await params.template.blob(), params.template.name)
  } else {
    formData.append('template', '')
  }
  return await rc.patch(`/api/v3/packages/${params.packageId}/versions/${params.version}/${params.apiType}/groups/${params.groupName}`, {
    multipart: formData,
  })
}

export async function rDeleteOperationGroup(rc: APIRequestContext, params: RestOperationGroup): Promise<APIResponse> {
  return await rc.delete(`/api/v2/packages/${params.packageId}/versions/${params.version}/${params.apiType}/groups/${params.groupName}`)
}
