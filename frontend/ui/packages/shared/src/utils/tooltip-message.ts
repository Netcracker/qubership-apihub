/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
