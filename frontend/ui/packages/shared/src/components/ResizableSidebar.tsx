import type { FC, PropsWithChildren } from 'react'
import React, { memo, useCallback, useEffect, useState } from 'react'
import type { ResizeCallback } from 're-resizable'
import { Resizable } from 're-resizable'

export type ResizableSidebarProps = PropsWithChildren & {
  open: boolean
  defaultWidth: number
  maxWidth: number
  onChange: (width: number) => void
}

// First Order Component //
export const ResizableSidebar: FC<ResizableSidebarProps> = memo<ResizableSidebarProps>(({
  children,
  open,
  defaultWidth,
  maxWidth,
  onChange,
}) => {
  const [width, setWidth] = useState(defaultWidth)

  useEffect(() => onChange(open ? width : 0), [onChange, open, width])

  const onResize: ResizeCallback = useCallback((event, direction, elementRef) => {
    onChange(elementRef.offsetWidth)
  }, [onChange])

  const onResizeStop: ResizeCallback = useCallback((event, direction, elementRef, delta) => {
    setWidth(width + delta.width)
  }, [width])

  return open ? (
    <Resizable
      onResize={onResize}
      onResizeStop={onResizeStop}
      style={{
        borderLeft: '1px solid #D5DCE3',
        backgroundColor: '#FFFFFF',
        position: 'absolute',
        right: 0,
      }}
      enable={RESIZABLE_CONFIG}
      boundsByDirection={true}
      defaultSize={{ width: width, height: '100%' }}
      maxWidth={maxWidth}
      minWidth={defaultWidth}
      maxHeight="100%"
    >
      {children}
    </Resizable>
  ) : null
})

const RESIZABLE_CONFIG = {
  top: false,
  right: false,
  bottom: false,
  left: true,
  topRight: false,
  bottomRight: false,
  bottomLeft: false,
  topLeft: false,
}
