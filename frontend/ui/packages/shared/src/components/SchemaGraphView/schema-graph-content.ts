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

import type {
  ContentObject,
  DomainMeta,
  PROPERTY_TYPE_GROUP,
  RELATION_TYPE_INCLUDE_PROPERTIES_GROUP,
} from '@netcracker/qubership-apihub-class-view'
import {
  PROPERTY_TYPE_LEAF,
} from '@netcracker/qubership-apihub-class-view'
import { RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE } from '@netcracker/qubership-apihub-class-view'
import type { OpenAPIV3 } from 'openapi-types'

export const SCHEMA_TYPE = 'schema'

export interface HasKey {
  readonly key: string
}

export interface HasName {
  readonly name: string
  readonly fooName: boolean
}

export interface HasDeprecation {
  readonly deprecated?: boolean
}

export interface HasProperties<T> {
  readonly properties?: T[]
}

export interface SchemaProperty extends HasKey, HasName, HasDeprecation {
  readonly kind: typeof PROPERTY_TYPE_LEAF
  readonly propertyType: string
  readonly propertyTypeDeprecated: boolean
  readonly required: boolean
  readonly schemaObject: OpenAPIV3.SchemaObject
  readonly sharedSchemaObjects: OpenAPIV3.SchemaObject[]
}

export interface SchemaPropertiesGroup extends HasKey, HasName, HasDeprecation, HasProperties<SchemaProperty> {
  readonly kind: typeof PROPERTY_TYPE_GROUP
}

export interface SchemaClass extends HasKey, HasName, HasDeprecation, HasProperties<SchemaProperty | SchemaPropertiesGroup> {
  readonly kind: typeof SCHEMA_TYPE
  readonly sameHashObjects: OpenAPIV3.SchemaObject[]
  readonly sharedSchemaObjects: OpenAPIV3.SchemaObject[]
  readonly isClass: boolean
}

export interface SchemaRelation {
  readonly kind: typeof RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE
  readonly referenceClassKey?: SchemaClass['key']
  readonly leafPropertyKey?: SchemaProperty['key']
  readonly primary?: boolean
}

export interface SchemaIncludeGroupRelation {
  readonly kind: typeof RELATION_TYPE_INCLUDE_PROPERTIES_GROUP
  readonly includedClassKey: SchemaClass['key']
  readonly propertyGroupKey: SchemaPropertiesGroup['key']
}

export interface SchemaGraphMeta extends DomainMeta {
  readonly class: SchemaClass
  readonly leafProperty: SchemaProperty
  readonly propertiesGroup: SchemaPropertiesGroup
  readonly propertyToClassRelation: SchemaRelation
  readonly includeGroupFromClassRelation: SchemaIncludeGroupRelation
}

export type SchemaGraphObject =
  | SchemaGraphMeta['class']
  | SchemaGraphMeta['leafProperty']
  | SchemaGraphMeta['propertiesGroup']
  | SchemaGraphMeta['propertyToClassRelation']
  | SchemaGraphMeta['includeGroupFromClassRelation']

export type SchemaGraphContent = ContentObject<SchemaGraphMeta>

export const UNKNOWN_SCHEMA_TYPE = 'unknown'

export function isNamedObject(object: SchemaGraphObject): object is SchemaClass | SchemaProperty | SchemaPropertiesGroup {
  return 'name' in object && 'fooName' in object && !object.fooName
}

export function isProperty(object: SchemaGraphObject): object is SchemaProperty {
  return object.kind === PROPERTY_TYPE_LEAF
}

export function isSchema(object: SchemaGraphObject): object is SchemaClass {
  return object.kind === SCHEMA_TYPE
}

export function isPropertyToClassRelation(object: SchemaGraphObject): object is SchemaRelation {
  return object.kind === RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE
}
