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
  HasPrimaryLike,
  HasPropertyTypeDeprecationLike,
  HasPropertyTypeLike,
  HasReferenceFromGroupToClassLike,
  HasReferenceFromPropertyToClassLike,
  HasRequiredLike,
  HasShapeLike,
} from 'main/domain/like/base'

export function equalsByIdentity(first: HasIdentityLike, second: HasIdentityLike): boolean {
  return first.key === second.key
}

export function equalsByName(first: HasNameLike, second: HasNameLike): boolean {
  return first.name === second.name
}

export function equalsByShape(first: HasShapeLike, second: HasShapeLike): boolean {
  return first.shape === second.shape
}

export function equalsByPropertyType(first: HasPropertyTypeLike, second: HasPropertyTypeLike): boolean {
  return first.propertyType === second.propertyType
}

export function equalsByRequired(first: HasRequiredLike, second: HasRequiredLike): boolean {
  return first.required === second.required
}

export function equalsByDeprecation(first: HasDeprecationLike, second: HasDeprecationLike): boolean {
  return first.deprecated === second.deprecated
}

export function equalsByPropertyTypeDeprecation(first: HasPropertyTypeDeprecationLike, second: HasPropertyTypeDeprecationLike): boolean {
  return first.propertyTypeDeprecated === second.propertyTypeDeprecated
}

export function equalsByPrimary(first: HasPrimaryLike, second: HasPrimaryLike): boolean {
  return first.primary === second.primary
}

export function equalsByReferenceFromGroupToClass(first: HasReferenceFromGroupToClassLike, second: HasReferenceFromGroupToClassLike): boolean {
  return first.includedClass.key === second.includedClass.key
    && first.propertyGroup.key === second.propertyGroup.key
}

export function equalsByHasReferenceFromPropertyToClass(first: HasReferenceFromPropertyToClassLike, second: HasReferenceFromPropertyToClassLike): boolean {
  return first.referenceClass.key === second.referenceClass.key
    && first.leafProperty.key === second.leafProperty.key
}
