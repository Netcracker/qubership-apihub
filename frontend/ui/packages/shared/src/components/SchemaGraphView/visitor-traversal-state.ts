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

import type { VisitorJsonPath } from '@netcracker/qubership-apihub-api-visitor'
import type { Optional } from './visitor-utils'
import { shallowEqual } from 'fast-equals'
import { getLastItem } from '../../utils/arrays'

export class VisitorTraversalState {
  private readonly _currentSchema: VisitorJsonPath[]
  private readonly _currentSchemaProperty: VisitorJsonPath[]
  private readonly _currentCombiner: VisitorJsonPath[]

  private _combinerItem: Optional<VisitorJsonPath>
  private _hasReference: boolean = false
  private _shouldSkipAllOfItem: boolean = false

  private _foundPath: Optional<VisitorJsonPath>

  constructor() {
    this._currentSchema = []
    this._currentSchemaProperty = []
    this._currentCombiner = []
  }

  get currentLeafProperty(): VisitorJsonPath {
    let propertyPath: VisitorJsonPath = []

    for (let i = this._currentSchemaProperty.length - 1; i >= 0; i--) {
      if (getLastItem(this._currentSchemaProperty[i]) === PROPERTY_SUFFIX) {
        propertyPath = this._currentSchemaProperty[i]
        break
      }
    }

    return propertyPath ?? []
  }

  get currentSchema(): VisitorJsonPath {
    return getLastItem(this._currentSchema) ?? []
  }

  get currentSchemaProperty(): VisitorJsonPath {
    return getLastItem(this._currentSchemaProperty) ?? []
  }

  get currentCombiner(): VisitorJsonPath {
    return getLastItem(this._currentCombiner) ?? []
  }

  get combinerItem(): Optional<VisitorJsonPath> {
    return this._combinerItem
  }

  get hasReference(): boolean {
    return this._hasReference
  }

  get shouldSkipAllOfItem(): boolean {
    return this._shouldSkipAllOfItem
  }

  get foundPath(): Optional<VisitorJsonPath> {
    return this._foundPath
  }

  addSchema(value: Optional<VisitorJsonPath>): void {
    if (value) {
      this._currentSchema.push(value)
    }
  }

  removeSchema(path: VisitorJsonPath, condition = true): void {
    shallowEqual(path, this.currentSchema) && condition && this._currentSchema.pop()
  }

  addSchemaProperty(value: Optional<VisitorJsonPath>, condition = true): void {
    if (value && condition) {
      this._currentSchemaProperty.push([...value, PROPERTY_SUFFIX])
    }
  }

  addPropertyGroup(value: Optional<VisitorJsonPath>, propertyName: string, condition = true): void {
    if (value && condition) {
      this._currentSchemaProperty.push([...value, PROPERTY_GROUP_SUFFIX, propertyName])
    }
  }

  removePropertyGroup(path: VisitorJsonPath, condition = true): void {
    const equal = shallowEqual(path, this.currentSchemaProperty.slice(0, -2))
    equal && condition && this._currentSchemaProperty.pop()
  }

  removeSchemaProperty(path: VisitorJsonPath): void {
    const equal = shallowEqual(path, this.currentSchemaProperty.slice(0, -1))
    equal && this._currentSchemaProperty.pop()
  }

  addCombiner(value: Optional<VisitorJsonPath>): void {
    if (value) {
      this._currentCombiner.push(value)
    }
  }

  removeCombiner(path: VisitorJsonPath): void {
    shallowEqual(path, this.currentSchema) && this._currentCombiner.pop()
  }

  setCombinerItem(value: VisitorJsonPath, condition = true): void {
    if (condition) {
      this._combinerItem = value
    }
  }

  removeCombinerItem(): void {
    this._combinerItem = undefined
  }

  setHasReference(value: boolean): void {
    this._hasReference = value
  }

  setShouldSkipAllOfItem(value: boolean): void {
    this._shouldSkipAllOfItem = value
  }

  setFoundPath(value: VisitorJsonPath | null): void {
    this._foundPath = value
  }

  printCurrentSchemas(): void {
    for (const schema of this._currentSchema) {
      console.log(schema)
    }
  }
}

export const PROPERTY_SUFFIX = '$property'
export const PROPERTY_GROUP_SUFFIX = '$propertyGroup'
