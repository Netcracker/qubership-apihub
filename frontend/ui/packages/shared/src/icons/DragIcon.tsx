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

export const DragIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M9 6.002C9 6.55428 8.55228 7.002 8 7.002C7.44772 7.002 7 6.55428 7 6.002C7 5.44972 7.44772 5.002 8 5.002C8.55228 5.002 9 5.44972 9 6.002Z"
          fill="#626D82"/>
        <path
          d="M13 6.00195C13 6.55424 12.5523 7.00195 12 7.00195C11.4477 7.00195 11 6.55424 11 6.00195C11 5.44967 11.4477 5.00195 12 5.00195C12.5523 5.00195 13 5.44967 13 6.00195Z"
          fill="#626D82"/>
        <path
          d="M9 10.002C9 10.5542 8.55228 11.002 8 11.002C7.44772 11.002 7 10.5542 7 10.002C7 9.44967 7.44772 9.00195 8 9.00195C8.55228 9.00195 9 9.44967 9 10.002Z"
          fill="#626D82"/>
        <path
          d="M13 10.002C13 10.5542 12.5523 11.002 12 11.002C11.4477 11.002 11 10.5542 11 10.002C11 9.44967 11.4477 9.00195 12 9.00195C12.5523 9.00195 13 9.44967 13 10.002Z"
          fill="#626D82"/>
        <path
          d="M9 14.002C9 14.5542 8.55228 15.002 8 15.002C7.44772 15.002 7 14.5542 7 14.002C7 13.4497 7.44772 13.002 8 13.002C8.55228 13.002 9 13.4497 9 14.002Z"
          fill="#626D82"/>
        <path
          d="M13 14.002C13 14.5542 12.5523 15.002 12 15.002C11.4477 15.002 11 14.5542 11 14.002C11 13.4497 11.4477 13.002 12 13.002C12.5523 13.002 13 13.4497 13 14.002Z"
          fill="#626D82"/>
      </svg>
    </div>
  )
})
