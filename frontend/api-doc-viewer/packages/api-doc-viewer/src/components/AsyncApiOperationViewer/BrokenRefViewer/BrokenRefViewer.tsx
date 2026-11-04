import { cn } from "@apihub/utils/common/cn"
import { FC } from "react"
import "./BrokenRefViewer.css"
import { WarningIcon2 } from "../../kit/icons/WarningIcon2"

type BrokenRefViewerProps = {
  value: string
}

export const BrokenRefViewer: FC<BrokenRefViewerProps> = (props) => {
  const { value } = props

  return (
    <div className={cn("broken-ref-viewer flex flex-row gap-1 items-start")}>
      <WarningIcon2 />
      <span className={cn("subheader text-slate-500")}>$ref: {value}</span>
    </div>
  )
}