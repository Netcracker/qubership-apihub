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

export type KeyboardDoubleArrowLeftIconProps = {
  size?: number
  color?: string
}

export const KeyboardDoubleArrowLeftIcon: FC<KeyboardDoubleArrowLeftIconProps> = memo<KeyboardDoubleArrowLeftIconProps>(({
  color,
  size = 16,
}) => {
  return (
    <div style={{ display: 'flex', marginLeft: 4 }}>
      <svg width={size} height={size} viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5.72448 0.682152C6.0381 0.952734 6.07299 1.42632 5.80241 1.73995L2.13075 5.99562L5.80291 10.2607C6.07317 10.5746 6.0378 11.0481 5.7239 11.3184C5.41001 11.5886 4.93645 11.5533 4.66619 11.2394L0.572265 6.48447C0.329889 6.20296 0.330102 5.78644 0.572764 5.50518L4.66669 0.76008C4.93727 0.446459 5.41086 0.411569 5.72448 0.682152ZM10.4188 0.682152C10.7324 0.952734 10.7673 1.42632 10.4967 1.73995L6.82504 5.99562L10.4972 10.2607C10.7675 10.5746 10.7321 11.0481 10.4182 11.3184C10.1043 11.5886 9.63074 11.5533 9.36048 11.2394L5.26655 6.48447C5.02418 6.20296 5.02439 5.78644 5.26705 5.50518L9.36098 0.76008C9.63156 0.446459 10.1052 0.411569 10.4188 0.682152Z"
          fill={color ? color : '#0068FF'}
        />
      </svg>
    </div>
  )
})
