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

import { LIKE_TYPE_PROPERTY_TO_CLASS_RELATION } from 'main/domain/like/type'
import {
  HasIdentityLike,
  HasPrimaryLike,
  HasReferenceFromPropertyToClassLike,
  HasTypeLike,
} from 'main/domain/like/base'
import {
  equalsByHasReferenceFromPropertyToClass,
  equalsByIdentity,
  equalsByPrimary,
} from 'main/domain/like/base-equals'
import { createCustomEqual } from 'fast-equals'
import { IsEqualFunction } from 'main/domain/base'

export interface PropertyToClassRelationLike extends HasIdentityLike, HasTypeLike<typeof LIKE_TYPE_PROPERTY_TO_CLASS_RELATION>, HasPrimaryLike, HasReferenceFromPropertyToClassLike {
}

export const equalsPropertyToClassRelationByLayout: IsEqualFunction<PropertyToClassRelationLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsPropertyToClassRelationLikeByLayoutImpl,
  }),
})

export const equalsPropertyToClassRelationByVisual: IsEqualFunction<PropertyToClassRelationLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsPropertyToClassRelationLikeByVisualImpl,
  }),
})

function equalsPropertyToClassRelationLikeByLayoutImpl(first: PropertyToClassRelationLike, second: PropertyToClassRelationLike): boolean {
  return equalsByIdentity(first, second)
    && equalsByPrimary(first, second)
    && equalsByHasReferenceFromPropertyToClass(first, second)
}

function equalsPropertyToClassRelationLikeByVisualImpl(): boolean {
  return true
}