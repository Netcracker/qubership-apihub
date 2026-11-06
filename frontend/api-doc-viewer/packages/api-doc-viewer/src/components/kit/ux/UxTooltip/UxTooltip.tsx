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

import { cn } from '@apihub/utils/common/cn'
import type { FC, PropsWithChildren } from 'react'
import './UxTooltip.css'

export type UxTooltipProps = PropsWithChildren & {
  text: string
  floatingContainer?: boolean
  /**
   * Tailwind max-width class (literal, e.g. `max-w-sm`) that lets long text wrap. Omitted = the
   * single-line `w-max` popup every existing tooltip uses.
   */
  maxWidthClass?: string
}

const STATIC_MODE_POSITION_STYLES = 'absolute -top-2 -right-3 translate-x-full '
const FLOATING_MODE_POSITION_STYLES = 'absolute -top-3 -right-4 translate-x-full '
const VISIBILITY_STYLES = 'hidden'
const POPUP_ARROW_STYLES = 'before:content-[\'\'] before:absolute before:top-1/2 before:right-[100%] before:-translate-y-1/2 before:border-8 before:border-y-transparent before:border-l-transparent before:border-r-white'
const POPUP_CONTENT_STYLES = 'text-center text-black text-sm'
const POPUP_CONTAINER_STYLES = 'w-max px-2 py-1 bg-white rounded-lg UxTooltip-shadow'
const POPUP_STYLES = `${POPUP_CONTAINER_STYLES} ${POPUP_CONTENT_STYLES} ${POPUP_ARROW_STYLES}`

const buildTooltipInnerStyles = (floating: boolean, maxWidthClass?: string) => {
  const popupStyles = maxWidthClass
    ? `${POPUP_STYLES.replace('w-max', `w-max ${maxWidthClass} whitespace-normal text-left`)}`
    : POPUP_STYLES
  return `UxTooltip-hint ${floating ? FLOATING_MODE_POSITION_STYLES : STATIC_MODE_POSITION_STYLES} ${VISIBILITY_STYLES} ${popupStyles}`
}

export const UxTooltip: FC<UxTooltipProps> = (props) => {
  const { children, text, floatingContainer = false, maxWidthClass } = props

  return (
    <div className={cn("relative inline-flex hover:cursor-pointer")}>
      <div className={cn("UxTooltip-children inline-flex")}>
        {children}
      </div>
      <span className={cn(buildTooltipInnerStyles(floatingContainer, maxWidthClass))}>
        {text}
      </span>
    </div>
  )
}
