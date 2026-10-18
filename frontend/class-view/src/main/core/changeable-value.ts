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

import { shallowEqual } from 'fast-equals'

export interface ChangeableValue<Value> {
  readonly value: Value;

  readonly dirty: boolean;

  readonly lastAppliedValue: Value

  changeValue(newValue: Value): boolean;

  valueApplied(): void;
}

abstract class AbstractChangeableValue<Value> implements ChangeableValue<Value> {
  private _dirty: boolean
  private _value: Value
  private _lastAppliedValue: Value

  protected constructor(initialValue: Value) {
    this._value = initialValue
    this._lastAppliedValue = initialValue
    this._dirty = true
  }

  get dirty(): boolean {
    return this._dirty
  }

  get value(): Value {
    return this._value
  }

  get lastAppliedValue(): Value {
    return this._lastAppliedValue
  }

  public changeValue(newValue: Value): boolean {
    if (this.valuesEquals(newValue, this._lastAppliedValue)) {
      this._value = this._lastAppliedValue
      this._dirty = false
      return false
    }
    this._value = newValue
    this._dirty = true
    return true
  }

  protected abstract valuesEquals(newValue: Value, oldValue: Value): boolean

  public valueApplied(): void {
    this._dirty = false
    this._lastAppliedValue = this._value
  }

  public cancel(): void {
    this._dirty = false
    this._value = this._lastAppliedValue
  }
}

export class AlwaysUniqueChangeableValue<Value> extends AbstractChangeableValue<Value> {
  constructor(initialValue: Value) {
    super(initialValue)
  }

  protected valuesEquals(): boolean {
    return false
  }
}

export class SimpleChangeableValue<Value> extends AbstractChangeableValue<Value> {
  constructor(initialValue: Value) {
    super(initialValue)
  }

  protected valuesEquals(newValue: Value, oldValue: Value): boolean {
    return shallowEqual(newValue, oldValue)
  }
}

export class CustomEqualityChangeableValue<Value> extends AbstractChangeableValue<Value> {
  private readonly _equalsFunction: (newValue: Value, oldValue: Value) => boolean

  constructor(initialValue: Value, equalsFunction: (newValue: Value, oldValue: Value) => boolean) {
    super(initialValue)
    this._equalsFunction = equalsFunction
  }

  protected valuesEquals(newValue: Value, oldValue: Value): boolean {
    return this._equalsFunction(newValue, oldValue)
  }
}

export function applyCombinedLatest<A, B>(a: ChangeableValue<A>, b: ChangeableValue<B>, apply: (a: A, b: B) => void): boolean {
  const aDirty = a.dirty
  const bDirty = b.dirty
  if (aDirty || bDirty) {
    apply(a.value, b.value)
    if (aDirty) {
      a.valueApplied()
    }
    if (bDirty) {
      b.valueApplied()
    }
  }
  return aDirty || bDirty
}
