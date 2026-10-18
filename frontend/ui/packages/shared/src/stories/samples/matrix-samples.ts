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

export type HorizontalItem = {
  title: string
}

export type VerticalItem = {
  name: string
}

export type MatrixItem = {
  checked: boolean
  disabled: boolean
}

const HORIZONTAL = 6
const VERTICAL = 6

export const HORIZONTAL_ITEMS: HorizontalItem[] = Array.from({ length: HORIZONTAL }, (_, index) => ({
  title: `header-${index}`,
}))

export const VERTICAL_ITEMS: VerticalItem[] = Array.from({ length: VERTICAL }, (_, index) => ({
  name: `user-${index}`,
}))

export const MATRIX: MatrixItem[][] = Array.from({ length: VERTICAL }, () => (
  Array.from({ length: HORIZONTAL }, () => ({ checked: true, disabled: false }))
))
