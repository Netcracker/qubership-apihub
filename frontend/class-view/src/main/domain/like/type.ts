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

export type LikeType = typeof LIKE_TYPE_CLASS
  | typeof LIKE_TYPE_LEAF_PROPERTY
  | typeof LIKE_TYPE_PROPERTY_GROUP
  | typeof LIKE_TYPE_PROPERTY_TO_CLASS_RELATION
  | typeof LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION

export const LIKE_TYPE_CLASS = 'class'
export const LIKE_TYPE_LEAF_PROPERTY = 'leaf-property'
export const LIKE_TYPE_PROPERTY_GROUP = 'properties-group'
export const LIKE_TYPE_PROPERTY_TO_CLASS_RELATION = 'property-to-class'
export const LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION = 'include-group'