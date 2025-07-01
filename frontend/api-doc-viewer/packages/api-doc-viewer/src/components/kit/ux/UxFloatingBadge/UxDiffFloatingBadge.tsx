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
import './UxDiffFloatingBadge.css'
import { DIFF_TYPE_COLORS, DIFF_TYPE_NAME_MAP } from '../consts'
import { DiffType } from '@netcracker/qubership-apihub-api-diff'

export type UxDiffFloatingBadgeProps = {
  variant: DiffType,
  message: string | undefined,
  backgroundColor?: string
}

export const UxDiffFloatingBadge: FC<UxDiffFloatingBadgeProps> = (props) => {
  const { variant, message } = props

  return (
    <div
      className="UxDiffFloatingBadge absolute z-10 text-white text-xs w-1 h-full hover:w-max hover:cursor-default hover:px-2"
      style={{
        backgroundColor: DIFF_TYPE_COLORS[variant]
      }}
    >
      <span className="UxDiffFloatingBadge-content">{DIFF_TYPE_NAME_MAP[variant]}{message ? `, ${message}` : ''}</span>
    </div>
  )
}
