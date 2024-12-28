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

import { ClassLike } from 'main/domain/like/class'
import { LeafPropertyLike } from 'main/domain/like/leaf-property'
import { IncludePropertiesGroupRelationLike } from 'main/domain/like/include-properties-group-relation'
import { PropertyToClassRelationLike } from 'main/domain/like/property-to-class-reference-relation'
import { PropertiesGroupLike } from 'main/domain/like/properties-group'

export type DomainLike = ClassLike | PropertyLike | RelationLike
export type SelectableLike = DomainLike;
export type NavigableLike = DomainLike;

export type RelationLike = IncludePropertiesGroupRelationLike | PropertyToClassRelationLike
export type PropertyLike = LeafPropertyLike | PropertiesGroupLike