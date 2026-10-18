export type JsonSchemaPropertyRowVisibility = {
  readonly showDescription: boolean
  readonly showDeprecationReasonRow: boolean
  readonly deprecationReason?: string
  readonly showDefaultRow: boolean
  readonly showExamplesRow: boolean
  readonly showEnumValuesRow: boolean
  readonly showValidationsSection: boolean
  readonly showExtensionsRow: boolean
  readonly showCustomAnnotationsRow: boolean
  readonly showContentSection: boolean
  readonly showAnyAdditionalInfoRow: boolean
}

export type JsonSchemaPropertyListLastRowFlags = {
  readonly isTitleListLastRow: boolean
  readonly isDescriptionListLastRow: boolean
  readonly isEnumAdditionalInfoListLastRow: boolean
  readonly isDefaultAdditionalInfoListLastRow: boolean
  readonly isExamplesAdditionalInfoListLastRow: boolean
}

export type JsonSchemaPropertyAdditionalInfoRowKind = "default" | "examples" | "enum"

export type JsonSchemaCombinerRowVisibility = {
  readonly showSelector: boolean
  readonly showSubheader: boolean
  readonly isExpandable: boolean
  readonly initiallyExpanded: boolean
}
