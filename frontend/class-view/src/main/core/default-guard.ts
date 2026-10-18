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

import { Color, Optional } from 'main/domain/base'
import { isDefine } from 'main/core/utils'

export function valueOrDefaultForGeneric<T>(value: Optional<T>, defaultValue: () => T): T {
  return isDefine(value) ? value : defaultValue()
}

export function valueOrDefaultForColor(value: Optional<Color>, defaultValue: () => Color): Color {
  // todo checks, logs
  return isDefine(value) ? value : defaultValue()
}

export function valueOrDefaultForNumber<T extends number>(value: Optional<T>, defaultValue: () => T): T {
  if (!isDefine(value) || !Number.isFinite(value)) {
    return defaultValue()
  }
  return value
}

export function valueOrDefaultForEnumType<T>(value: Optional<T>, allowedValues: T[], defaultValue: () => T): T {
  // todo logs
  if (!isDefine(value) || allowedValues.indexOf(value) < 0) {
    return defaultValue()
  }
  return value
}