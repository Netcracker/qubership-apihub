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

import { FailedBuildNotifications, MessageCategory, NotificationMessage } from './types/package/notifications'
import type { FileFormat } from './types/internal/documents'

/**
 * A build failure that knows which diagnostic it is. Thrown deep in an api-type builder and re-thrown by
 * `buildDocument`, it keeps its category all the way to the catch that turns it into a notification —
 * without it every nested failure would flatten into the generic `build-document`.
 */
export class DocumentBuildError extends Error {
  constructor(message: string, readonly category: MessageCategory) {
    super(message)
    this.name = 'DocumentBuildError'
  }
}

/**
 * A fatal failure of a `build` or `changelog` build, carrying what the build had reported before it failed. A
 * failed build writes no archive, so this is the only way its messages reach the client.
 *
 * It reads as the original error: every client reports a failure as `${error}`, so the name and message are the
 * original's and the original is the `cause`.
 */
export class NotificationsError extends Error implements FailedBuildNotifications {
  constructor(
    cause: unknown,
    readonly notifications: NotificationMessage[],
    readonly comparisonNotifications: NotificationMessage[],
  ) {
    super(cause instanceof Error ? cause.message : String(cause), { cause })
    // an empty name makes `${this}` the bare message, which is what `${cause}` gives for a non-Error throw;
    // not enumerable, so `JSON.stringify(error)` gives the two lists and nothing else
    Object.defineProperty(this, 'name', {
      value: cause instanceof Error ? cause.name : '',
      writable: true,
      configurable: true,
    })
  }
}

/**
 * A parse failure of a file its parser had already recognized. It carries the type and format the parser
 * settled on before it threw, and `parseFile` puts them on the fallback file — without them a broken
 * GraphQL schema would be published as an `unknown` document, outside its own API type.
 */
export class RecognizedFileParseError extends Error {
  constructor(cause: unknown, readonly type: string, readonly format: FileFormat) {
    super(cause instanceof Error ? cause.message : 'Unknown error', { cause })
    this.name = 'RecognizedFileParseError'
  }
}

/** Run the step of a parser that reads a file already recognized as `type`, and keep that type if it throws. */
export const parseRecognized = <T>(type: string, format: FileFormat, parse: () => T): T => {
  try {
    return parse()
  } catch (error) {
    throw new RecognizedFileParseError(error, type, format)
  }
}
