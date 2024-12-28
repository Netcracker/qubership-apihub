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

import type { Optional } from './visitor-utils'
import type { SchemaClass, SchemaGraphObject, SchemaPropertiesGroup, SchemaProperty } from './schema-graph-content'
import { isSchemaClass, isSchemaPropertyOrPropertyGroup } from './schema-graph-content'

type Mutable<T> = {
  -readonly [K in keyof T]: T[K]
}
export type CachedGraphObject<T extends SchemaGraphObject = SchemaClass | SchemaProperty | SchemaPropertiesGroup> = {
  originalObject: Mutable<T>
}

export class VisitorObjectMap {
  private pathToObjectMap: Map<string, CachedGraphObject> = new Map()

  add(key: string, value: SchemaClass | SchemaProperty | SchemaPropertiesGroup): void {
    if (!this.pathToObjectMap.has(key)) {
      this.pathToObjectMap.set(key, {
        originalObject: value,
      })
    }
  }

  has(key: string): boolean {
    return this.pathToObjectMap.has(key)
  }

  getClass(key: string): Optional<CachedGraphObject<SchemaClass>> {
    const classLike = this.pathToObjectMap.get(key)

    return classLike && isSchemaClass(classLike?.originalObject)
      ? classLike as CachedGraphObject<SchemaClass>
      : null
  }

  getProperty(key: string): Optional<CachedGraphObject<SchemaProperty>> {
    const classOrProperty = this.pathToObjectMap.get(key)
    return classOrProperty && isSchemaPropertyOrPropertyGroup(classOrProperty?.originalObject)
      ? classOrProperty as CachedGraphObject<SchemaProperty>
      : null
  }
}
