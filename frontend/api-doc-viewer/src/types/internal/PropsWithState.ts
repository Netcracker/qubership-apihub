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

import { IModelStateCombinaryNode, IModelStatePropNode } from '../../api-model-state'
import { GraphApiDiffTreeNode, GraphApiTreeNode, JsonSchemaDiffTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import { AnyTreeNode } from '../aliases/nodes'

export type GraphPropNodePropsWithState = {
  state: IModelStatePropNode<GraphApiDiffTreeNode> | IModelStatePropNode<GraphApiTreeNode>
}
export type GraphCombinerNodePropsWithState = {
  state: IModelStateCombinaryNode<GraphApiDiffTreeNode> | IModelStateCombinaryNode<GraphApiTreeNode>
}
export type AnyNodePropsWithState = {
  state: IModelStatePropNode<AnyTreeNode>
}
export type JsonPropNodePropsWithState = {
  state: IModelStatePropNode<JsonSchemaDiffTreeNode>
}
export type JsonCombinerNodePropsWithState = {
  state: IModelStateCombinaryNode<JsonSchemaDiffTreeNode>
}
// TODO 05.10.23 // This has been added until REST API operation is rendered by ADV
export type PropsWithOverriddenKind = {
  overriddenKind?: 'parameters'
}
export type PropsWithDisabledNestingIndicatorTitle = {
  disableNestingHeader: boolean
}