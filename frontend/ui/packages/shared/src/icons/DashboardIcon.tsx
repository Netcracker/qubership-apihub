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

export const DashboardIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="10" fill="white"/>
        <circle cx="10" cy="10" r="10" fill="#EDF1F5"/>
        <path
          d="M15.5 4H4.5C4.225 4 4 4.225 4 4.5V15.5C4 15.775 4.225 16 4.5 16H15.5C15.775 16 16 15.775 16 15.5V4.5C16 4.225 15.775 4 15.5 4ZM4.75 4.75H15.25V15.25H4.75V4.75ZM13.2497 11.5001H6.7497C6.5997 11.5001 6.4997 11.6001 6.4997 11.7501V13.2501C6.4997 13.4001 6.5997 13.5001 6.7497 13.5001H13.2497C13.3997 13.5001 13.4997 13.4001 13.4997 13.2501V11.7501C13.4997 11.6001 13.3997 11.5001 13.2497 11.5001ZM8.2497 6.49955H6.7497C6.5997 6.49955 6.4997 6.59955 6.4997 6.74955V9.74955C6.4997 9.89955 6.5997 9.99955 6.7497 9.99955H8.2497C8.3997 9.99955 8.4997 9.89955 8.4997 9.74955V6.74955C8.4997 6.59955 8.3997 6.49955 8.2497 6.49955ZM13.25 6.5H10.25C10.1 6.5 10 6.6 10 6.75V9.75C10 9.9 10.1 10 10.25 10H13.25C13.4 10 13.5 9.9 13.5 9.75V6.75C13.5 6.6 13.4 6.5 13.25 6.5Z"
          fill="#626D82"
        />
      </svg>
    </div>
  )
})
