import type { APIRequestContext, APIResponse } from '@playwright/test'
import type { RestPackageApiKey, RestPackageCreate, RestPackageUpdate } from './rest.types'

export async function rCreatePackage(rc: APIRequestContext, params: RestPackageCreate): Promise<APIResponse> {
  return await rc.post('/api/v2/packages', {
    data: {
      name: params.name,
      parentId: params.parentId || '',
      alias: params.alias,
      kind: params.kind,
      description: params.description || '',
      serviceName: params.serviceName || '',
      releaseVersionPattern: params.releaseVersionPattern || '',
      restGroupingPrefix: params.restGroupingPrefix || '',
      defaultRole: params.defaultRole || '',
    },
  })
}

export async function rUpdatePackage(rc: APIRequestContext, params: RestPackageUpdate): Promise<APIResponse> {
  return await rc.patch(`/api/v2/packages/${params.packageId}`, {
    data: {
      name: params.name,
      description: params.description,
      serviceName: params.serviceName,
      imageUrl: params.imageUrl,
      defaultRole: params.defaultRole,
      defaultReleaseVersion: params.defaultReleaseVersion,
      releaseVersionPattern: params.releaseVersionPattern,
      excludeFromSearch: params.releaseVersionPattern,
      restGroupingPrefix: params.restGroupingPrefix,
    },
  })
}

export async function rRecalculateGroups(rc: APIRequestContext, params: { packageId: string }): Promise<APIResponse> {
  return await rc.post(`/api/v2/packages/${params.packageId}/recalculateGroups`, {})
}

export async function rDeletePackage(rc: APIRequestContext, params: { packageId: string }): Promise<APIResponse> {
  return await rc.delete(`/api/v2/packages/${params.packageId}`)
}

export async function rFavorPackage(rc: APIRequestContext, params: { packageId: string }): Promise<APIResponse> {
  return await rc.post(`/api/v2/packages/${params.packageId}/favor`)
}

export async function rGetPackageById(rc: APIRequestContext, params: { packageId: string }): Promise<APIResponse> {
  return await rc.get(`/api/v2/packages/${params.packageId}`)
}

export async function rGetPackagesList(rc: APIRequestContext, params: {
  kind?: string
  textFilter?: string
}): Promise<APIResponse> {
  const _textFilter = params.textFilter ? encodeURIComponent(params.textFilter) : ''
  const _kind = params.kind ? params.kind : ''
  return await rc.get(`/api/v2/packages?kind=${_kind}&textFilter=${_textFilter}`)
}

export async function rCreatePackageApiKey(rc: APIRequestContext, params: RestPackageApiKey): Promise<APIResponse> {
  return await rc.post(`/api/v4/packages/${params.packageId}/apiKeys`, {
    data: {
      name: params.name,
      roles: params.roles,
      createdFor: params.createdFor,
    },
  })
}
