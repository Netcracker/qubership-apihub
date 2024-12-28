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

export const CheckboxDisabledCheckedIcon: FC = memo(() => {
    return (
      <div style={{ display: 'flex' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g opacity="0.5">
            <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill="#F2F3F5"/>
            <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" stroke="#B4BFCF"/>
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12.1757 4.76285C12.5828 5.13604 12.6104 5.76861 12.2372 6.17573L7.79324 11.0236C7.19873 11.6722 6.17628 11.6722 5.58177 11.0236L3.76285 9.03937C3.38966 8.63225 3.41716 7.99968 3.82428 7.62649C4.2314 7.2533 4.86397 7.2808 5.23716 7.68792L6.68751 9.27011L10.7629 4.82428C11.136 4.41716 11.7686 4.38966 12.1757 4.76285Z"
              fill="#8F9EB4"
            />
          </g>
        </svg>
      </div>
    )
  },
)
