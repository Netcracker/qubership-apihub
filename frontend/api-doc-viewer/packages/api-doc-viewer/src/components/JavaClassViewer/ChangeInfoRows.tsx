import { AdditionalInfoPiece } from '@apihub/components/shared-components/AdditionalInfoPiece/AdditionalInfoPiece'
import { AdditionalInfoRow } from '@apihub/components/shared-components/AdditionalInfoRow/AdditionalInfoRow'
import { AdditionalInfoRowUsage } from '@apihub/components/shared-components/AdditionalInfoRow/types'
import { JavaApiCompatibility } from '@netcracker/qubership-apihub-next-data-model/model/javaapi/tree/node-value'
import { FC, useCallback } from 'react'
import { DEFAULT_LONG_TEXT_COLOR } from '../shared-components/TextRow/consts'
import { TextRow } from '../shared-components/TextRow/TextRow'
import { TextRowUsage } from '../shared-components/TextRow/types'
import { TextValueVariant } from '../shared-components/TextValue/types'
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from '../shared-components/WithPrecededByProps'
import {
  ADDITIONAL_INFO_LABEL_BINARY_COMPATIBLE,
  ADDITIONAL_INFO_LABEL_CHANGES,
  ADDITIONAL_INFO_LABEL_SEMVER,
  ADDITIONAL_INFO_LABEL_SOURCE_COMPATIBLE,
} from './consts'

type ChangeInfoRowsProps = WithPrecededByProps & {
  compatibility?: JavaApiCompatibility
}

// The jdiff details, change codes, and compatibility flags of a changed element, laid out like the
// description and properties of a DDL column. An api-report compares a jar with itself, so its
// unchanged elements render nothing.
export const ChangeInfoRows: FC<ChangeInfoRowsProps> = (props) => {
  const { compatibility, [ATTRIBUTE_PRECEDED_BY]: precededBy = PrecededBy.PROPERTY_TABLE_ROW } = props

  const changesSubheader = useCallback(() => (
    <div className="flex flex-wrap items-center gap-2">
      {compatibility?.changeTypes.map(changeType => (
        <AdditionalInfoPiece key={changeType} isVisible={true} value={changeType} />
      ))}
    </div>
  ), [compatibility])
  const binaryCompatibleSubheader = useCallback(
    () => <AdditionalInfoPiece isVisible={true} value={`${compatibility?.binaryCompatible}`} />,
    [compatibility],
  )
  const sourceCompatibleSubheader = useCallback(
    () => <AdditionalInfoPiece isVisible={true} value={`${compatibility?.sourceCompatible}`} />,
    [compatibility],
  )
  const semverSubheader = useCallback(
    () => <AdditionalInfoPiece isVisible={true} value={compatibility?.semver ?? ''} />,
    [compatibility],
  )

  if (!compatibility?.severity) {
    return null
  }
  const hasDetails = !!compatibility.details
  const hasChangeTypes = compatibility.changeTypes.length > 0
  // the first property row follows whatever came before it, the rest follow a property row
  const afterPropertyRow = PrecededBy.PROPERTY_TABLE_ROW_AFTER_ADDITIONAL_INFO
  let binaryCompatiblePrecededBy = precededBy
  if (hasChangeTypes) binaryCompatiblePrecededBy = afterPropertyRow
  else if (hasDetails) binaryCompatiblePrecededBy = PrecededBy.PROPERTY_TABLE_ROW
  return (
    <>
      {hasDetails && (
        <TextRow
          data-precededby={PrecededBy.PROPERTY_TABLE_ROW}
          value={compatibility.details}
          variant={TextValueVariant.body2}
          textFontWeight="normal"
          textColor={DEFAULT_LONG_TEXT_COLOR}
          usage={TextRowUsage.PropertyTableEntry}
        />
      )}
      {hasChangeTypes && (
        <AdditionalInfoRow
          usage={AdditionalInfoRowUsage.PropertyTableEntry}
          data-precededby={hasDetails ? PrecededBy.PROPERTY_TABLE_ROW : precededBy}
          label={ADDITIONAL_INFO_LABEL_CHANGES}
          subheader={changesSubheader}
        />
      )}
      <AdditionalInfoRow
        usage={AdditionalInfoRowUsage.PropertyTableEntry}
        data-precededby={binaryCompatiblePrecededBy}
        label={ADDITIONAL_INFO_LABEL_BINARY_COMPATIBLE}
        subheader={binaryCompatibleSubheader}
      />
      <AdditionalInfoRow
        usage={AdditionalInfoRowUsage.PropertyTableEntry}
        data-precededby={afterPropertyRow}
        label={ADDITIONAL_INFO_LABEL_SOURCE_COMPATIBLE}
        subheader={sourceCompatibleSubheader}
      />
      <AdditionalInfoRow
        usage={AdditionalInfoRowUsage.PropertyTableEntry}
        data-precededby={afterPropertyRow}
        label={ADDITIONAL_INFO_LABEL_SEMVER}
        subheader={semverSubheader}
      />
    </>
  )
}
