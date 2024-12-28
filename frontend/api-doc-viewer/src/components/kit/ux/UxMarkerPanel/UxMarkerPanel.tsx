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

import { useMemo, type FC } from 'react'
import { UxMarker } from '../UxMarker/UxMarker'
import { DiffType } from '@netcracker/qubership-apihub-api-diff'

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
      .map(key => <UxMarker key={`${keyCommon}_${key}`} variant={key} tooltip={key}/>)}
  </div>
}
