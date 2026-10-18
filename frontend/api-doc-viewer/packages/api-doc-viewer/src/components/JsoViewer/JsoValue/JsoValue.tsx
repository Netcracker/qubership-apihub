import { FC, memo } from "react"
import { JsoValueBase } from "./JsoValueBase"
import { JsoValueAppearance, useJsoValueStyles } from "./useJsoValueStyles"

export type JsoValueProps = {
  isVisible: boolean
  value: unknown
  appearance: JsoValueAppearance
}

export const JsoValue: FC<JsoValueProps> = memo<JsoValueProps>((props) => {
  const {
    isVisible,
    value,
    appearance,
  } = props
  const className = useJsoValueStyles({
    appearance,
  })

  return (
    <JsoValueBase
      isVisible={isVisible}
      value={value}
      className={className}
    />
  )
})
