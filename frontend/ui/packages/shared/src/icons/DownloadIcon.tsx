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

type SVGProps = {
  color?: string
}

export const DownloadIcon: FC<SVGProps> = memo<SVGProps>(({ color }) => {
    return (
      <div style={{ display: 'flex' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 17.2516C4 16.8374 4.33579 16.5016 4.75 16.5016H15.25C15.6642 16.5016 16 16.8374 16 17.2516C16 17.6658 15.6642 18.0016 15.25 18.0016H4.75C4.33579 18.0016 4 17.6658 4 17.2516Z"
            fill={color ?? '#353C4E'}/>
          <path
            d="M9.99939 2C10.4136 2 10.7494 2.33579 10.7494 2.75V12.375L14.7077 8.2319C14.9939 7.9324 15.4686 7.92158 15.7681 8.20771C16.0676 8.49385 16.0784 8.9686 15.7923 9.2681L10.5959 14.7071C10.5723 14.7379 10.546 14.7673 10.5171 14.7949C10.2174 15.0808 9.74266 15.0697 9.45674 14.77L4.20735 9.26771C3.92142 8.96801 3.93259 8.49327 4.23229 8.20735C4.53199 7.92142 5.00673 7.93259 5.29265 8.23229L9.24939 12.3796V2.75C9.24939 2.33579 9.58518 2 9.99939 2Z"
            fill={color ?? '#353C4E'}/>
        </svg>
      </div>
    )
  },
)
