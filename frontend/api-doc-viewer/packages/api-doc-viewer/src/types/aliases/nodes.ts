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
  GraphApiDiffNodeData,
  GraphApiDiffNodeMeta,
  GraphApiNodeData,
  GraphApiNodeKind,
  GraphApiNodeMeta,
  GraphSchemaDiffNodeValue,
  GraphSchemaNodeValue,
  IModelTreeNode,
  JsonSchemaDiffNodeMeta,
  JsonSchemaDiffNodeValue,
  JsonSchemaNodeKind,
  JsonSchemaNodeMeta,
  JsonSchemaNodeValue,
} from '@netcracker/qubership-apihub-api-data-model'

export type NodeId = string
export type AnyTreeNode =
  | IModelTreeNode<JsonSchemaNodeValue, JsonSchemaNodeKind, JsonSchemaNodeMeta>
  | IModelTreeNode<JsonSchemaDiffNodeValue, JsonSchemaNodeKind, JsonSchemaDiffNodeMeta>
  | IModelTreeNode<GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta>
  | IModelTreeNode<GraphApiDiffNodeData, GraphApiNodeKind, GraphApiDiffNodeMeta>
export type AnyTreeNodeValue =
  | JsonSchemaDiffNodeValue
  | JsonSchemaNodeValue
  | GraphSchemaDiffNodeValue
  | GraphSchemaNodeValue
export type AnyTreeNodeMeta =
  | JsonSchemaDiffNodeMeta
  | JsonSchemaNodeMeta
  | GraphApiDiffNodeMeta
  | GraphApiNodeMeta
