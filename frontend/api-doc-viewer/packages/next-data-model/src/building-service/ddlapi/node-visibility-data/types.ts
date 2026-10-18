export type DdlApiColumnRowVisibility = {
  readonly showDescription: boolean
  readonly showEnumValuesRow: boolean
  readonly showDefaultRow: boolean
  readonly showGeneratedRow: boolean
  readonly showAnyAdditionalInfoRow: boolean
}

export type DdlApiColumnListLastRowFlags = {
  readonly isTitleListLastRow: boolean
  readonly isDescriptionListLastRow: boolean
  readonly isEnumAdditionalInfoListLastRow: boolean
  readonly isDefaultAdditionalInfoListLastRow: boolean
  readonly isGeneratedAdditionalInfoListLastRow: boolean
}

export type DdlApiColumnAdditionalInfoRowKind = "default" | "generated"

export type DdlApiIndexRowVisibility = {
  readonly showDescription: boolean
  readonly showSubheader: boolean
}

export type DdlApiIndexListLastRowFlags = {
  readonly isTitleListLastRow: boolean
  readonly isDescriptionListLastRow: boolean
}
