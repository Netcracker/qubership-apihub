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

export const AddIcon: FC<{ color?: string }> = memo<{ color?: string }>(({ color }) => {
    return (
      <div style={{ display: 'flex' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9.99987 2C10.4141 2 10.7499 2.33579 10.7499 2.75V9.2489H17.2488C17.663 9.2489 17.9988 9.58468 17.9988 9.9989C17.9988 10.4131 17.663 10.7489 17.2488 10.7489H10.7499V17.2478C10.7499 17.662 10.4141 17.9978 9.99987 17.9978C9.58566 17.9978 9.24987 17.662 9.24987 17.2478V10.7489H2.75098C2.33677 10.7489 2.00098 10.4131 2.00098 9.9989C2.00098 9.58468 2.33677 9.2489 2.75098 9.2489H9.24987V2.75C9.24987 2.33579 9.58566 2 9.99987 2Z"
            fill={color ?? 'white'}/>
        </svg>
      </div>
    )
  },
)
