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

import { describe, expect, test } from '@jest/globals'
import { MESSAGE_CATEGORY, MESSAGE_SEVERITY } from '../src/consts'
import { MessageSeverity, NotificationMessage } from '../src/types/package/notifications'
import { NotificationsError } from '../src/errors'
import { toNotificationsError } from '../src/components/release-gate'
import { buildNotifications } from '../src/components/build-result-index'
import * as root from '../src'

const message = (text: string, severity: MessageSeverity = MESSAGE_SEVERITY.Error): NotificationMessage => ({
  category: MESSAGE_CATEGORY.BuildDocument,
  severity,
  message: text,
})

describe('NotificationsError', () => {
  // `../src/processor` re-exports the root, so the root is the one to check
  test('should be importable from the root entry', () => {
    expect(root.NotificationsError).toBe(NotificationsError)
  })

  // a client may serialize the error as the request part as it is
  test('should serialize to the two lists and nothing else', () => {
    const error = new NotificationsError(new TypeError('fatal'), [message('build')], [])

    expect(JSON.parse(JSON.stringify(error))).toEqual({
      notifications: [message('build')],
      comparisonNotifications: [],
    })
  })

  test('should read as the original error', () => {
    const original = new TypeError('Cannot read properties of undefined')

    const error = new NotificationsError(original, [], [])

    expect(`${error}`).toBe(`${original}`)
    expect(error.message).toBe(original.message)
    expect(error.cause).toBe(original)
  })

  test('should read as the original value when something other than an Error was thrown', () => {
    const error = new NotificationsError('registry unreachable', [], [])

    expect(`${error}`).toBe('registry unreachable')
  })
})

describe('toNotificationsError', () => {
  test('should keep the lists when the builder empties its arrays for the next run', () => {
    const notifications = [message('build')]
    const comparisonNotifications = [message('comparison')]

    const error = toNotificationsError(new Error('fatal'), notifications, [comparisonNotifications])
    notifications.length = 0
    comparisonNotifications.length = 0

    expect(error.notifications).toHaveLength(1)
    expect(error.comparisonNotifications).toHaveLength(1)
  })

  // the direct pin: the integration case in release-gate.test.ts depends on its fixture sharing an array
  test('should keep a message that sits in two comparison arrays once', () => {
    const baseline = message('Cannot resolve previous version')
    const rootNotifications = [baseline]
    const comparisonNotifications = [baseline]

    const error = toNotificationsError(new Error('fatal'), [], [comparisonNotifications, rootNotifications])

    expect(error.comparisonNotifications).toEqual([baseline])
  })

  test('should sort both lists in the order of notifications.json', () => {
    const unsorted = [message('b', MESSAGE_SEVERITY.Warning), message('a', MESSAGE_SEVERITY.Warning), message('c')]

    const error = toNotificationsError(new Error('fatal'), unsorted, [unsorted])

    const expected = buildNotifications(unsorted).notifications
    // the fixture is out of order, so an unsorted copy fails the assertions below
    expect(expected).not.toEqual(unsorted)
    expect(error.notifications).toEqual(expected)
    expect(error.comparisonNotifications).toEqual(expected)
  })
})
