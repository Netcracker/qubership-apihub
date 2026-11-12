import {
  GraphApiNodeData,
  GraphSchemaNodeValue,
  IGraphSchemaEnumType
} from '@netcracker/qubership-apihub-api-data-model'
import type { FC } from 'react'
import { useLayoutMode } from '../../../../contexts/LayoutModeContext'
import { PropsWithChanges } from '../../../../types/internal/PropsWithChanges'
import { PropsWithNodeValue } from '../../../../types/internal/PropsWithNodeValue'
import { PropsWithShift } from '../../../../types/internal/PropsWithShift'
import { PropsWithoutChangesSummary } from "../../../../types/PropsWithoutChangesSummary"
import { ArrayUtils } from '../../../../utils/common/arrays'
import { AllowedValuesRow } from './primitives/AllowedValuesRow'

export type ValidationsProps = PropsWithoutChangesSummary<
  PropsWithShift
  & PropsWithNodeValue<GraphSchemaNodeValue | GraphApiNodeData>
  & PropsWithChanges
>

export const Validations: FC<ValidationsProps> = (props) => {
  const {
    shift = false,
    level,
    nodeValue,
    $nodeChange,
    $changes
  } = props

  const layoutMode = useLayoutMode()

  const allowedValues = (nodeValue as IGraphSchemaEnumType)?.values

  return (
    <>
      {ArrayUtils.isNotEmpty(Object.keys(allowedValues ?? {})) && (
        <AllowedValuesRow
          shift={shift}
          values={allowedValues}
          layoutMode={layoutMode}
          level={level}
          $nodeChange={$nodeChange}
          $changes={$changes}
        />
      )}
    </>
  )
}
