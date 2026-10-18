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

import type { DrawerProps } from '@mui/material/Drawer'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useState } from 'react'
import { Drawer } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Resizable, type ResizeCallback } from 're-resizable'
import { DRAWER_LAYOUT_STYLES } from '../themes/components'

const DEFAULT_PANEL_WIDTH = 440
const DEFAULT_PANEL_MIN_WIDTH = 360
const DEFAULT_PANEL_MAX_WIDTH = '50vw'

const RESIZE_ENABLE = {
  top: false,
  right: false,
  bottom: false,
  left: true,
  topRight: false,
  bottomRight: false,
  bottomLeft: false,
  topLeft: false,
}

/**
 * Keep the visible resize area slightly wider than the panel edge so users can grab it.
 * `overflow: 'visible'` on the drawer paper is required so the handle that leaks
 * 4px outside the panel is still clickable and draggable.
 */
const RESIZE_HANDLE_STYLES = {
  left: {
    left: '-4px',
    width: '8px',
    cursor: 'ew-resize',
  },
}

export type SidePanelDrawerProps = PropsWithChildren<{
  /** Whether the panel is open */
  open: boolean
  /** Called when the user clicks the backdrop or presses Escape */
  onClose: () => void
  /** MUI Drawer variant; defaults to "temporary" */
  variant?: DrawerProps['variant']
  /**
   * Keep drawer content mounted when closed.
   * Useful when the panel needs to preserve internal state (e.g. search filters) across open/close cycles.
   */
  keepMounted?: boolean
  /**
   * Set to true when a resize handle extends beyond the panel edge.
   * Adds `overflow: 'visible'` to the Drawer paper so the handle stays clickable outside panel bounds.
   * Implied automatically when `resizable` is enabled.
   */
  overflowVisible?: boolean
  /** Enable horizontal resizing via a draggable handle on the left edge. */
  resizable?: boolean
  /** localStorage key used to persist the chosen width across sessions (resizable only). */
  widthStorageKey?: string
  /** Initial width in px when there is no stored value (resizable only). */
  defaultWidth?: number
  /** Minimum width in px (resizable only). */
  minWidth?: number
  /** Maximum width — px number or CSS length like `'50vw'` (resizable only). */
  maxWidth?: number | string
}>

/**
 * Generic side panel built on MUI Drawer that slides in from the right.
 *
 * Provides the standard pointer-events setup required for panels that float
 * above the app (header stays interactive, backdrop closes on click).
 * Layout and content are fully controlled by the consumer via `children`.
 *
 * Optionally supports horizontal resizing (toggled by `resizable`), with width
 * persistence when `widthStorageKey` is provided.
 */
export const SidePanelDrawer: FC<SidePanelDrawerProps> = ({
  open,
  onClose,
  children,
  variant = 'temporary',
  keepMounted = false,
  overflowVisible = false,
  resizable = false,
  widthStorageKey,
  defaultWidth = DEFAULT_PANEL_WIDTH,
  minWidth = DEFAULT_PANEL_MIN_WIDTH,
  maxWidth = DEFAULT_PANEL_MAX_WIDTH,
}) => {
  return (
    <StyledDrawer
      anchor="right"
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted }}
      overflowVisible={resizable || overflowVisible}
    >
      {resizable
        ? (
          <ResizablePanel
            minWidth={minWidth}
            maxWidth={maxWidth}
            defaultWidth={defaultWidth}
            widthStorageKey={widthStorageKey}
          >
            {children}
          </ResizablePanel>
        )
        : children}
    </StyledDrawer>
  )
}

type ResizablePanelProps = PropsWithChildren<{
  minWidth: number
  maxWidth: number | string
  defaultWidth: number
  widthStorageKey?: string
}>

const ResizablePanel: FC<ResizablePanelProps> = ({
  minWidth,
  maxWidth,
  defaultWidth,
  widthStorageKey,
  children,
}) => {
  const [panelWidth, setPanelWidth] = useState(() => readStoredWidth(widthStorageKey, defaultWidth, minWidth))

  const handleResizeStop: ResizeCallback = useCallback((_event, _direction, elementRef) => {
    const width = normalizeWidth(elementRef.offsetWidth, defaultWidth, minWidth)
    setPanelWidth(width)
    if (widthStorageKey) {
      localStorage.setItem(widthStorageKey, `${width}`)
    }
  }, [widthStorageKey, defaultWidth, minWidth])

  return (
    <Resizable
      size={{ width: panelWidth, height: '100%' }}
      minWidth={minWidth}
      maxWidth={maxWidth}
      enable={RESIZE_ENABLE}
      handleStyles={RESIZE_HANDLE_STYLES}
      boundsByDirection={true}
      onResizeStop={handleResizeStop}
    >
      {children}
    </Resizable>
  )
}

/**
 * Default Drawer modal covers the full viewport and blocks the app header.
 * We offset the drawer/backdrop below the header and manage pointer events:
 * - modal wrapper: no pointer events (header strip stays interactive),
 * - backdrop: captures clicks in the shaded area and closes via Drawer onClose,
 * - drawer paper: pointer events enabled (panel is clickable).
 */
const StyledDrawer = styled(Drawer, {
  shouldForwardProp: prop => prop !== 'overflowVisible',
})<{ overflowVisible?: boolean }>(({ overflowVisible }) => ({
  pointerEvents: 'none',
  '& .MuiDrawer-paper': {
    pointerEvents: 'auto',
    ...(overflowVisible && { overflow: 'visible' }),
    ...DRAWER_LAYOUT_STYLES,
  },
  '& .MuiBackdrop-root': {
    pointerEvents: 'auto',
    ...DRAWER_LAYOUT_STYLES,
  },
}))

function readStoredWidth(storageKey: string | undefined, defaultWidth: number, minWidth: number): number {
  if (!storageKey) {
    return defaultWidth
  }

  const rawWidth = localStorage.getItem(storageKey)
  if (!rawWidth) {
    return defaultWidth
  }

  return normalizeWidth(Number.parseInt(rawWidth, 10), defaultWidth, minWidth)
}

function normalizeWidth(width: number, defaultWidth: number, minWidth: number): number {
  if (!Number.isFinite(width)) {
    return defaultWidth
  }

  return Math.max(Math.round(width), minWidth)
}
