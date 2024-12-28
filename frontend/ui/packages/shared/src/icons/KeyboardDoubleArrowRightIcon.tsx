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
import { memo } from 'react'

export type KeyboardDoubleArrowRightIconProps = {
  size?: number
  color?: string
}

export const KeyboardDoubleArrowRightIcon: FC<KeyboardDoubleArrowRightIconProps> = memo<KeyboardDoubleArrowRightIconProps>(({
  color,
  size = 16,
}) => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width={size} height={size} viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5.27664 11.3179C4.96301 11.0473 4.92812 10.5737 5.19871 10.2601L8.87037 6.00441L5.19821 1.73937C4.92795 1.42547 4.96332 0.951916 5.27722 0.681653C5.59111 0.41139 6.06467 0.446763 6.33493 0.76066L10.4289 5.51556C10.6712 5.79707 10.671 6.21358 10.4284 6.49484L6.33443 11.2399C6.06385 11.5536 5.59026 11.5885 5.27664 11.3179ZM0.582345 11.3179C0.268724 11.0473 0.233835 10.5737 0.504417 10.2601L4.17608 6.00441L0.503918 1.73937C0.233656 1.42547 0.269028 0.951915 0.582926 0.681653C0.896823 0.41139 1.37038 0.446763 1.64064 0.76066L5.73456 5.51556C5.97694 5.79707 5.97673 6.21358 5.73407 6.49484L1.64014 11.2399C1.36956 11.5536 0.895966 11.5885 0.582345 11.3179Z"
          fill={color ? color : '#0068FF'}/>
      </svg>
    </div>
  )
})
