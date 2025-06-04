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
  DiffNodeValue,
  DiffRecord,
  GraphApiNodeData,
  GraphApiNodeMeta,
  graphSchemaNodeKind,
  GraphSchemaNodeType,
  GraphSchemaNodeValue,
  IJsonSchemaArrayType,
  IJsonSchemaBaseType,
  IJsonSchemaNumberType,
  IJsonSchemaObjectType,
  IJsonSchemaStringType,
  IModelTreeNode,
  isDiff,
  isGraphApiNodeType,
  isJsonSchemaNodeType,
  JsonSchemaDiffNodeMeta,
  JsonSchemaDiffNodeValue,
  JsonSchemaNodeKind,
  jsonSchemaNodeKind,
  JsonSchemaNodeMeta,
  JsonSchemaNodeType,
  JsonSchemaNodeValue,
  modelTreeNodeType,
} from '@netcracker/qubership-apihub-api-data-model'
import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { Dispatch, SetStateAction } from 'react'
import { IModelStatePropNode, modelStateNodeType } from '@netcracker/qubership-apihub-api-state-model'
import { INFINITY_EXPANDING_DEPTH } from '../consts/configuration'
import { AnyTreeNode } from '../types/aliases/nodes'
import { ExpandingMode } from '../types/internal/ExpandingMode'
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from '../types/internal/LayoutSide'
import { NodeType } from '../types/internal/NodeType'
import { ArrayUtils } from './common/arrays'
import { diffAdd, diffRemove, diffReplace } from './common/changes'

// State checkers

export function isExpandableStateNode(
  state: IModelStatePropNode<AnyTreeNode>
): boolean {
  return state.type === modelStateNodeType.expandable
}

// Kind checkers

export function isRootNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(jsonSchemaNodeKind.root, node) && !node?.isCycle
}

export function isArgumentsNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(graphSchemaNodeKind.args, node)
}

export function isArgumentNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(graphSchemaNodeKind.arg, node)
}

export function isUsedDirectivesNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(graphSchemaNodeKind.usedDirectives, node)
}

export function isDirectiveUsageNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(graphSchemaNodeKind.directiveUsage, node)
}

export function isOutputNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(graphSchemaNodeKind.output, node)
}

export function isPropertyNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(jsonSchemaNodeKind.property, node)
}

export function isAdditionalPropertyNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(jsonSchemaNodeKind.additionalProperties, node)
}

export function isPatternPropertyNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(jsonSchemaNodeKind.patternProperty, node)
}

export function isItemNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(jsonSchemaNodeKind.item, node)
}

export function isItemsNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(jsonSchemaNodeKind.items, node)
}

export function isAdditionalItemsNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(jsonSchemaNodeKind.additionalItems, node)
}

export function isOneOfItemNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(jsonSchemaNodeKind.oneOf, node)
}

export function isAnyOfItemNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(jsonSchemaNodeKind.anyOf, node)
}

export function isAllOfItemNode(node?: AnyTreeNode | null): boolean {
  return matchNodeKind(jsonSchemaNodeKind.allOf, node)
}

export function isCombinerNode(node?: AnyTreeNode | null): boolean {
  return isOneOfCombinerNode(node) || isAnyOfCombinerNode(node) || isAllOfCombinerNode(node)
}

export function isCombinerItemNode(node?: AnyTreeNode | null): boolean {
  return isOneOfItemNode(node) || isAnyOfItemNode(node) || isAllOfItemNode(node)
}

// Type checkers

export function isOneOfCombinerNode(node?: AnyTreeNode | null): boolean {
  return matchNodeType(modelTreeNodeType.oneOf, node)
}

export function isAnyOfCombinerNode(node?: AnyTreeNode | null): boolean {
  return matchNodeType(modelTreeNodeType.anyOf, node)
}

export function isAllOfCombinerNode(node?: AnyTreeNode | null): boolean {
  return matchNodeType(modelTreeNodeType.allOf, node)
}

// Value checkers

function getNodeTypeFromDiff(diff?: Diff | DiffRecord): JsonSchemaNodeType | GraphSchemaNodeType | undefined {
  return isDiff(diff) && diffReplace(diff) && (isJsonSchemaNodeType(diff.beforeValue) || isGraphApiNodeType(diff.beforeValue))
    ? diff.beforeValue
    : undefined
}

export function isPrimitiveValue(value?: JsonSchemaNodeValue | GraphSchemaNodeValue | GraphApiNodeData | null) {
  return isStringValue(value) || isNumberValue(value) || isBooleanValue(value)
}

export function isStringValue(value?: JsonSchemaNodeValue | GraphSchemaNodeValue | GraphApiNodeData | null) {
  const primaryType: JsonSchemaNodeType | GraphSchemaNodeType | null | undefined = (value as JsonSchemaNodeValue | GraphSchemaNodeValue)?.type
  const typeDiff = (value as DiffNodeValue)?.$changes?.type
  const previousType: JsonSchemaNodeType | GraphSchemaNodeType | null | undefined = getNodeTypeFromDiff(typeDiff)
  return [primaryType, previousType].includes(NodeType.String)
}

export function isNumberValue(value?: JsonSchemaNodeValue | GraphSchemaNodeValue | GraphApiNodeData | DiffNodeValue | null) {
  const primaryType: JsonSchemaNodeType | GraphSchemaNodeType | null | undefined = (value as JsonSchemaNodeValue | GraphSchemaNodeValue)?.type
  const typeDiff = (value as DiffNodeValue)?.$changes?.type
  const previousType: JsonSchemaNodeType | GraphSchemaNodeType | null | undefined = getNodeTypeFromDiff(typeDiff)
  return [primaryType, previousType].some(type => type === NodeType.Number || type === NodeType.Integer)
}

export function isBooleanValue(value?: JsonSchemaNodeValue | GraphSchemaNodeValue | GraphApiNodeData | null) {
  const primaryType: JsonSchemaNodeType | GraphSchemaNodeType | null | undefined = (value as JsonSchemaNodeValue | GraphSchemaNodeValue)?.type
  const typeDiff = (value as DiffNodeValue)?.$changes?.type
  const previousType: JsonSchemaNodeType | GraphSchemaNodeType | null | undefined = getNodeTypeFromDiff(typeDiff)
  return [primaryType, previousType].includes(NodeType.Boolean)
}

/*
FIXME 03.09.24
isObjectValue, isArrayValue and possibly other checker works wrong in case of
incorrect diff meta when under diff meta key we have Diff, not Record<PropertyKey, Diff>.
In that case it considers Diff's field "type" as node type and tries to check node value on it.

Case:
http://localhost:9009/?path=/story/openapi-compatibility-suite-request--update-media-type-of-request-body
 */
export function isObjectValue(value?: JsonSchemaNodeValue | GraphSchemaNodeValue | GraphApiNodeData | null) {
  const primaryType: JsonSchemaNodeType | GraphSchemaNodeType | null | undefined = (value as JsonSchemaNodeValue | GraphSchemaNodeValue)?.type
  const typeDiff = (value as DiffNodeValue)?.$changes?.type
  const previousType: JsonSchemaNodeType | GraphSchemaNodeType | null | undefined = getNodeTypeFromDiff(typeDiff)
  return [primaryType, previousType].includes(NodeType.Object)
}

export function isArrayValue(value?: JsonSchemaNodeValue | GraphSchemaNodeValue | GraphApiNodeData | null) {
  const primaryType: JsonSchemaNodeType | GraphSchemaNodeType | null | undefined = (value as JsonSchemaNodeValue | GraphSchemaNodeValue)?.type
  const typeDiff = (value as DiffNodeValue)?.$changes?.type
  const previousType: JsonSchemaNodeType | GraphSchemaNodeType | null | undefined = getNodeTypeFromDiff(typeDiff)
  return [primaryType, previousType].includes(NodeType.Array)
}

export function hasNoContent(node?: AnyTreeNode | null): boolean {
  const nodeValue = node?.value()
  const nodeMeta = node?.meta

  if (!nodeValue && !nodeMeta) {
    return true
  }

  return hasNoValidationsAndAnnotations(node) && ArrayUtils.isEmpty(node?.children())
}

export function hasNoValidationsAndAnnotations(node?: AnyTreeNode | null): boolean {
  const nodeValue = node?.value() as IJsonSchemaBaseType
  const nodeMeta = node?.meta as JsonSchemaNodeMeta | GraphApiNodeMeta

  if (!nodeValue && !nodeMeta) {
    return true
  }

  // No annotations
  const noAnnotations = !nodeValue?.description
    && !nodeValue?.default
    && ArrayUtils.isEmpty(nodeValue?.examples)
    // FIXME 05.11.24 // This is WRONG condition for REST API!
    && !(nodeMeta as GraphApiNodeMeta)?.deprecationReason

  // No validations
  let noValidations = true
  noValidations &&= ArrayUtils.isEmpty(nodeValue?.enum)
  noValidations &&= (nodeValue as IJsonSchemaStringType)?.minLength === undefined &&
    (nodeValue as IJsonSchemaStringType)?.maxLength === undefined
  noValidations &&= (nodeValue as IJsonSchemaNumberType)?.minimum === undefined &&
    (nodeValue as IJsonSchemaNumberType)?.maximum === undefined &&
    (nodeValue as IJsonSchemaNumberType)?.exclusiveMinimum === undefined &&
    (nodeValue as IJsonSchemaNumberType)?.exclusiveMaximum === undefined &&
    (nodeValue as IJsonSchemaNumberType)?.multipleOf === undefined
  noValidations &&=
    (nodeValue as IJsonSchemaObjectType)?.minProperties === undefined &&
    (nodeValue as IJsonSchemaObjectType)?.maxProperties === undefined
  noValidations &&= (nodeValue as IJsonSchemaArrayType)?.uniqueItems === undefined &&
    (nodeValue as IJsonSchemaArrayType)?.minItems === undefined &&
    (nodeValue as IJsonSchemaArrayType)?.maxItems === undefined

  const isPatternProperty = isPatternPropertyNode(node)
  const isAdditionalProperty = isAdditionalPropertyNode(node)
  const arePatternsProvidedIfNecessary = !isPatternProperty || !!node?.key
  const areAllowedPropertyNamesProvidedIfNecessary = !isAdditionalProperty || !!(node?.parent?.value() as IJsonSchemaObjectType)?.propertyNames

  let result = noAnnotations && noValidations

  if (isAdditionalProperty) {
    result &&= !areAllowedPropertyNamesProvidedIfNecessary
  }
  if (isPatternProperty) {
    result &&= !arePatternsProvidedIfNecessary
  }

  return result
}

// Handlers

export function onToggleExpander(
  state: IModelStatePropNode<AnyTreeNode>,
  reactStateCallback: Dispatch<SetStateAction<boolean>>,
  mode: ExpandingMode = 'default'
) {
  // TODO 27.09.23 // assumption that in future we possibly will expand until the leaves to show diffs
  const expandingDepth = mode === 'infinity' ? INFINITY_EXPANDING_DEPTH : undefined
  if (state.expanded) {
    state.collapse(expandingDepth)
  } else {
    state.expand(expandingDepth)
  }
  reactStateCallback(state.expanded)
}

export function onToggleSort(
  state: IModelStatePropNode<AnyTreeNode>,
  reactStateCallback: Dispatch<SetStateAction<number>>
) {
  state.sort(state.sorted ? 0 : 1)
  reactStateCallback(state.sorted)
}

export function matchNodeKind(kind: string, node?: AnyTreeNode | null): boolean {
  return !!node && !!kind && node.kind === kind
}

export function findNoSubHeaderSide(
  node: IModelTreeNode<JsonSchemaDiffNodeValue, JsonSchemaNodeKind, JsonSchemaDiffNodeMeta>
): LayoutSide | undefined {
  const container = node.container
  const nodeChange = node.meta.$nodeChange

  if (nodeChange) {
    if (diffAdd(nodeChange)) {
      return ORIGIN_LAYOUT_SIDE
    }
    if (diffRemove(nodeChange)) {
      return CHANGED_LAYOUT_SIDE
    }
  }

  if (container) {
    return findNoSubHeaderSide(container)
  }

  return undefined
}

// Private

function matchNodeType(type: string, node?: AnyTreeNode | null): boolean {
  return !!node && !!type && node.type === type
}