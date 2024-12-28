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

export const ArrowDown: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M6.33147 10.5772C6.56579 10.3429 6.94569 10.3429 7.18 10.5772L9.40171 12.799L9.40171 5.75186C9.40171 5.42048 9.67034 5.15186 10.0017 5.15186C10.3331 5.15186 10.6017 5.42049 10.6017 5.75186L10.6017 12.7993L12.8241 10.5775C13.0584 10.3432 13.4383 10.3433 13.6726 10.5776C13.9069 10.812 13.9069 11.1919 13.6725 11.4262L10.4259 14.6719C10.1916 14.9061 9.81173 14.9061 9.57744 14.6718L6.33146 11.4257C6.09715 11.1914 6.09716 10.8115 6.33147 10.5772Z"
          fill="#626D82"/>
      </svg>
    </div>
  )
})
