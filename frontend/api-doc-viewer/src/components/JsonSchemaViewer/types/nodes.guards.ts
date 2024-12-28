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

import { IModelTreeNode, JsonSchemaTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import {
  IModelStateCombinaryNode,
  IModelStateNode,
  IModelStatePropNode,
  modelStateNodeType
} from '../../../api-model-state'

export function isPropNodeState<T extends IModelTreeNode<any, any, any> = JsonSchemaTreeNode>(
  state: IModelStateNode<T> | null
): state is IModelStatePropNode<T> {
  const { basic, expandable } = modelStateNodeType
  return !!state && (state.type === basic || state.type === expandable)
}

export function isCombinerNodeState<T extends IModelTreeNode<any, any, any> = JsonSchemaTreeNode>(
  state: IModelStateNode<T> | null
): state is IModelStateCombinaryNode<T> {
  return !!state && state.type === modelStateNodeType.combinary
}