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

import { Key, OneLineText, Optional } from 'main/domain/base'
import { LikeType } from 'main/domain/like/type'
import { ClassLike } from 'main/domain/like/class'
import { LeafPropertyLike } from 'main/domain/like/leaf-property'
import { PropertiesGroupLike } from 'main/domain/like/properties-group'
import { Shape } from 'main/domain'

export interface HasIdentityLike {
  readonly key: Key;
}

export interface HasTypeLike<Type extends LikeType> {
  readonly type: Type;
}

export interface HasNameLike {
  readonly name: OneLineText;
}

export interface HasPropertyTypeLike {
  readonly propertyType: OneLineText;
}

export interface HasPropertiesLike<Property> {
  readonly properties: Property[];
}

export interface HasPrimaryLike {
  readonly primary: boolean;
}

export interface HasRequiredLike {
  readonly required: boolean;
}

export interface HasDeprecationLike {
  readonly deprecated?: Optional<boolean>;
}

export interface HasPropertyTypeDeprecationLike {
  readonly propertyTypeDeprecated?: Optional<boolean>;
}

export interface HasShapeLike {
  readonly shape?: Optional<Shape>;
}

export interface HasReferenceFromGroupToClassLike {
  readonly includedClass: ClassLike;
  readonly propertyGroup: PropertiesGroupLike;
}

export interface HasReferenceFromPropertyToClassLike {
  readonly leafProperty: LeafPropertyLike;
  readonly referenceClass: ClassLike;
}

