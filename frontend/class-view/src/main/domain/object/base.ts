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
import { ClassObject } from 'main/domain/object/class'
import { LeafPropertyObject } from 'main/domain/object/leaf-property'
import { PropertiesGroupObject } from 'main/domain/object/properties-group'
import { Shape } from 'main/domain/object/shape'

export interface HasIdentity {
  readonly key?: Key;
}

export interface HasName {
  readonly name?: Optional<OneLineText>;
}

export interface HasPropertyType {
  readonly propertyType?: Optional<OneLineText>;
}

export interface HasProperties<Property> {
  readonly properties?: Optional<Property[]>;
}

export interface HasPrimary {
  readonly primary?: boolean;
}

export interface HasRequired {
  readonly required?: boolean;
}

export interface HasDeprecation {
  readonly deprecated?: Optional<boolean>;
}

export interface HasPropertyTypeDeprecation {
  readonly propertyTypeDeprecated?: Optional<boolean>;
}

export interface HasShape {
  readonly shape?: Optional<Shape>;
}

export interface HasReferenceFromGroupToClass {
  readonly includedClassKey?: ClassObject<never>['key'];
  readonly propertyGroupKey?: PropertiesGroupObject<never>['key'];
}

export interface HasReferenceFromPropertyToClass {
  readonly leafPropertyKey?: LeafPropertyObject['key'];
  readonly referenceClassKey?: ClassObject<never>['key'];
}

export interface HasPropertyKind {
  readonly kind: typeof PROPERTY_TYPE_LEAF | typeof PROPERTY_TYPE_GROUP
}

export interface HasReferenceKind {
  readonly kind: typeof RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE | typeof RELATION_TYPE_INCLUDE_PROPERTIES_GROUP
}

export const PROPERTY_TYPE_LEAF = 'property'
export const PROPERTY_TYPE_GROUP = 'group'

export const RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE = 'property-to-class-reference'
export const RELATION_TYPE_INCLUDE_PROPERTIES_GROUP = 'include-group'