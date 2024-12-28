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
import { ExpandingCaret } from './ExpandingCaret'
import { NestingHorizontalIndicator } from '../../NestingIndicator'
import { defaultOnContextMenu } from '../../../../utils/common/event-handlers'
import { ToggleContextMenuHandler } from '../../../kit/ux/UxContextMenu/types/ToggleContextMenuHandler'

export type ExpanderProps = {
  isRoot: boolean
  isOperation?: boolean
  isExpandable?: boolean
  expanded: boolean
  onToggleExpander: () => void
  onToggleContextMenu: ToggleContextMenuHandler
}

export const Expander: FC<ExpanderProps> = (props) => {
  const { isRoot, isOperation, isExpandable, expanded, onToggleExpander, onToggleContextMenu } = props

  let expanderElement = null
  if (isExpandable) {
    expanderElement = isRoot
      ? (
        <div data-name="Expander" className="flex flex-row items-center w-full justify-center ">
          <ExpandingCaret onToggle={onToggleExpander} expanded={expanded}/>
        </div>
      )
      : (
        <div data-name="Expander" className="flex flex-row items-center w-full" style={{ gap: 3 }}>
          <NestingHorizontalIndicator short/>
          <ExpandingCaret onToggle={onToggleExpander} expanded={expanded}/>
        </div>
      )
  } else if (!isRoot && !isOperation) {
    expanderElement = <NestingHorizontalIndicator/>
  }

  return (
    <>
      {expanderElement && (
        <div
          data-name="ExpanderContainer"
          className={`${isExpandable || !isRoot ? 'w-5' : ''} flex flex-row items-center pt-1`}
          onContextMenu={defaultOnContextMenu(isExpandable, onToggleContextMenu)}
        >
          {expanderElement}
        </div>
      )}
    </>
  )
}
