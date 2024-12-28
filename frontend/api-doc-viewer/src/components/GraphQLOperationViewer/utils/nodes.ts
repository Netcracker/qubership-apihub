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

import { graphApiNodeKind, graphSchemaNodeKind, IModelTreeNode } from '@netcracker/qubership-apihub-api-data-model'

// FIXME 14.11.23 // Extend basic method implementation

export function isOperationNode(node?: IModelTreeNode<any, any, any> | null): boolean {
  return (
    matchNodeKind(graphApiNodeKind.query, node) ||
    matchNodeKind(graphApiNodeKind.mutation, node) ||
    matchNodeKind(graphApiNodeKind.subscription, node)
  )
}

export function isPropertyNode(node?: IModelTreeNode<any, any, any> | null): boolean {
  return matchNodeKind(graphSchemaNodeKind.property, node)
}

export function isDirectiveNode(node?: IModelTreeNode<any, any, any> | null): boolean {
  return matchNodeKind(graphSchemaNodeKind.directive, node)
}

export function matchNodeKind(kind: string, node?: IModelTreeNode<any, any, any> | null): boolean {
  return !!node && !!kind && node.kind === kind
}