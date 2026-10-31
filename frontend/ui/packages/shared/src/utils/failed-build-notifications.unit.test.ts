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
  type FailedBuildNotifications,
  type NotificationMessage,
  NotificationsError,
} from '@netcracker/qubership-apihub-api-processor'
import { transferHandlers } from 'comlink'

import {
  appendFailedBuildNotifications,
  serializeThrownValue,
  toFailedPublicationDetails,
} from './failed-build-notifications'
import { WorkerUnauthorizedError } from './security'

const PARSE_ERROR: NotificationMessage = {
  category: 'parse-file',
  severity: 0,
  message: 'Cannot parse file',
  documentId: 'broken.yaml',
}
const UNRESOLVED_VERSION: NotificationMessage = {
  category: 'version-not-resolved',
  severity: 0,
  message: 'No such version',
}
const LISTS: FailedBuildNotifications = {
  notifications: [PARSE_ERROR],
  comparisonNotifications: [UNRESOLVED_VERSION],
}

describe('toFailedPublicationDetails', () => {
  it('takes both lists from a NotificationsError', () => {
    const error = new NotificationsError(new Error('boom'), [PARSE_ERROR], [UNRESOLVED_VERSION])

    expect(toFailedPublicationDetails(error)).toStrictEqual({
      errors: 'Error: boom',
      notifications: LISTS,
    })
  })

  // the main thread rebuilds a worker's error with comlink's own handler: a plain Error with the fields copied on
  it('takes both lists from an error that crossed comlink', () => {
    const serialized = serializeThrownValue(
      new NotificationsError(new Error('boom'), [PARSE_ERROR], [UNRESOLVED_VERSION]),
    )

    const error = catchThrown(() => transferHandlers.get('throw')!.deserialize(serialized))

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(NotificationsError)
    expect(toFailedPublicationDetails(error)).toStrictEqual({
      errors: 'Error: boom',
      notifications: LISTS,
    })
  })

  it('sends no lists for an error without them', () => {
    expect(toFailedPublicationDetails(new Error('boom'))).toStrictEqual({
      errors: 'Error: boom',
      notifications: undefined,
    })
  })

  // the two lists go out as a pair: if either one is missing or malformed, neither is sent
  it.each([
    ['only notifications is present', { notifications: [PARSE_ERROR] }],
    ['only comparisonNotifications is present', { comparisonNotifications: [UNRESOLVED_VERSION] }],
    ['notifications is not an array', { notifications: 'broken', comparisonNotifications: [UNRESOLVED_VERSION] }],
    ['comparisonNotifications is not an array', { notifications: [PARSE_ERROR], comparisonNotifications: 'broken' }],
  ])('sends no lists when %s', (_, fields) => {
    const error = Object.assign(new Error('boom'), fields)

    expect(toFailedPublicationDetails(error)).toStrictEqual({
      errors: 'Error: boom',
      notifications: undefined,
    })
  })

  // a build can throw anything, not only an Error: such a value has no lists to read and is sent as its text form
  it.each([
    ['a string', 'boom', 'boom'],
    ['undefined', undefined, 'undefined'],
    ['null', null, 'null'],
  ])('reports %s as text without lists', (_, error, errors) => {
    expect(toFailedPublicationDetails(error)).toStrictEqual({ errors: errors, notifications: undefined })
  })
})

describe('appendFailedBuildNotifications', () => {
  // the backend reads the part with FormFile, which skips a part without a file name
  it('adds the lists as a JSON file part named notifications', async () => {
    const formData = new FormData()

    appendFailedBuildNotifications(formData, LISTS)

    const part = formData.get('notifications')
    expect(part).toBeInstanceOf(File)
    const file = part as File
    expect(file.name).toBe('failed-build-notifications.json')
    expect(file.type).toBe('application/json')
    expect(JSON.parse(await file.text())).toStrictEqual(LISTS)
  })
})

describe('serializeThrownValue', () => {
  it('copies the message, name, and stack of an error', () => {
    const error = new TypeError('boom')

    expect(serializeThrownValue(error)).toStrictEqual({
      isError: true,
      value: {
        message: 'boom',
        name: 'TypeError',
        stack: error.stack,
        responseStatus: undefined,
      },
    })
  })

  it('adds both notification lists of a NotificationsError', () => {
    const error = new NotificationsError(new Error('boom'), [PARSE_ERROR], [UNRESOLVED_VERSION])

    expect(serializeThrownValue(error)).toMatchObject({
      isError: true,
      value: { message: 'boom', ...LISTS },
    })
  })

  it.each([
    ['a string', 'boom'],
    ['an object', { message: 'boom' }],
    ['undefined', undefined],
  ])('passes %s through as a non-error', (_, value) => {
    expect(serializeThrownValue(value)).toStrictEqual({ isError: false, value: value })
  })

  // the calling thread has no handler of its own, so comlink's default one must rebuild the error
  it('lets the default comlink handler rebuild an unauthorized error', () => {
    const serialized = serializeThrownValue(new WorkerUnauthorizedError())

    expect(() => transferHandlers.get('throw')!.deserialize(serialized)).toThrow(
      expect.objectContaining({
        message: 'HTTP 401 Unauthorized',
        name: 'WorkerUnauthorizedError',
        responseStatus: 401,
      }),
    )
  })
})

function catchThrown(action: () => unknown): unknown {
  try {
    action()
  } catch (thrown) {
    return thrown
  }
  throw new Error('expected the action to throw')
}
