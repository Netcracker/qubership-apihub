import { cn } from '@apihub/utils/common/cn'
import { LevelIndicator } from '@apihub/components/shared-components/LevelIndicator'
import type { FC } from 'react'

export type EmptyContentProps = {
  level: number
}

export const EmptyContent: FC<EmptyContentProps> = (props) => {
  const { level } = props

  return (
    <div className={cn("flex flex-row w-1/2 bg-gray-100")}>
      {/* FIXME 04.07.24 Problem with empty DOM elements */}
      <LevelIndicator level={level} />
    </div>
  )
}
