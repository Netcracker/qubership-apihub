import {
  ERROR_STATUS_MARKER_VARIANT,
  SUCCESS_STATUS_MARKER_VARIANT,
  WARNING_STATUS_MARKER_VARIANT,
} from '../components/StatusMarker'
import type { BwcData } from './change-severities'

export function getTooltipMessage(bwcError: BwcData | undefined): string {
  if (!bwcError) {
    return ''
  }

  const { count } = bwcError
  switch (bwcError.type) {
    case WARNING_STATUS_MARKER_VARIANT:
      return `The latest release version has ${count} changes that do not break backwards compatibility`
    case ERROR_STATUS_MARKER_VARIANT:
      return `The latest release version has ${count} changes that broke backward compatibility`
    case SUCCESS_STATUS_MARKER_VARIANT:
      return 'The latest release version does not have any changes compared to the previous version'
    default:
      return ''
  }
}
