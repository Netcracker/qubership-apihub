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

export const GET_METHOD_TYPE = 'get'
export const POST_METHOD_TYPE = 'post'
export const PUT_METHOD_TYPE = 'put'
export const PATCH_METHOD_TYPE = 'patch'
export const DELETE_METHOD_TYPE = 'delete'

export type MethodType =
  | typeof GET_METHOD_TYPE
  | typeof POST_METHOD_TYPE
  | typeof PUT_METHOD_TYPE
  | typeof PATCH_METHOD_TYPE
  | typeof DELETE_METHOD_TYPE

export const METHOD_TYPES: ReadonlySet<MethodType> = new Set([
  GET_METHOD_TYPE,
  POST_METHOD_TYPE,
  PUT_METHOD_TYPE,
  PATCH_METHOD_TYPE,
  DELETE_METHOD_TYPE,
])

export const METHOD_TYPE_COLOR_MAP: Record<MethodType, string> = {
  [GET_METHOD_TYPE]: '#6BCE70',
  [POST_METHOD_TYPE]: '#5CB9CC',
  [PUT_METHOD_TYPE]: '#D86DEA',
  [PATCH_METHOD_TYPE]: '#FFB02E',
  [DELETE_METHOD_TYPE]: '#FF5260',
}
