import { setupWorker } from 'msw/browser'

import { comparisonHandlers } from './handlers/comparison-handlers'
import { notificationHandlers } from './handlers/notification-handlers'
import { versionHandlers } from './handlers/version-handlers'

export const worker = setupWorker(
  ...versionHandlers,
  ...notificationHandlers,
  ...comparisonHandlers,
)
