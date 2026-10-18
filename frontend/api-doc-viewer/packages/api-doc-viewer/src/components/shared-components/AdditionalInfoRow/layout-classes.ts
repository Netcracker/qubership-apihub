import { X_AXIS_PADDING_ROWS_ASYNC_API, X_AXIS_PADDING_ROWS_DDL_API_PROPERTIES, X_AXIS_PADDING_ROWS_JSO } from "@apihub/components/shared-styles/tailwind-classnames"
import { AdditionalInfoRowLayoutOverrides, AdditionalInfoRowUsage } from "./types"

const ADDITIONAL_INFO_ROW_X_AXIS_PADDING_BY_USAGE: Partial<Record<AdditionalInfoRowUsage, string>> = {
  [AdditionalInfoRowUsage.DdlApiProperty]: X_AXIS_PADDING_ROWS_DDL_API_PROPERTIES,
  [AdditionalInfoRowUsage.JsonSchemaValidation]: X_AXIS_PADDING_ROWS_JSO,
}

const ADDITIONAL_INFO_ROW_BODY_CLASS_BY_USAGE: Partial<Record<AdditionalInfoRowUsage, string>> = {
  [AdditionalInfoRowUsage.DdlApiProperty]: 'ddlapi-property-row-body',
  [AdditionalInfoRowUsage.Default]: 'additional-info-row-body',
  [AdditionalInfoRowUsage.JsonSchemaValidation]: 'json-schema-property-row-body',
}

const ADDITIONAL_INFO_ROW_MIN_HEIGHT_BY_USAGE: Partial<Record<AdditionalInfoRowUsage, string>> = {
  [AdditionalInfoRowUsage.DdlApiProperty]: 'min-h-[26px]',
}

export type AdditionalInfoRowResolvedLayout = {
  xPaddingClass: string
  bodyClass: string
  minHeightClass: string
  stretchLevelIndicator: boolean
}

export function resolveAdditionalInfoRowLayout(
  usage: AdditionalInfoRowUsage,
  overrides: AdditionalInfoRowLayoutOverrides = {},
): AdditionalInfoRowResolvedLayout {
  return {
    xPaddingClass: overrides.xPaddingClass
      ?? ADDITIONAL_INFO_ROW_X_AXIS_PADDING_BY_USAGE[usage]
      ?? X_AXIS_PADDING_ROWS_ASYNC_API,
    bodyClass: overrides.bodyClass
      ?? ADDITIONAL_INFO_ROW_BODY_CLASS_BY_USAGE[usage]
      ?? 'additional-info-row-body',
    minHeightClass: overrides.minHeightClass
      ?? ADDITIONAL_INFO_ROW_MIN_HEIGHT_BY_USAGE[usage]
      ?? '',
    stretchLevelIndicator: usage === AdditionalInfoRowUsage.DdlApiProperty,
  }
}
