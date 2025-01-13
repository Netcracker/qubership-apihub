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

export type TimeoutOption = {
  timeout?: number
}

export type ReloadOptions = TimeoutOption & {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
}

export type GotoOptions = TimeoutOption & {
  referer?: string
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
}

export type ClickOptions = TimeoutOption & {
  button?: 'left' | 'right' | 'middle'
  clickCount?: number
  delay?: number
  force?: boolean
  modifiers?: Array<'Alt' | 'Control' | 'Meta' | 'Shift'>
  noWaitAfter?: boolean
  position?: {
    x: number
    y: number
  }
  trial?: boolean
}

export type HoverOptions = TimeoutOption & {
  force?: boolean
  modifiers?: Array<'Alt' | 'Control' | 'Meta' | 'Shift'>
  noWaitAfter?: boolean
  position?: {
    x: number
    y: number
  }
  trial?: boolean
}

export type FillOptions = TimeoutOption & {
  force?: boolean
  noWaitAfter?: boolean
}

export type TypeOptions = TimeoutOption & {
  delay?: number
  noWaitAfter?: boolean
}

export type ClearOptions = TimeoutOption & {
  force?: boolean
  noWaitAfter?: boolean
}

export type CheckOptions = {
  force?: boolean
  noWaitAfter?: boolean
  position?: {
    x: number
    y: number
  }
}

export type CloseOptions = {
  reason?: string
  runBeforeUnload?: boolean
}

export type SetInputFilesOptions = TimeoutOption & {
  noWaitAfter?: boolean
}
