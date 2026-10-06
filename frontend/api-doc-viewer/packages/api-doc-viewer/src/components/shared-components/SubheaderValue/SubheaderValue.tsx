import { FC, memo } from "react"
import { SubheaderValueBase } from "./SubheaderValueBase"
import './SubheaderValue.css'
import { SubheaderValueAppearance } from "./types"
import { useSubheaderValueStyles } from "./useSubheaderValueStyles"

export type SubheaderValueProps = {
  isVisible: boolean
  value: unknown
  appearance?: SubheaderValueAppearance
}

export const SubheaderValue: FC<SubheaderValueProps> = memo<SubheaderValueProps>((props) => {
  const {
    isVisible,
    value,
    appearance = SubheaderValueAppearance.Text,
  } = props
  const className = useSubheaderValueStyles({ appearance })

  return (
    <SubheaderValueBase
      isVisible={isVisible}
      value={value}
      className={className}
    />
  )
})
