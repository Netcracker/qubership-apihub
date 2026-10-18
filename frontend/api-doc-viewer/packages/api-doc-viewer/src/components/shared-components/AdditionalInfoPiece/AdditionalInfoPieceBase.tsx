import { FC, memo } from "react"

export type AdditionalInfoPieceBaseProps = {
  isVisible: boolean
  value: unknown
  blockClassName?: string
  valueClassName?: string
}

export const AdditionalInfoPieceBase: FC<AdditionalInfoPieceBaseProps> = memo<AdditionalInfoPieceBaseProps>((props) => {
  const { isVisible, value, blockClassName, valueClassName } = props

  if (!isVisible) {
    return null
  }

  return (
    <div className={blockClassName}>
      {/* TEMPORARY: legacy parity — UxBadge.tsx renders values in a <pre> (whitespace/newlines
          preserved natively, no wrap), not a <span>. fontFamily override matches UxBadge.tsx's
          own inline style, since <pre> defaults to the browser's monospace font otherwise. */}
      <pre className={valueClassName || undefined} style={{ fontFamily: 'Inter' }}>
        {`${value}`}
      </pre>
    </div>
  )
})
