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

export const UploadImageIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="43" height="43" rx="9.5" fill="#F2F3F5" fillOpacity="0.4"/>
        <path
          d="M22.0001 14C22.4143 14 22.7501 14.3358 22.7501 14.75V21.2489H29.249C29.6632 21.2489 29.999 21.5847 29.999 21.9989C29.999 22.4131 29.6632 22.7489 29.249 22.7489H22.7501V29.2478C22.7501 29.662 22.4143 29.9978 22.0001 29.9978C21.5859 29.9978 21.2501 29.662 21.2501 29.2478V22.7489H14.7512C14.337 22.7489 14.0012 22.4131 14.0012 21.9989C14.0012 21.5847 14.337 21.2489 14.7512 21.2489H21.2501V14.75C21.2501 14.3358 21.5859 14 22.0001 14Z"
          fill="#626D82"/>
        <rect x="0.5" y="0.5" width="43" height="43" rx="9.5" stroke="#B4BFCF" strokeDasharray="12 10"/>
      </svg>
    </div>
  )
})
