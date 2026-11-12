import type { FC } from 'react'
import { LayoutMode } from '../../../types/LayoutMode'

export type UnsupportedContentProps = {
  layoutMode: LayoutMode
}

export const UnsupportedContent: FC<UnsupportedContentProps> = (props) => {
  const { layoutMode } = props
  return (
    <div className="text-xs">
      Unsupported layout mode: {layoutMode}
    </div>
  )
}
