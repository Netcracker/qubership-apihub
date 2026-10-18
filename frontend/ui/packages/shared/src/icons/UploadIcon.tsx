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

export const UploadIcon: FC<SVGProps> = memo<SVGProps>(({ color }) => {
    return (
      <div style={{ display: 'flex' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 17.2516C4 16.8374 4.33579 16.5016 4.75 16.5016H15.25C15.6642 16.5016 16 16.8374 16 17.2516C16 17.6658 15.6642 18.0016 15.25 18.0016H4.75C4.33579 18.0016 4 17.6658 4 17.2516Z"
            fill={color ?? '#626D82'}/>
          <path
            d="M9.99939 15.0023C10.4136 15.0023 10.7494 14.6665 10.7494 14.2523V4.62725L14.7077 8.77036C14.9939 9.06986 15.4686 9.08069 15.7681 8.79455C16.0676 8.50841 16.0784 8.03366 15.7923 7.73417L10.5959 2.29514C10.5723 2.26434 10.546 2.23496 10.5171 2.20735C10.2174 1.92142 9.74266 1.93259 9.45674 2.23229L4.20735 7.73455C3.92142 8.03425 3.93259 8.50899 4.23229 8.79492C4.53199 9.08084 5.00673 9.06968 5.29265 8.76998L9.24939 4.62264V14.2523C9.24939 14.6665 9.58518 15.0023 9.99939 15.0023Z"
            fill={color ?? '#626D82'}/>
        </svg>
      </div>
    )
  },
)
