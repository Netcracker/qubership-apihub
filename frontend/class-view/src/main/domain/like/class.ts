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
  HasPropertiesLike,
  HasShapeLike,
  HasTypeLike,
} from 'main/domain/like/base'
import { createCustomEqual } from 'fast-equals'
import { LIKE_TYPE_CLASS } from 'main/domain/like/type'
import { equalsByDeprecation, equalsByIdentity, equalsByName, equalsByShape } from 'main/domain/like/base-equals'
import { PropertyLike } from 'main/domain/like/all'
import { IsEqualFunction } from 'main/domain/base'

export interface ClassLike extends HasIdentityLike, HasNameLike, HasTypeLike<typeof LIKE_TYPE_CLASS>, HasPropertiesLike<PropertyLike>, HasShapeLike, HasDeprecationLike {
}

export const equalsClassByLayout: IsEqualFunction<ClassLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsClassLikeByLayoutImpl,
  }),
})

export const equalsClassByVisual: IsEqualFunction<ClassLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsClassLikeByVisualImpl,
  }),
})

function equalsClassLikeByLayoutImpl(first: ClassLike, second: ClassLike): boolean {
  return equalsByIdentity(first, second)
}

function equalsClassLikeByVisualImpl(first: ClassLike, second: ClassLike): boolean {
  return equalsByName(first, second)
    && equalsByShape(first, second)
    && equalsByDeprecation(first, second)
}