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

export type ErrorDto = {
  status: number
  code: string
  message: string
  params?: Record<string, string>
  debug?: string
}

export type AxiosError = {
  response: ErrorResponse
}

type ErrorResponse = {
  data: ErrorDto
}

export const IMPORT_AUTH_ERROR = '400'
export const IMPORT_FILE_NOT_AVAILABLE_ERROR = '401'
export const PROJECT_ALIAS_EXIST_ERROR = '21'
export const PACKAGE_NOT_PUBLISHED_ERROR = '22'
export const GROUP_ALIAS_EXIST_ERROR = '11'

export const CUSTOM_ERRORS = [
  IMPORT_AUTH_ERROR,
  IMPORT_FILE_NOT_AVAILABLE_ERROR,
  PROJECT_ALIAS_EXIST_ERROR,
  PACKAGE_NOT_PUBLISHED_ERROR,
  GROUP_ALIAS_EXIST_ERROR,
]
