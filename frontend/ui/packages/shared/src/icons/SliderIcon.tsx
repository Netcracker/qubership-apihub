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

export type SliderIconProps = {
  color?: string
}

export const SliderIcon: FC<SliderIconProps> = memo<SliderIconProps>(({ color }) => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M7.5 7.75C8.05228 7.75 8.5 7.30228 8.5 6.75C8.5 6.19772 8.05228 5.75 7.5 5.75C6.94772 5.75 6.5 6.19772 6.5 6.75C6.5 7.30228 6.94772 7.75 7.5 7.75ZM5.11445 6C5.43302 4.98572 6.38059 4.25 7.5 4.25C8.61941 4.25 9.56698 4.98572 9.88555 6H16.25C16.6642 6 17 6.33579 17 6.75C17 7.16421 16.6642 7.5 16.25 7.5H9.88555C9.56698 8.51428 8.61941 9.25 7.5 9.25C6.38059 9.25 5.43302 8.51428 5.11445 7.5H3.75C3.33579 7.5 3 7.16421 3 6.75C3 6.33579 3.33579 6 3.75 6H5.11445ZM12.5 14.25C11.9477 14.25 11.5 13.8023 11.5 13.25C11.5 12.6977 11.9477 12.25 12.5 12.25C13.0523 12.25 13.5 12.6977 13.5 13.25C13.5 13.8023 13.0523 14.25 12.5 14.25ZM14.8855 12.5C14.567 11.4857 13.6194 10.75 12.5 10.75C11.3806 10.75 10.433 11.4857 10.1145 12.5H3.75C3.33579 12.5 3 12.8358 3 13.25C3 13.6642 3.33579 14 3.75 14H10.1145C10.433 15.0143 11.3806 15.75 12.5 15.75C13.6194 15.75 14.567 15.0143 14.8855 14H16.25C16.6642 14 17 13.6642 17 13.25C17 12.8358 16.6642 12.5 16.25 12.5H14.8855Z"
          fill={color ?? '#626D82'}
        />
      </svg>
    </div>
  )
})
