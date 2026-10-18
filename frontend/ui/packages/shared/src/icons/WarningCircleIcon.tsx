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
import * as React from 'react'
import { memo } from 'react'

export type WarningCircleIconProps = {
  color: string
}

const WarningCircleIcon: FC<WarningCircleIconProps> = memo(({ color }) => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="3" cy="3" r="3" fill={color}/>
      </svg>
    </div>
  )
})

export const YellowWarningCircleIcon: FC = memo(() => {
  return (
    <WarningCircleIcon color="#FFB02E"/>
  )
})

export const RedWarningCircleIcon: FC = memo(() => {
  return (
    <WarningCircleIcon color="#FF5260"/>
  )
})
