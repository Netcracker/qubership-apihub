import { FC } from "react"
import { WarningIcon2 } from "../kit/icons/WarningIcon2"

type BrokenRefViewerProps = {
  value: string
}

export const BrokenRefViewer: FC<BrokenRefViewerProps> = (props) => {
  const { value } = props

  return (
    <div className="broken-ref-viewer flex flex-row gap-1 items-start">
      <WarningIcon2 />
      <span className="subheader text-slate-500">$ref: {value}</span>
    </div>
  )
}