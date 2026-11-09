import type { RequestJsonExtraOptions } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { getResponseError } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import { portalRequestJson } from './requests'

export async function requestJsonWithError<T extends object>(
  input: RequestInfo | URL,
  init: RequestInit,
  options: Omit<RequestJsonExtraOptions, 'customErrorHandler' | 'ignoreNotFound'>,
  signal?: AbortSignal,
): Promise<T> {
  let failedResponse: Response | undefined
  const result = await portalRequestJson<T>(input, init, {
    ...options,
    customErrorHandler: response => {
      failedResponse = response
    },
  }, signal)
  if (failedResponse) {
    const [message, code] = await getResponseError(failedResponse)
    throw new HttpError(message, code, failedResponse.status)
  }
  return result
}
