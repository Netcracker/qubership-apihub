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

import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { calculateObjectHash } from './hashes'
import { ChangeMessage } from '../types'
import { AFTER_VALUE_NORMALIZED_PROPERTY, BEFORE_VALUE_NORMALIZED_PROPERTY } from '../consts'

export function calculateDiffId(diff: Diff): string {
  const {
    scope,
    action,
    beforeDeclarationPaths: previousDeclarationJsonPaths = [],
    afterDeclarationPaths: currentDeclarationJsonPaths = [],
    beforeKey: previousKey = undefined,
    afterKey: currentKey = undefined,
    type: severity,
  } = { ...diff }

  const beforeValueNormalized = (diff as Record<symbol, unknown>)[BEFORE_VALUE_NORMALIZED_PROPERTY]
  const afterValueNormalized = (diff as Record<symbol, unknown>)[AFTER_VALUE_NORMALIZED_PROPERTY]

  return calculateChangeId({
    scope,
    action,
    previousDeclarationJsonPaths,
    currentDeclarationJsonPaths,
    previousValueHash: beforeValueNormalized !== undefined ? calculateObjectHash(beforeValueNormalized) : '',
    currentValueHash: afterValueNormalized !== undefined ? calculateObjectHash(afterValueNormalized) : '',
    previousKey,
    currentKey,
    severity,
  })
}

export function calculateChangeId(change: ChangeMessage): string {
  const {
    scope,
    previousDeclarationJsonPaths = [],
    currentDeclarationJsonPaths = [],
    previousValueHash = '',
    currentValueHash = '',
    previousKey = '',
    currentKey = '',
    severity,
  } = { ...change }

  const previousPaths = `[${previousDeclarationJsonPaths.map(path => `[${path.join()}]`).sort().join()}]`
  const currentPaths = `[${currentDeclarationJsonPaths.map(path => `[${path.join()}]`).sort().join()}]`

  return `${previousPaths}-${currentPaths}-${previousValueHash}-${currentValueHash}-${scope}-${previousKey}-${currentKey}-${severity}`
}
