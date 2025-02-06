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

import type { WebSocket } from 'ws'
import type { IClientState } from './routers/websockets/websockets'

export type Writeable<T> = {
  -readonly [P in keyof T]: T[P]
}

export type DeepWriteable<T> = {
  -readonly [P in keyof T]: DeepWriteable<T[P]>
}

export type Socket = {
  id?: string
  state?: IClientState
} & WebSocket

export type Key = Readonly<string>
export type FileKey = Key
export type VersionKey = Key

export type Url = Readonly<string>
