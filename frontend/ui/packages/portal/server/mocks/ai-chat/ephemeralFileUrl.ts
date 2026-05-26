import { MOCK_FILE_DOWNLOAD_TOKEN } from './constants'

/** Stable UUID used in `debug:files` stream markdown (mock download). */
export const MOCK_ATTACHMENT_FILE_ID = '11111111-1111-4111-8111-111111111111'

export function buildEphemeralFileUrl(
  fileId: string,
  token: string = MOCK_FILE_DOWNLOAD_TOKEN,
): string {
  return `/api/v1/ephemeral-files/${encodeURIComponent(fileId)}?token=${encodeURIComponent(token)}`
}
