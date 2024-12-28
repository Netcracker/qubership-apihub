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

export const EmptyUserIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }} data-testid="UserIcon">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="10" fill="#D5DCE3"/>
        <path
          d="M12.75 7.25C12.75 5.73063 11.5194 4.5 10 4.5C8.48063 4.5 7.25 5.73063 7.25 7.25C7.25 8.76937 8.48063 10 10 10C11.5194 10 12.75 8.76937 12.75 7.25ZM4.5 14.1154V14.83C4.5 15.2 4.79997 15.5 5.17 15.5H14.83C15.2 15.5 15.5 15.2 15.5 14.83V14.1154C15.5 11.6923 11.8356 11 10 11C8.16437 11 4.5 11.6923 4.5 14.1154Z"
          fill="#8F9EB4"/>
      </svg>
    </div>
  )
})
