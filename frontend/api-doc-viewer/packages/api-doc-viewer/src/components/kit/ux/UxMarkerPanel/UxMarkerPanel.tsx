import { useMemo, type FC } from 'react'
import { DiffType } from '@netcracker/qubership-apihub-api-diff'
import { UxDiffMarker } from '../UxMarker/UxDiffMarker'

export type UxMarkerPanelProps = {
  values: DiffType[]
  filter?: (key: DiffType) => boolean
}

export const UxMarkerPanel: FC<UxMarkerPanelProps> = (props) => {
  const { values, filter } = props

  const keyCommon = useMemo(() => values.join(','), [values])

  return <div className="flex flex-row gap-2 mx-2">
    {values
      .filter(key => !filter || filter(key))
      .map(key => <UxDiffMarker key={`${keyCommon}_${key}`} variant={key} tooltip={key}/>)}
  </div>
}
