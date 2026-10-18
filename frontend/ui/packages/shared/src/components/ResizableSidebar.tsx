/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
