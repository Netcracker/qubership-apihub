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

import { IJsonSchemaNumberType, isDiff, JsonSchemaDiffNodeMeta, JsonSchemaDiffNodeValue } from '@netcracker/qubership-apihub-api-data-model'
import type { FC } from 'react'
import {
  ADDITIONAL_PROPERTY_NAME_PATTERN_LABEL,
  ALLOWED_ADDITIONAL_PROPERTY_NAMES_LABEL,
  ALLOWED_VALUES_LABEL,
  ITEMS_COUNT_LABEL,
  PROPERTIES_COUNT_LABEL,
  UNIQUE_ITEMS_LABEL,
  VALUE_LENGTH_LABEL,
  VALUE_MULTIPLE_OF_LABEL,
  VALUE_PATTERN_LABEL,
  VALUE_RANGE_LABEL
} from '../../../../consts/validations'
import { useLayoutMode } from '../../../../contexts/LayoutModeContext'
import { useLevelContext } from '../../../../contexts/LevelContext'
import { PropsWithChanges } from '../../../../types/internal/PropsWithChanges'
import { PropsWithShift } from '../../../../types/internal/PropsWithShift'
import { JsonPropNodePropsWithState } from '../../../../types/internal/PropsWithState'
import { PropsWithoutChangesSummary } from '../../../../types/PropsWithoutChangesSummary'
import { filterChangeKeys, takeNodeChangeIfWholeNodeChanged } from '../../../../utils/common/changes'
import { isDefined } from '../../../../utils/common/checkers'
import {
  isAdditionalPropertyNode,
  isArrayValue,
  isNumberValue,
  isObjectValue,
  isPatternPropertyNode,
  isStringValue
} from '../../../../utils/nodes'
import { AdditionalInfoArrayRow } from '../../../common/AdditionalInfoArrayRow'
import { AdditionalInfoObjectRow } from '../../../common/AdditionalInfoObjectRow'
import { useValidations } from './useValidations'
import { useValueRangeValidation, ValueRangeDiffData, ValueRangeInitialData } from './useValueRangeValidation'

export type ValidationsProps = PropsWithoutChangesSummary<
  PropsWithShift &
  JsonPropNodePropsWithState &
  PropsWithChanges
>

const ChangesKeys = {
  valueLength: ['minLength', 'maxLength'],
  valuePattern: ['pattern'],
  valueRange: ['lower', 'upper'],
  multipleOf: ['multipleOf'],
  propertiesCount: ['minProperties', 'maxProperties'],
  itemsCount: ['minItems', 'maxItems'],
  uniqueItems: ['uniqueItems'],
}

export const Validations: FC<ValidationsProps> = (props) => {
  const {
    shift = false,
    state,
    $nodeChange,
  } = props
  const node = state.node
  const nodeMeta = state.meta
  const $nodeMeta = nodeMeta as JsonSchemaDiffNodeMeta
  const nodeValue = state.value
  const $nodeValue = nodeValue as JsonSchemaDiffNodeValue
  const parentNodeValue = state.parent?.value
  const $parentNodeValue = state.parent?.value as JsonSchemaDiffNodeValue
  const level = useLevelContext()

  const layoutMode = useLayoutMode()

  const isAdditionalProperty = isAdditionalPropertyNode(node)
  const isPatternProperty = isPatternPropertyNode(node)

  const isString = isStringValue(nodeValue)
  const isNumber = isNumberValue(nodeValue)
  const isArray = isArrayValue(nodeValue)
  // TODO 02.09.24 // Do we check parent node value due to pattern properties?
  const isObject = isObjectValue(nodeValue) || isObjectValue(parentNodeValue)

  const {
    any,
    string,
    number,
    object,
    array,
  } = useValidations(node, nodeValue)

  // Value Range begins
  const valueRangeData: ValueRangeInitialData = {
    minimum: (nodeValue as IJsonSchemaNumberType)?.minimum,
    exclusiveMinimum: Boolean((nodeValue as IJsonSchemaNumberType)?.exclusiveMinimum),
    maximum: (nodeValue as IJsonSchemaNumberType)?.maximum,
    exclusiveMaximum: Boolean((nodeValue as IJsonSchemaNumberType)?.exclusiveMaximum),
  }
  const diffForMinimum = $nodeValue?.$changes?.minimum
  const diffForExclusiveMinimum = $nodeValue?.$changes?.exclusiveMinimum
  const diffForMaximum = $nodeValue?.$changes?.maximum
  const diffForExclusiveMaximum = $nodeValue?.$changes?.exclusiveMaximum
  const valueRangeChanges: ValueRangeDiffData = {
    minimum: isDiff(diffForMinimum) ? diffForMinimum : undefined,
    exclusiveMinimum: isDiff(diffForExclusiveMinimum) ? diffForExclusiveMinimum : undefined,
    maximum: isDiff(diffForMaximum) ? diffForMaximum : undefined,
    exclusiveMaximum: isDiff(diffForExclusiveMaximum) ? diffForExclusiveMaximum : undefined,
  }
  const {
    data: valueRangeHandledData,
    changes: valueRangeHandledChanges,
    changesKeys: valueRangeChangeKeys,
    visible: valueRangeVisible
  } = useValueRangeValidation(valueRangeData, valueRangeChanges, ChangesKeys.valueRange)
  // Value Range ends

  // Other filtered changed fields keys
  const valueLengthChangeKeys = filterChangeKeys(string, ChangesKeys.valueLength)
  const valuePatternChangeKeys = filterChangeKeys(string, ChangesKeys.valuePattern)
  const multipleOfChangeKeys = filterChangeKeys(number, ChangesKeys.multipleOf)
  const propertiesCountChangeKeys = filterChangeKeys(object, ChangesKeys.propertiesCount)
  const uniqueItemsChangeKeys = filterChangeKeys(array, ChangesKeys.uniqueItems)
  const itemsCountChangeKeys = filterChangeKeys(array, ChangesKeys.itemsCount)
  // ---

  const $appliedNodeChange = takeNodeChangeIfWholeNodeChanged($nodeChange ?? $nodeMeta?.$nodeChange)

  return (
    <>
      {/* Any */}
      {any?.allowedValues && (
        <AdditionalInfoArrayRow
          shift={shift}
          $changesKey="enum"
          title={ALLOWED_VALUES_LABEL}
          items={any!.allowedValues}
          layoutMode={layoutMode}
          level={level}
          $nodeChange={$appliedNodeChange}
          $changes={$nodeValue?.$changes}
        />
      )}

      {/* String */}
      {isString && (
        <>
          {(isDefined(string?.minLength) || isDefined(string?.maxLength)) && (
            <AdditionalInfoObjectRow
              shift={shift}
              $changesKeys={valueLengthChangeKeys}
              title={VALUE_LENGTH_LABEL}
              items={{
                minLength: string?.minLength,
                maxLength: string?.maxLength
              }}
              layoutMode={layoutMode}
              level={level}
              $nodeChange={$appliedNodeChange}
              $changes={$nodeValue?.$changes}
            />
          )}
          {isDefined(string?.pattern) && (
            <AdditionalInfoObjectRow
              shift={shift}
              $changesKeys={valuePatternChangeKeys}
              title={VALUE_PATTERN_LABEL}
              items={{
                pattern: string?.pattern,
              }}
              layoutMode={layoutMode}
              level={level}
              $nodeChange={$appliedNodeChange}
              $changes={$nodeValue?.$changes}
            />
          )}
        </>
      )}

      {/* Number */}
      {isNumber && (
        <>
          {valueRangeVisible && (
            <AdditionalInfoObjectRow
              shift={shift}
              $changesKeys={valueRangeChangeKeys}
              title={VALUE_RANGE_LABEL}
              items={valueRangeHandledData}
              layoutMode={layoutMode}
              level={level}
              $nodeChange={$appliedNodeChange}
              $changes={valueRangeHandledChanges}
            />
          )}
          {isDefined(number?.multipleOf) && (
            <AdditionalInfoObjectRow
              shift={shift}
              $changesKeys={multipleOfChangeKeys}
              title={VALUE_MULTIPLE_OF_LABEL}
              items={{
                multipleOf: number?.multipleOf
              }}
              layoutMode={layoutMode}
              level={level}
              $nodeChange={$appliedNodeChange}
              $changes={$nodeValue?.$changes}
            />
          )}
        </>
      )}

      {/* Objects */}
      {isObject && (
        <>
          {/* TODO 03.11.23 // Update it when replacing of pattern properties is supported in api-smart-diff */}
          {/* TODO 03.06.24 // Provide validation with pattern definitely, even if display mode = "simple" */}
          {isPatternProperty && (
            <AdditionalInfoObjectRow
              shift={shift}
              $changesKeys={[]}
              title={ADDITIONAL_PROPERTY_NAME_PATTERN_LABEL}
              items={{
                additionalPropertyNamePattern: node!.key
              }}
              layoutMode={layoutMode}
              level={level}
              $nodeChange={$appliedNodeChange}
            />
          )}
          {isAdditionalProperty && object?.allowedPropertyNames && (
            <AdditionalInfoArrayRow
              shift={shift}
              $changesKey="propertyNames"
              title={ALLOWED_ADDITIONAL_PROPERTY_NAMES_LABEL}
              items={object!.allowedPropertyNames}
              layoutMode={layoutMode}
              level={level}
              $nodeChange={$appliedNodeChange}
              $changes={$parentNodeValue?.$changes}
            />
          )}
          {(isDefined(object?.minProperties) || isDefined(object?.maxProperties)) && (
            <AdditionalInfoObjectRow
              shift={shift}
              $changesKeys={propertiesCountChangeKeys}
              title={PROPERTIES_COUNT_LABEL}
              items={{
                minProperties: object?.minProperties,
                maxProperties: object?.maxProperties,
              }}
              layoutMode={layoutMode}
              level={level}
              $nodeChange={$appliedNodeChange}
              $changes={$nodeValue?.$changes}
            />
          )}
        </>
      )}

      {/* Arrays */}
      {isArray && (
        <>
          {isDefined(array?.uniqueItems) && (
            <AdditionalInfoObjectRow
              shift={shift}
              $changesKeys={uniqueItemsChangeKeys}
              title={UNIQUE_ITEMS_LABEL}
              items={{
                uniqueItems: `${array!.uniqueItems}`
              }}
              layoutMode={layoutMode}
              level={level}
              $nodeChange={$appliedNodeChange}
              $changes={$nodeValue?.$changes}
            />
          )}
          {(isDefined(array?.minItems) || isDefined(array?.maxItems)) && (
            <AdditionalInfoObjectRow
              shift={shift}
              $changesKeys={itemsCountChangeKeys}
              title={ITEMS_COUNT_LABEL}
              items={{
                minItems: array?.minItems,
                maxItems: array?.maxItems,
              }}
              layoutMode={layoutMode}
              level={level}
              $nodeChange={$appliedNodeChange}
              $changes={$nodeValue?.$changes}
            />
          )}
        </>
      )}
    </>
  )
}
