import type { FailedBuildNotifications } from '@netcracker/qubership-apihub-api-processor'

import { isObject } from './objects'
import type { ErrorMessage } from './packages-builder'
import type { WorkerUnauthorizedError } from './security'

type FailedPublicationDetails = {
  errors: ErrorMessage
  notifications?: FailedBuildNotifications
}

type SerializedError = Partial<FailedBuildNotifications> & {
  message: string
  name: string
  stack?: string
  responseStatus?: number
}

type SerializedThrownValue =
  | { isError: true; value: SerializedError }
  | { isError: false; value: unknown }

/**
 * Build the error status fields of a failed build from what it threw.
 *
 * The lists are read by shape, not with `instanceof NotificationsError`: comlink delivers a worker's error to the
 * main thread as a plain `Error` with the fields copied onto it.
 */
export function toFailedPublicationDetails(error: unknown): FailedPublicationDetails {
  return {
    errors: `${error}`,
    notifications: getFailedBuildNotifications(error),
  }
}

// the backend reads this part only as a file, so it needs a file name
export function appendFailedBuildNotifications(formData: FormData, notifications: FailedBuildNotifications): void {
  formData.append(
    'notifications',
    new Blob([JSON.stringify(notifications)], { type: 'application/json' }),
    'failed-build-notifications.json',
  )
}

/**
 * Serialize what a worker threw for comlink's `throw` transfer handler.
 *
 * The result has the shape comlink's default handler deserializes, so the calling thread needs no handler of its own:
 * it gets a plain `Error` with the extra fields copied onto it.
 */
export function serializeThrownValue(value: unknown): SerializedThrownValue {
  if (!(value instanceof Error)) {
    return { isError: false, value: value }
  }
  return {
    isError: true,
    value: {
      message: value.message,
      name: value.name,
      stack: value.stack,
      responseStatus: (value as WorkerUnauthorizedError).responseStatus,
      // the main thread sends these with the error status of a changelog build
      ...getFailedBuildNotifications(value),
    },
  }
}

// a new object with the two lists only, so no other field of the error reaches the part
function getFailedBuildNotifications(error: unknown): FailedBuildNotifications | undefined {
  if (!isObject(error)) {
    return undefined
  }
  const { notifications, comparisonNotifications } = error
  if (!Array.isArray(notifications) || !Array.isArray(comparisonNotifications)) {
    return undefined
  }
  return { notifications, comparisonNotifications }
}
