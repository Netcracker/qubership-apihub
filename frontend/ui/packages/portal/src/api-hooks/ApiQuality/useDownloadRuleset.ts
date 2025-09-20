import type { Key } from '@apihub/entities/keys'
import { requestBlob } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useMutation } from '@tanstack/react-query'
import fileDownload from 'js-file-download'
import { generatePath } from 'react-router'
import { API_LINTER_API_V1 } from './constants'

type CallbackOptionsDownloadRuleset = { rulesetId: Key }

type CallbackDownloadRuleset = (options: CallbackOptionsDownloadRuleset) => void

function getEndpoint(rulesetId: Key): string {
  const rulesetKey = encodeURIComponent(rulesetId)
  const pattern = '/rulesets/:rulesetId/data'
  return generatePath(pattern, { rulesetId: rulesetKey })
}

export function getPublicLink(
  host: string,
  protocol: string,
  rulesetId: Key,
): string {
  const endpoint = getEndpoint(rulesetId)
  return `${protocol}//${host}${API_LINTER_API_V1}${endpoint}`
}

export function useDownloadRuleset(): CallbackDownloadRuleset {
  const { mutate } = useMutation<void, Error, CallbackOptionsDownloadRuleset>({
    mutationFn: ({ rulesetId }) => downloadRuleset(rulesetId),
  })

  return mutate
}

async function downloadRuleset(rulesetId: Key): Promise<void> {
  const endpoint = getEndpoint(rulesetId)
  const searchParams = optionalSearchParams({
    disposition: { value: 'attachment' },
  })

  const response = await requestBlob(
    `${endpoint}?${searchParams}`,
    { method: 'GET' },
    { basePath: API_LINTER_API_V1 },
  )

  const data = await response.text()

  const [filename] = response
    .headers
    .get('content-disposition')!
    .split('filename=')[1]
    .split(';')

  fileDownload(data, filename.replace(/"/g, ''))
}
