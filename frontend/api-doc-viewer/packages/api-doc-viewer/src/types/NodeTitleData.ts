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

import { GraphApiDiffTreeNode, GraphApiTreeNode, JsonSchemaDiffTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import { BadgeKind } from '../components/kit/ux/types'

export type NodeTitleData = Partial<{
  title: string | number
  required: boolean
  nullable: boolean
  isBadge: boolean
  badgeKind: BadgeKind
  isIndex: boolean
  isDirective: boolean
}>

type NodeTitleDataOptions<T> = {
  node: T | null
  nodeValue?: unknown
  nodeMeta?: unknown
  titleMappings?: Record<string, string>
}

export type JsonNodeTitleDataOptions = NodeTitleDataOptions<JsonSchemaDiffTreeNode>

export type GraphNodeTitleDataOptions = NodeTitleDataOptions<GraphApiDiffTreeNode | GraphApiTreeNode>
