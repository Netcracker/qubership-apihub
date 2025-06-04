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
  GraphSchemaDiffNodeValue,
  IJsonSchemaStringType,
  JsonSchemaDiffNodeMeta,
  JsonSchemaDiffNodeValue
} from '@netcracker/qubership-apihub-api-data-model'
import { isDirectiveNode } from '../components/GraphQLOperationViewer/utils/nodes'
import { BADGE_KIND_ALTERNATIVE_INFO, BADGE_KIND_INFO } from '../components/kit/ux/types'
import { UNKNOWN_TYPE_TEXT } from '../consts/types'
import { GraphNodeTitleDataOptions, JsonNodeTitleDataOptions, NodeTitleData, } from '../types/NodeTitleData'
import { GraphNodeTypeDataOptions, JsonNodeTypeDataOptions, NodeTypeData } from '../types/NodeTypeData'
import { isRefNode } from '../types/guards/nodes'
import {
  isAdditionalItemsNode,
  isAdditionalPropertyNode,
  isCombinerNode,
  isDirectiveUsageNode,
  isItemNode,
  isItemsNode,
  isPatternPropertyNode,
  isRootNode,
} from '../utils/nodes'

// TODO 01.12.23 // Is there the same function in "allof-merge" lib?

export function buildNodeTitleData(options: JsonNodeTitleDataOptions | GraphNodeTitleDataOptions): NodeTitleData {
  const { node, nodeValue, nodeMeta, titleMappings } = options

  if (!node) {
    return {}
  }

  const nodeKey = node.key
  const $nodeValue = nodeValue as JsonSchemaDiffNodeValue | GraphSchemaDiffNodeValue
  const $nodeMeta = nodeMeta as JsonSchemaDiffNodeMeta | GraphApiDiffNodeMeta

  const { root, additionalProperty, items, additionalItem, item, directive } = {
    root: isRootNode(node),
    additionalProperty: isAdditionalPropertyNode(node) || isPatternPropertyNode(node),
    items: isItemsNode(node),
    additionalItem: isAdditionalItemsNode(node),
    item: isItemNode(node),
    directive: isDirectiveNode(node) || isDirectiveUsageNode(node),
  }

  const data: NodeTitleData = {
    title: nodeKey ?? $nodeValue?.title,
    required: ($nodeMeta as JsonSchemaDiffNodeMeta)?.required,
    nullable: ($nodeValue as GraphSchemaDiffNodeValue)?.nullable,
    isBadge: additionalProperty || items || additionalItem,
    badgeKind: BADGE_KIND_INFO,
    isIndex: item,
    isDirective: directive,
  }

  // TODO 06.09.24 // Remove it
  if (titleMappings && data.title && data.title in titleMappings) {
    data.title = titleMappings[data.title]
  }

  if (root) {
    data.title = 'Type: '
  } else if (additionalProperty) {
    if (typeof nodeValue === 'boolean') {
      data.title = 'no additional properties'
      data.badgeKind = BADGE_KIND_ALTERNATIVE_INFO
    } else {
      data.title = 'additional property'
    }
  } else if (items) {
    data.title = 'item'
  } else if (additionalItem) {
    data.title = 'additional item'
  } else if (item) {
    data.title = nodeKey
  }

  return data
}

export function buildNodeTypeData(options: JsonNodeTypeDataOptions | GraphNodeTypeDataOptions): NodeTypeData | null {
  const { state, node: originalNode, nodeValue: originalValue } = options

  if (originalNode?.kind === 'additionalProperties' && typeof originalValue === 'boolean') {
    return null
  }

  const isCombiner = isCombinerNode(originalNode)
  const node = isCombiner && originalNode ? originalNode.nestedNode(state?.selected) : originalNode
  const nodeValue = originalValue ?? node?.value()
  const $nodeValue = nodeValue as JsonSchemaDiffNodeValue | GraphSchemaDiffNodeValue

  const brokenRef = isRefNode(node) && node?.meta && 'brokenRef' in node.meta ? `${node.meta.brokenRef}` : undefined
  const type = brokenRef ? `$ref: ${brokenRef}` : $nodeValue?.type ?? UNKNOWN_TYPE_TEXT
  const nullable = nodeValue?.nullable
  const entity = (nodeValue as IJsonSchemaStringType)?.format ?? $nodeValue?.title
  const combiner = isCombiner ? originalNode?.type : ''

  return { brokenRef, type, nullable, entity, combiner }
}