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

import { ClassObject } from 'main/domain/object/class'
import { LeafPropertyObject } from 'main/domain/object/leaf-property'
import { IncludePropertiesGroupRelationObject } from 'main/domain/object/include-properties-group-relation'
import { PropertyToClassRelationObject } from 'main/domain/object/property-to-class-reference-relation'
import { PropertiesGroupObject } from 'main/domain/object/properties-group'

export interface DomainMeta {
  readonly class: unknown;
  readonly leafProperty: unknown;
  readonly propertiesGroup: unknown;
  readonly propertyToClassRelation: unknown;
  readonly includeGroupFromClassRelation: unknown;
}

export interface DefaultDomainMeta extends DomainMeta {
  readonly class: ClassObject<PropertyObject<this>>;
  readonly leafProperty: LeafPropertyObject;
  readonly propertiesGroup: PropertiesGroupObject<this['leafProperty']>
  readonly propertyToClassRelation: PropertyToClassRelationObject;
  readonly includeGroupFromClassRelation: IncludePropertiesGroupRelationObject;
}

export type RelationObject<Meta extends DomainMeta> =
  Meta['includeGroupFromClassRelation']
  | Meta['propertyToClassRelation']
export type PropertyObject<Meta extends DomainMeta> = Meta['leafProperty'] | Meta['propertiesGroup']