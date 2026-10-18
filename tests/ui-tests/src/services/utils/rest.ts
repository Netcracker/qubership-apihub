import type { APIResponse } from '@playwright/test'

export const getResponseDebugMsg = async (response: APIResponse, callName?: string): Promise<string> => {
  const reqUrl = response.url()
  const respCode = response.status()
  const respBody = await response.text()
  const reqUrlTitle = callName ? `${callName} request URL` : 'Request URL'
  const respCodeTitle = callName ? `${callName} response code` : 'Response code'
  const respBodyTitle = callName ? `${callName} response body` : 'Response body'
  return `${reqUrlTitle}: ${reqUrl}\n${respCodeTitle}: ${respCode}\n${respBodyTitle}: ${respBody}`
}
