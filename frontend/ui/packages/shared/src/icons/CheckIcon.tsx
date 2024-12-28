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

export const CheckIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="13" height="10" viewBox="0 0 13 10" fill="none" xmlns="http://www.w3.org/2000/svg" data-testid="CheckIcon">
        <path
          d="M12.0309 0.469762C12.3238 0.762705 12.3237 1.23758 12.0307 1.53042L4.52814 9.03042C4.23523 9.32323 3.76042 9.32319 3.46756 9.03032L0.472105 6.03479C0.179215 5.74189 0.179221 5.26702 0.472118 4.97413C0.765015 4.68124 1.23989 4.68125 1.53278 4.97414L3.998 7.43942L10.9703 0.469578C11.2632 0.176736 11.7381 0.176818 12.0309 0.469762Z"
          fill="#626D82"
        />
      </svg>
    </div>
  )
})
