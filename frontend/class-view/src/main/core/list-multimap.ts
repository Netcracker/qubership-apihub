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

import { isDefine } from 'main/core/utils'

export class ListMultimap<K, V> {
  private readonly _map: Map<K, V[]>

  constructor() {
    this._map = new Map()
  }

  public clear(): void {
    this._map.clear()
  }

  public deleteAllByKey(key: K): boolean {
    return this._map.delete(key)
  }

  public delete(key: K, value: V): boolean {
    const list = this._map.get(key)
    if (!isDefine(list)) {
      return false
    }
    const index = list.indexOf(value)
    if (index < 0) {
      return false
    }
    list.splice(index, 1)
    return true
  }

  public get(key: K): V[] {
    return this._map.get(key) || []
  }

  public has(key: K): boolean {
    return this._map.has(key)
  }

  public set(key: K, value: V): this {
    const collector = this._map.get(key)
    if (isDefine(collector)) {
      collector.push(value)
    } else {
      this._map.set(key, [value])
    }
    return this
  }

  public values(): V[] {
    return [...this._map.values()].flatMap(value => value)
  }

  public forEach(f: (value: V, key: K) => void): void {
    this._map.forEach((values, key) => {
      values.forEach(value => f(value, key))
    })
  }

  public toMap(): Map<K, V[]> {
    return new Map(this._map)
  }
}