import { IModelStatePropNode } from "@netcracker/qubership-apihub-api-state-model"
import { safePropertyIn } from '../common/objects'

const OBSERVED_VISIBLE_ANNOTATIONS_AND_VALIDATIONS: Record<'openapi' | 'graphapi', string[]> = {
  // unused now
  openapi: [
    'description',
    'enum',
    'default',
    'minProperties',
    'maxProperties',
    'minItems', 'maxItems',
    'minLength',
    'maxLength',
    'minimum',
    'exclusiveMinimum',
    'maximum',
    'exclusiveMaximum',
  ],
  // used now
  graphapi: ['description', 'deprecationReason', 'values', 'default']
}

export function hasChildren(stateNode?: IModelStatePropNode<any>): boolean {
  return !!stateNode?.children?.length
}

export function hasAnnotationsOrValidations(
  kind: 'openapi' | 'graphapi',
  stateNode?: IModelStatePropNode<any>,
): boolean {
  if (!stateNode) {
    return false
  }
  const nodeValue = stateNode.value
  const nodeMeta = stateNode.meta
  if (!nodeValue && !nodeMeta) {
    return false
  }
  for (const field of OBSERVED_VISIBLE_ANNOTATIONS_AND_VALIDATIONS[kind]) {
    if (
      safePropertyIn(nodeValue, field, 'hasAnnotationsOrValidations') ||
      safePropertyIn(nodeMeta, field, 'hasAnnotationsOrValidations')
    ) {
      return true
    }
  }
  return false
}