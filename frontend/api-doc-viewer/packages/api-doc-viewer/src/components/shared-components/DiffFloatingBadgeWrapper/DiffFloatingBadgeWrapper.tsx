import { DiffType } from "@netcracker/qubership-apihub-api-diff"
import { FC, ReactElement } from "react"
import { UxDiffFloatingBadge } from "../../kit/ux/UxFloatingBadge/UxDiffFloatingBadge"

type DiffFloatingBadgeWrapperProps = {
  children: ReactElement
  diffType: DiffType | undefined
  diffTypeCause: string | undefined
  hidden?: boolean
}

export const DiffFloatingBadgeWrapper: FC<DiffFloatingBadgeWrapperProps> = (props) => {
  const { children, diffType, diffTypeCause, hidden = false } = props

  if (hidden || !diffType) {
    return children
  }

  return (
    <div className="flex flex-row relative w-full">
      <UxDiffFloatingBadge variant={diffType} message={diffTypeCause} />
      {children}
    </div>
  )
}
