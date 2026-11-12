import { LevelIndicator } from '@apihub/components/shared-components/LevelIndicator'
import type { FC } from 'react'

export type EmptyContentProps = {
  level: number
}

export const EmptyContent: FC<EmptyContentProps> = (props) => {
  const { level } = props

  return (
    <div className="flex flex-row w-1/2 bg-gray-100">
      {/* FIXME 04.07.24 Problem with empty DOM elements */}
      <LevelIndicator level={level} />
    </div>
  )
}
