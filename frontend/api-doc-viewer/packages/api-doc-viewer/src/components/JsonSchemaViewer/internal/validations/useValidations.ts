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
  IJsonSchemaArrayType,
  IJsonSchemaBaseType,
  IJsonSchemaNumberType,
  IJsonSchemaObjectType,
  IJsonSchemaStringType,
  JsonSchemaDiffNodeValue,
  JsonSchemaDiffTreeNode,
} from '@netcracker/qubership-apihub-api-data-model'
import { isDefined } from '../../../../utils/common/checkers'

export type UseValidationsReturnType = Partial<{
  any: {
    allowedValues?: unknown[]
  },
  string: {
    minLength?: number
    maxLength?: number
    pattern?: string
  },
  number: {
    minimum?: number
    maximum?: number
    exclusiveMinimum?: number
    exclusiveMaximum?: number
    multipleOf?: number
  },
  object: {
    allowedPropertyNames?: unknown[]
    minProperties?: number
    maxProperties?: number
  },
  array: {
    uniqueItems?: boolean
    minItems?: number
    maxItems?: number
  }
}>

export function useValidations(
  node?: JsonSchemaDiffTreeNode | null,
  nodeValue?: JsonSchemaDiffNodeValue | any | null,
): UseValidationsReturnType {
  if (!nodeValue) {
    return {}
  }

  // Any
  const allowedValues = (nodeValue as IJsonSchemaBaseType)?.enum
  // String
  const minLength = (nodeValue as IJsonSchemaStringType)?.minLength
  const maxLength = (nodeValue as IJsonSchemaStringType)?.maxLength
  const pattern = (nodeValue as IJsonSchemaStringType)?.pattern
  // Number
  const numberNodeValue = (nodeValue as IJsonSchemaNumberType)
  const exclusiveMinimum =
    numberNodeValue?.exclusiveMinimum && isDefined(numberNodeValue?.minimum)
      ? numberNodeValue.minimum
      : undefined
  const exclusiveMaximum =
    numberNodeValue?.exclusiveMaximum && isDefined(numberNodeValue?.maximum)
      ? numberNodeValue.maximum
      : undefined
  const minimum = exclusiveMinimum ? undefined : numberNodeValue?.minimum
  const maximum = exclusiveMaximum ? undefined : numberNodeValue?.maximum
  const multipleOf = numberNodeValue?.multipleOf
  // Object
  // FIXME 20.10.23 // Possible problems here in combiner nodes
  const allowedPropertyNames = (node?.parent?.value() as IJsonSchemaObjectType)?.propertyNames?.enum
  const minProperties = (nodeValue as IJsonSchemaObjectType)?.minProperties
  const maxProperties = (nodeValue as IJsonSchemaObjectType)?.maxProperties
  // Array
  const uniqueItems = (nodeValue as IJsonSchemaArrayType)?.uniqueItems
  const minItems = (nodeValue as IJsonSchemaArrayType)?.minItems
  const maxItems = (nodeValue as IJsonSchemaArrayType)?.maxItems

  return {
    any: {
      allowedValues
    },
    string: {
      minLength,
      maxLength,
      pattern
    },
    number: {
      minimum,
      maximum,
      exclusiveMinimum,
      exclusiveMaximum,
      multipleOf
    },
    object: {
      allowedPropertyNames,
      minProperties,
      maxProperties
    },
    array: {
      uniqueItems,
      minItems,
      maxItems
    }
  }
}