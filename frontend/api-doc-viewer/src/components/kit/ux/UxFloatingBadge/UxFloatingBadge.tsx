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
import './UxFloatingBadge.css'
import { CHANGE_SEVERITY_NAME_MAP, DIFF_TYPE_COLORS } from '../consts'
import { DiffType } from '@netcracker/qubership-apihub-api-diff'

type FloatingBadgeVariant = DiffType | 'custom'

export type UxFloatingBadgeProps = {
  variant: FloatingBadgeVariant,
  message: string | undefined,
  backgroundColor?: string
}

export const UxFloatingBadge: FC<UxFloatingBadgeProps> = (props) => {
  const { variant, message, backgroundColor } = props

  return (
    <div
      className="UxFloatingBadge absolute z-10 text-white text-xs w-1 h-full hover:w-max hover:cursor-default hover:px-2"
      style={{
        backgroundColor: variant !== 'custom'
          ? DIFF_TYPE_COLORS[variant]
          : backgroundColor
      }}
    >
      <span className="UxFloatingBadge-content">{CHANGE_SEVERITY_NAME_MAP[variant]}{message ? `, ${message}` : ''}</span>
    </div>
  )
}
