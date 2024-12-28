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

import {
  HasDeprecationLike,
  HasIdentityLike,
  HasNameLike,
  HasPropertyTypeDeprecationLike,
  HasPropertyTypeLike,
  HasRequiredLike,
  HasTypeLike,
} from 'main/domain/like/base'
import { createCustomEqual } from 'fast-equals'
import {
  equalsByDeprecation,
  equalsByIdentity,
  equalsByName,
  equalsByPropertyType,
  equalsByPropertyTypeDeprecation,
  equalsByRequired,
} from 'main/domain/like/base-equals'
import { LIKE_TYPE_LEAF_PROPERTY } from 'main/domain/like/type'
import { IsEqualFunction } from 'main/domain/base'

export interface LeafPropertyLike extends HasIdentityLike, HasNameLike, HasTypeLike<typeof LIKE_TYPE_LEAF_PROPERTY>, HasRequiredLike, HasDeprecationLike, HasPropertyTypeDeprecationLike, HasPropertyTypeLike {
}

export const equalsLeafPropertyByLayout: IsEqualFunction<LeafPropertyLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsLeafPropertyLikeByLayoutImpl,
  }),
})

export const equalsLeafPropertyByVisual: IsEqualFunction<LeafPropertyLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsLeafPropertyLikeByVisualImpl,
  }),
})

function equalsLeafPropertyLikeByLayoutImpl(first: LeafPropertyLike, second: LeafPropertyLike): boolean {
  //order? not our case until immutable
  return equalsByIdentity(first, second)
}

function equalsLeafPropertyLikeByVisualImpl(first: LeafPropertyLike, second: LeafPropertyLike): boolean {
  return equalsByName(first, second)
    && equalsByRequired(first, second)
    && equalsByPropertyType(first, second)
    && equalsByDeprecation(first, second)
    && equalsByPropertyTypeDeprecation(first, second)
}