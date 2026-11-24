import { cn } from '@apihub/utils/common/cn'
import type { FC } from 'react'
import { LayoutMode } from '../../../types/LayoutMode'

export type UnsupportedContentProps = {
  layoutMode: LayoutMode
}

export const UnsupportedContent: FC<UnsupportedContentProps> = (props) => {
  const { layoutMode } = props
  return (
    <div className={cn("text-xs")}>
      Unsupported layout mode: {layoutMode}
    </div>
  )
}
