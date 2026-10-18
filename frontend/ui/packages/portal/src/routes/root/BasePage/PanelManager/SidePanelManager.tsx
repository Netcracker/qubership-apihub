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
import { createContext, memo, useCallback, useContext, useMemo, useState } from 'react'

/**
 * Identifiers of the app's mutually-exclusive side panels.
 * Add a new literal here to register another panel — no other wiring is required.
 */
export const GLOBAL_SEARCH_PANEL = 'global-search' as const
export const AI_ASSISTANT_PANEL = 'ai-assistant' as const

export type SidePanelId =
  | typeof GLOBAL_SEARCH_PANEL
  | typeof AI_ASSISTANT_PANEL

type SidePanelManagerContextValue = {
  /** Currently open panel, or `null` when all panels are closed */
  activePanel: SidePanelId | null
  /** Open a panel. Any other open panel is closed automatically (single active panel). */
  openPanel: (id: SidePanelId) => void
  /** Close the given panel if it is the active one; no-op otherwise. */
  closePanel: (id: SidePanelId) => void
  /** Toggle the given panel: open it (closing others) or close it if already open. */
  togglePanel: (id: SidePanelId) => void
  /** Close whichever panel is currently open. */
  closeAll: () => void
}

const SidePanelManagerContext = createContext<SidePanelManagerContextValue | null>(null)

/**
 * Holds the single "active side panel" state for the whole app.
 *
 * Because at most one panel can be open at a time, mutual exclusion is free:
 * opening one panel implicitly closes any other. This removes the need for
 * per-panel "close the other panel" calls scattered across the app.
 *
 * Must wrap both the panel triggers (header buttons) and the panels themselves.
 */
export const SidePanelManagerProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [activePanel, setActivePanel] = useState<SidePanelId | null>(null)

  const openPanel = useCallback((id: SidePanelId): void => {
    setActivePanel(id)
  }, [])

  const closePanel = useCallback((id: SidePanelId): void => {
    setActivePanel(prev => (prev === id ? null : prev))
  }, [])

  const togglePanel = useCallback((id: SidePanelId): void => {
    setActivePanel(prev => (prev === id ? null : id))
  }, [])

  const closeAll = useCallback((): void => {
    setActivePanel(null)
  }, [])

  const value = useMemo<SidePanelManagerContextValue>(() => ({
    activePanel,
    openPanel,
    closePanel,
    togglePanel,
    closeAll,
  }), [activePanel, openPanel, closePanel, togglePanel, closeAll])

  return (
    <SidePanelManagerContext.Provider value={value}>
      {children}
    </SidePanelManagerContext.Provider>
  )
})

SidePanelManagerProvider.displayName = 'SidePanelManagerProvider'

export function useSidePanelManager(): SidePanelManagerContextValue {
  const context = useContext(SidePanelManagerContext)
  if (!context) {
    throw new Error('useSidePanelManager must be used within a SidePanelManagerProvider')
  }
  return context
}

export type SidePanelControls = {
  /** Whether this panel is the active one */
  open: boolean
  /** Open this panel (closes any other open panel) */
  openPanel: () => void
  /** Close this panel */
  closePanel: () => void
  /** Toggle this panel */
  togglePanel: () => void
}

/**
 * Scoped controls for a single panel. A trigger button and the panel itself
 * both call `useSidePanel(id)` and stay in sync automatically through the shared manager.
 */
export function useSidePanel(id: SidePanelId): SidePanelControls {
  const { activePanel, openPanel, closePanel, togglePanel } = useSidePanelManager()

  return useMemo<SidePanelControls>(() => ({
    open: activePanel === id,
    openPanel: () => openPanel(id),
    closePanel: () => closePanel(id),
    togglePanel: () => togglePanel(id),
  }), [activePanel, id, openPanel, closePanel, togglePanel])
}
