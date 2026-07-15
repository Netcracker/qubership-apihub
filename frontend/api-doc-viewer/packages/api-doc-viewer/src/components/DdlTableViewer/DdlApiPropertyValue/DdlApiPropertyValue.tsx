import { FC, memo } from "react"
import { DdlApiPropertyValueBase } from "./DdlApiPropertyValueBase"
import { DdlApiPropertyValueAppearance, useDdlApiPropertyValueStyles } from "./useDdlApiPropertyValueStyles"

export type DdlApiPropertyValueProps = {
  isVisible: boolean
  value: unknown
  appearance: DdlApiPropertyValueAppearance
}

export const DdlApiPropertyValue: FC<DdlApiPropertyValueProps> = memo<DdlApiPropertyValueProps>((props) => {
  const {
    isVisible,
    value,
    appearance,
  } = props
  const className = useDdlApiPropertyValueStyles({
    appearance,
  })

  return (
    <DdlApiPropertyValueBase
      isVisible={isVisible}
      value={value}
      className={className}
    />
  )
})
