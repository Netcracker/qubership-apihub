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

import type { Key } from './keys'

export const USER_CURSOR_EVENT_TYPE = 'user:cursor'
export const USER_OPERATION_EVENT_TYPE = 'user:operation'
export const DOCUMENT_SNAPSHOT_EVENT_TYPE = 'document:snapshot'

export type UserCursorEventData = {
  type: typeof USER_CURSOR_EVENT_TYPE
  sessionId: Key
  cursor: {
    position: number
    selectionEnd: number
  }
}

export function isUserCursorEventData(
  value: Record<string, unknown>,
): value is UserCursorEventData {
  return value.type === USER_CURSOR_EVENT_TYPE
}

export type UserOperationEventData = {
  type: typeof USER_OPERATION_EVENT_TYPE
  sessionId: Key
  revision: number
  operation: (string | number)[]
}

export function isUserOperationEventData(
  value: Record<string, unknown>,
): value is UserOperationEventData {
  return value.type === USER_OPERATION_EVENT_TYPE
}

export type DocumentSnapshotEventData = {
  type: typeof DOCUMENT_SNAPSHOT_EVENT_TYPE
  document: string[]
  revision: number
}

export function isDocumentSnapshotEventData(
  value: Record<string, unknown>,
): value is DocumentSnapshotEventData {
  return value.type === DOCUMENT_SNAPSHOT_EVENT_TYPE
}
