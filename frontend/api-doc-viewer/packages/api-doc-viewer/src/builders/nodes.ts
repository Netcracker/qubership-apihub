import {
  GraphApiDiffNodeMeta,
  GraphSchemaDiffNodeValue,
  ISchemaStringType,
} from '@netcracker/qubership-apihub-api-data-model'
import { BADGE_KIND_ALTERNATIVE_INFO, BADGE_KIND_INFO } from '../components/kit/ux/UxBadge/types'
import { UNKNOWN_TYPE_TEXT } from '../consts/types'
import { GraphNodeTitleDataOptions, NodeTitleData, } from '../types/NodeTitleData'
import { GraphNodeTypeDataOptions, NodeTypeData } from '../types/NodeTypeData'
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

export function buildNodeTitleData(
  options: GraphNodeTitleDataOptions
): NodeTitleData {
  const { node, nodeValue, nodeMeta, titleMappings, customizationOptions = {} } = options

  if (!node) {
    return {}
  }

  const nodeKey = node.key
  const $nodeValue = nodeValue as GraphSchemaDiffNodeValue
  const $nodeMeta = nodeMeta as GraphApiDiffNodeMeta

  const { root, additionalProperty, items, additionalItem, item, directive } = {
    root: isRootNode(node),
    additionalProperty: isAdditionalPropertyNode(node) || isPatternPropertyNode(node),
    items: isItemsNode(node),
    additionalItem: isAdditionalItemsNode(node),
    item: isItemNode(node),
    directive: isDirectiveUsageNode(node),
  }

  const data: NodeTitleData = {
    title: nodeKey ?? $nodeValue?.title,
    required: ($nodeMeta as { required?: boolean })?.required,
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
    data.title = customizationOptions.headerRowTitle || 'Type: '
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

export function buildNodeTypeData(options: GraphNodeTypeDataOptions): NodeTypeData | null {
  const { state, node: originalNode, nodeValue: originalValue } = options

  if ((originalNode?.kind as string) === 'additionalProperties' && typeof originalValue === 'boolean') {
    return null
  }

  const isCombiner = isCombinerNode(originalNode)
  const node = isCombiner && originalNode ? originalNode.nestedNode(state?.selected) : originalNode
  const nodeValue = originalValue ?? node?.value()
  const $nodeValue = nodeValue as GraphSchemaDiffNodeValue

  const brokenRef = isRefNode(node)
    ? `${(node!.meta as { brokenRef: string }).brokenRef}`
    : undefined
  const type = brokenRef ? `$ref: ${brokenRef}` : $nodeValue?.type ?? UNKNOWN_TYPE_TEXT
  const nullable = $nodeValue?.nullable
  const title = $nodeValue?.title
  const qualifier = (nodeValue as ISchemaStringType)?.format
  const combiner = isCombiner ? originalNode?.type : ''

  return { brokenRef, type, nullable, title, qualifier, combiner }
}
