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

import { IModelStatePropNode } from "../../api-model-state/types/state"

const OBSERVED_VISIBLE_ANNOTATIONS_AND_VALIDATIONS: Record<'openapi' | 'graphapi', string[]> = {
  // unused now
  openapi: [
    'description',
    'enum',
    'default',
    'minProperties',
    'maxProperties',
    'minItems', 'maxItems',
    'minLength',
    'maxLength',
    'minimum',
    'exclusiveMinimum',
    'maximum',
    'exclusiveMaximum',
  ],
  // used now
  graphapi: ['description', 'deprecationReason', 'values', 'default']
}

export function hasChildren(stateNode?: IModelStatePropNode<any>): boolean {
  return !!stateNode?.children?.length
}

export function hasAnnotationsOrValidations(
  kind: 'openapi' | 'graphapi',
  stateNode?: IModelStatePropNode<any>,
): boolean {
  if (!stateNode) {
    return false
  }
  const nodeValue = stateNode.value
  const nodeMeta = stateNode.meta
  if (!nodeValue && !nodeMeta) {
    return false
  }
  for (const field of OBSERVED_VISIBLE_ANNOTATIONS_AND_VALIDATIONS[kind]) {
    if (field in nodeValue || field in nodeMeta) {
      return true
    }
  }
  return false
}