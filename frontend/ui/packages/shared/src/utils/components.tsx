import React, { memo } from 'react'

export function createComponents(component: React.ReactElement, count: number): React.ReactElement {
  return (
    <>
      {[...Array(count)].map((_, index) => React.cloneElement(component, { key: index }))}
    </>
  )
}

export const genericMemo: <T>  (component: T) => T = memo
