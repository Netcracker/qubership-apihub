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

// FIXME 18.06.24 // Get rid of it when future wonderful AMT+ADV are ready!
type ParameterKey = string
type MediaType = string
export type TopLevelPropsMediaTypesMap = Record<ParameterKey, MediaType>
export type PropsWithTopLevelPropsMediaTypesMap = {
  topLevelPropsMediaTypes?: TopLevelPropsMediaTypesMap
}