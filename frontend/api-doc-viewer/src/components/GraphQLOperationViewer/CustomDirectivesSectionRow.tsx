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

import type { FC } from 'react'
import { LayoutMode } from '../../types/LayoutMode'
import { getLayoutModeFlags } from '../../utils/common/changes'
import { SHIFTED_ROW_PADDING_LEFT } from "../../consts/configuration";

export type CustomDirectivesSectionRowProps = {
  layoutMode: LayoutMode
}

export const CustomDirectivesSectionRow: FC<CustomDirectivesSectionRowProps> = (props) => {
  const { layoutMode } = props

  const { isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)

  if (isSideBySideDiffsLayoutMode) {
    return (
      <div className="flex flex-row">
        <CustomDirectiveSectionValue layoutMode={layoutMode}/>
        <CustomDirectiveSectionValue layoutMode={layoutMode}/>
      </div>
    )
  }

  return <CustomDirectiveSectionValue layoutMode={layoutMode}/>
}

type CustomDirectiveSectionValueProps = {
  layoutMode: LayoutMode
}

const CustomDirectiveSectionValue: FC<CustomDirectiveSectionValueProps> = ({ layoutMode }) => {
  const { isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)
  const width = isSideBySideDiffsLayoutMode ? 'w-1/2' : 'w-full'

  return (
    <div className={`flex flex-row ${SHIFTED_ROW_PADDING_LEFT} ${width}`}>
      <div className="text-base text-slate-700 font-Inter-Medium my-2">
        Custom Directives
      </div>
    </div>
  )
}
