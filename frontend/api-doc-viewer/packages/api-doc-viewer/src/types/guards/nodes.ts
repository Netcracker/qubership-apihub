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

import {
  GraphApiDiffNodeMeta,
  GraphApiDiffTreeNode,
  GraphApiTreeNode,
  GraphSchemaDiffNodeValue,
  JsonSchemaDiffNodeMeta,
  JsonSchemaDiffNodeValue,
  JsonSchemaDiffTreeNode,
} from '@netcracker/qubership-apihub-api-data-model'
import {
  IModelStateCombinaryNode,
  IModelStateNode,
  IModelStatePropNode,
  modelStateNodeType
} from '@netcracker/qubership-apihub-api-state-model'
import { AnyTreeNode, AnyTreeNodeMeta, AnyTreeNodeValue } from '../aliases/nodes'

export function isRefNode(
  node: AnyTreeNode | null
): boolean {
  const nodeMeta = node?.meta
  return !!nodeMeta && typeof nodeMeta === 'object' && 'brokenRef' in nodeMeta
}

export function isDiffNodeValue(
  value?: AnyTreeNodeValue
): value is JsonSchemaDiffNodeValue | GraphSchemaDiffNodeValue {
  if (!value) {
    return false
  }

  const castedValue = value as JsonSchemaDiffNodeValue | GraphSchemaDiffNodeValue
  return !!castedValue.$changes
}

export function isDiffNodeMeta(
  meta?: AnyTreeNodeMeta
): meta is JsonSchemaDiffNodeMeta | GraphApiDiffNodeMeta {
  if (!meta) {
    return false
  }

  const castedMeta = meta as JsonSchemaDiffNodeMeta | GraphApiDiffNodeMeta
  return !!(/* castedMeta.$nodeChangesSummary || */
    castedMeta.$nodeChange || castedMeta.$metaChanges
    || castedMeta.$childrenChanges || castedMeta.$nestedChanges)
}

export function isPropNodeState(
  state:
    | IModelStateNode<JsonSchemaDiffTreeNode>
    | IModelStateNode<GraphApiDiffTreeNode>
    | IModelStateNode<GraphApiTreeNode>
    | null
): state is
  | IModelStatePropNode<JsonSchemaDiffTreeNode>
  | IModelStatePropNode<GraphApiDiffTreeNode>
  | IModelStatePropNode<GraphApiTreeNode> {

  const { basic, expandable } = modelStateNodeType
  return !!state && (state.type === basic || state.type === expandable)
}

export function isCombinerNodeState(
  state:
    | IModelStateNode<JsonSchemaDiffTreeNode>
    | IModelStateNode<GraphApiDiffTreeNode>
    | IModelStateNode<GraphApiTreeNode>
    | null
): state is
  | IModelStateCombinaryNode<JsonSchemaDiffTreeNode>
  | IModelStateCombinaryNode<GraphApiDiffTreeNode>
  | IModelStateCombinaryNode<GraphApiTreeNode> {

  return !!state && state.type === modelStateNodeType.combinary
}