import { setupWorker } from 'msw/browser'

import { serviceHandlers } from './handlers/service-handlers'
import { snapshotHandlers } from './handlers/snapshot-handlers'

export const worker = setupWorker(...serviceHandlers, ...snapshotHandlers)
