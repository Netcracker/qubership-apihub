import { IMediaTypeContent } from '@stoplight/types'
import { extractAmountOfDiffs, isDiff } from '@netcracker/qubership-apihub-apispec-view-diff-block'
import { keys } from 'lodash'

/**
 * Data attribute with the diff action (`add`, `remove`, `rename`, `replace`) of a switchable
 * section (response code tab, media type option). Lets tooling (e.g. Storybook stories and
 * screenshot tests) switch to the section with the major change.
 */
export const DIFF_ACTION_ATTRIBUTE = 'data-diff-action'

/**
 * Diff action of a request/response body media type:
 * - the action of the whole media type diff (added/removed/renamed),
 * - otherwise the action of the whole schema diff (schema added/removed),
 * - otherwise `replace` when anything inside the media type changed.
 */
export function resolveMediaTypeDiffAction(content: IMediaTypeContent, diffsMetaKey: symbol): string | undefined {
  const diffMeta = content[diffsMetaKey]
  if (isDiff(diffMeta)) {
    return diffMeta.action
  }
  if (isDiff(diffMeta?.schema)) {
    return diffMeta.schema.action
  }
  const changesSummary = extractAmountOfDiffs(content, diffsMetaKey)
  return keys(changesSummary).some(changeType => changesSummary[changeType] > 0) ? 'replace' : undefined
}
