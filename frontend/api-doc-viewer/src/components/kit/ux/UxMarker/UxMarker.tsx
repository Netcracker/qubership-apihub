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

import type { CSSProperties, FC } from 'react'
import './UxMarker.css'
import { CHANGE_SEVERITY_NAME_MAP, DIFF_TYPE_COLORS } from '../consts'
import { UxTooltip } from '../UxTooltip/UxTooltip'
import { DiffType } from '@netcracker/qubership-apihub-api-diff'

type MarkerVariant = DiffType | 'custom'

type FloatingVariant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export type UxMarkerProps = {
  variant: MarkerVariant
  backgroundColor?: string
  tooltip?: string
  floating?: FloatingVariant
}

export const UxMarker: FC<UxMarkerProps> = (props) => {
  const {
    variant,
    backgroundColor,
    tooltip,
    floating,
  } = props

  const markerElement = (
    <div
      className="UxMarker inline-block"
      style={{
        backgroundColor: variant !== 'custom'
          ? DIFF_TYPE_COLORS[variant]
          : backgroundColor,
      }}
    ></div>
  )

  const wrappedMarkerElement = tooltip
    ? <UxTooltip text={CHANGE_SEVERITY_NAME_MAP[tooltip as DiffType]}
                 floatingContainer={!!floating}>{markerElement}</UxTooltip>
    : markerElement

  if (!floating) {
    return wrappedMarkerElement
  }

  return (
    <div className="inline-block" style={getAbsoluteStyles(floating)}>
      {wrappedMarkerElement}
    </div>
  )
}

function getAbsoluteStyles(floating?: FloatingVariant): CSSProperties {
  const styles: CSSProperties = {
    position: floating ? 'relative' : undefined,
  }
  const offsetX = 6
  const offsetY = -8
  if (floating === 'top-left') {
    styles.top = offsetY
    styles.left = offsetX
  }
  if (floating === 'top-right') {
    styles.top = offsetY
    styles.right = offsetX
  }
  if (floating === 'bottom-left') {
    styles.bottom = offsetY
    styles.left = offsetX
  }
  if (floating === 'bottom-right') {
    styles.bottom = offsetY
    styles.right = offsetX
  }
  return styles
}