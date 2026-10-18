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

export const ArrowUp: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M13.6727 9.42222C13.4384 9.65653 13.0585 9.65652 12.8242 9.42221L10.6024 7.20042L10.6024 14.2475C10.6024 14.5789 10.3338 14.8475 10.0024 14.8475C9.67107 14.8475 9.40244 14.5789 9.40244 14.2475L9.40244 7.2001L7.18006 9.42187C6.94571 9.65615 6.56581 9.6561 6.33153 9.42175C6.09725 9.1874 6.0973 8.8075 6.33165 8.57322L9.57824 5.32753C9.81257 5.09327 10.1924 5.0933 10.4267 5.3276L13.6727 8.57369C13.907 8.80801 13.907 9.18791 13.6727 9.42222Z"
          fill="#626D82"/>
      </svg>
    </div>
  )
})
