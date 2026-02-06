import type { APIRequestContext, APIResponse } from '@playwright/test'
import type { LintRulesetApiType, LintRulesetLinter, LintRulesetStatus } from '@portal/entities'
import type { IdRestParams, TestIdRestParams } from '@services/rest/rest.types'
import type { TestFile } from '@shared/entities'

const API_LINTER_API_V1 = '/api-linter/api/v1'

export type LintRulesetRestDto = Readonly<{
  id: string
  name: string
  fileName: string
  status: LintRulesetStatus
  apiType: LintRulesetApiType
  linter: LintRulesetLinter
  createdAt: string
  canBeDeleted: boolean
}>

export type CreateLintRulesetRestParams = Readonly<{
  name: string
  apiType: LintRulesetApiType
  linter: LintRulesetLinter
  file: TestFile
}>

export async function rGetRulesets(rc: APIRequestContext): Promise<APIResponse> {
  return await rc.get(`${API_LINTER_API_V1}/rulesets`)
}

export async function rGetRuleset(rc: APIRequestContext, { id }: IdRestParams): Promise<APIResponse> {
  const rulesetId = encodeURIComponent(id)
  return await rc.get(`${API_LINTER_API_V1}/rulesets/${rulesetId}`)
}

export async function rCreateRuleset(rc: APIRequestContext, params: CreateLintRulesetRestParams): Promise<APIResponse> {
  const { file, apiType, name, linter } = params
  const blob = await file.blob()

  const formData = new FormData()
  formData.append('rulesetName', name)
  formData.append('apiType', apiType)
  formData.append('linter', linter)
  formData.append('rulesetFile', blob, file.name)

  return await rc.post(`${API_LINTER_API_V1}/rulesets`, {
    multipart: formData,
  })
}

export async function rActivateRuleset(rc: APIRequestContext, { id }: IdRestParams): Promise<APIResponse> {
  const rulesetId = encodeURIComponent(id)
  return await rc.post(`${API_LINTER_API_V1}/rulesets/${rulesetId}/activation`)
}

export async function rDeleteRuleset(rc: APIRequestContext, { id }: IdRestParams): Promise<APIResponse> {
  const rulesetId = encodeURIComponent(id)
  return await rc.delete(`${API_LINTER_API_V1}/rulesets/${rulesetId}`)
}

export async function rClearLinterTestData(rc: APIRequestContext, { testId }: TestIdRestParams): Promise<APIResponse> {
  return await rc.delete(`/api-linter/api/internal/clear/${testId}`)
}

export type RunValidationRestParams = Readonly<{
  packageId: string
  version: string
}>

export type ValidationStatusRestDto = Readonly<{
  status: 'success' | 'inProgress' | 'error'
}>

export async function rRunValidation(
  rc: APIRequestContext,
  { packageId, version }: RunValidationRestParams,
): Promise<APIResponse> {
  return await rc.post(`${API_LINTER_API_V1}/packages/${packageId}/versions/${version}/validation`)
}

export async function rGetValidationStatus(
  rc: APIRequestContext,
  { packageId, version }: RunValidationRestParams,
): Promise<APIResponse> {
  return await rc.get(`${API_LINTER_API_V1}/packages/${packageId}/versions/${version}/validation/summary`)
}
