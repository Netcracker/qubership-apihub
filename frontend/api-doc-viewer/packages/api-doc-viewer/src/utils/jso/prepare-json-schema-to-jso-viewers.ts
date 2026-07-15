import { DiffMetaKeys } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys"
import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { AsyncApiNodeJsoPropertyValueTypes } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-value-type"
import { JsoTreeNodeValueWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/jso/tree-with-diffs/node-value"
import { JsoTreeNodeValueBase } from "@netcracker/qubership-apihub-next-data-model/model/jso/tree/node-value"
import { isObject } from "@netcracker/qubership-apihub-next-data-model/utilities"
import { NodeKey } from "@netcracker/qubership-apihub-next-data-model/utility-types"

export function wrapJsonSchemaForViewer(
  nodeKey: NodeKey,
  schema: object | undefined,
): object | undefined {
  if (!schema) {
    return undefined
  }

  return {
    type: 'object',
    properties: {
      [nodeKey]: schema,
    },
  }
}

export function wrapJsonSchemaForDiffsViewer(
  nodeKey: NodeKey,
  schema: object | undefined,
  nodeValueDiff: ChangedPropertyMetaData | undefined,
  diffMetaKeys: DiffMetaKeys | undefined,
): object | undefined {
  if (!schema) {
    return undefined
  }

  const diff = nodeValueDiff?.data
  const diffsMetaKey = diffMetaKeys?.diffsMetaKey

  return {
    type: 'object',
    properties: {
      [nodeKey]: schema,
      ...(diff && diffsMetaKey ? { [diffsMetaKey]: { [nodeKey]: diff } } : {}),
    },
  }
}

export function prepareJsonSchemaForJsoViewer(
  nodeKey: NodeKey,
  nodeValue: JsoTreeNodeValueBase | null | undefined
): object | undefined {
  if (!nodeValue) {
    return undefined
  }

  if (nodeValue.valueType !== AsyncApiNodeJsoPropertyValueTypes.JSON_SCHEMA &&
    nodeValue.valueType !== AsyncApiNodeJsoPropertyValueTypes.MULTI_SCHEMA) {
    return undefined
  }

  return isObject(nodeValue.value)
    ? wrapJsonSchemaForViewer(nodeKey, nodeValue.value)
    : undefined
}

export function prepareJsonSchemaForJsoDiffsViewer(
  nodeKey: NodeKey,
  nodeValue: JsoTreeNodeValueWithDiffs | null | undefined,
  nodeValueDiff: ChangedPropertyMetaData | undefined,
  diffMetaKeys: DiffMetaKeys | undefined
): object | undefined {
  if (!nodeValue) {
    return undefined
  }

  if (nodeValue.before.valueType !== AsyncApiNodeJsoPropertyValueTypes.JSON_SCHEMA &&
    nodeValue.before.valueType !== AsyncApiNodeJsoPropertyValueTypes.MULTI_SCHEMA &&
    nodeValue.after.valueType !== AsyncApiNodeJsoPropertyValueTypes.JSON_SCHEMA &&
    nodeValue.after.valueType !== AsyncApiNodeJsoPropertyValueTypes.MULTI_SCHEMA) {
    return undefined
  }

  if ((
    nodeValue.before.valueType === AsyncApiNodeJsoPropertyValueTypes.JSON_SCHEMA ||
    nodeValue.before.valueType === AsyncApiNodeJsoPropertyValueTypes.MULTI_SCHEMA
  ) && isObject(nodeValue.before.value)) {
    return wrapJsonSchemaForDiffsViewer(nodeKey, nodeValue.before.value, nodeValueDiff, diffMetaKeys)
  }

  if ((
    nodeValue.after.valueType === AsyncApiNodeJsoPropertyValueTypes.JSON_SCHEMA ||
    nodeValue.after.valueType === AsyncApiNodeJsoPropertyValueTypes.MULTI_SCHEMA
  ) && isObject(nodeValue.after.value)) {
    return wrapJsonSchemaForDiffsViewer(nodeKey, nodeValue.after.value, nodeValueDiff, diffMetaKeys)
  }

  return undefined
}
