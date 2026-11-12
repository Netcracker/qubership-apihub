import { DiffType } from '@netcracker/qubership-apihub-api-diff'
import type { CSSProperties, FC } from 'react'
import { UxTooltip } from '../UxTooltip/UxTooltip'
import './UxDiffMarker.css'
import { DIFF_TYPE_COLORS, DIFF_TYPE_NAME_MAP } from './consts'

type FloatingVariant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export type UxDiffMarkerProps = {
  variant: DiffType
  tooltip?: DiffType
  floating?: FloatingVariant
}

export const UxDiffMarker: FC<UxDiffMarkerProps> = (props) => {
  const {
    variant,
    tooltip,
    floating,
  } = props

  const markerElement = (
    <div
      className="UxDiffMarker inline-block"
      style={{ backgroundColor: DIFF_TYPE_COLORS[variant] }}
    ></div>
  )

  const wrappedMarkerElement = tooltip
    ? <UxTooltip text={DIFF_TYPE_NAME_MAP[tooltip]}
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