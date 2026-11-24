import { useCallback, useEffect, useState } from 'react'
import type { OperationsViewMode } from '../../types/views'
import { LIST_OPERATIONS_VIEW_MODE } from '../../types/views'

export const DEFAULT_PREVIEW_WIDTH = 684

export const COMMON_PAGE_SETTINGS_DEFAULTS = {
  expandMainMenu: false,
  previewSize: DEFAULT_PREVIEW_WIDTH,
  hideFiltersPanel: false,
  hideGeneralFilters: false,
  expandActivityHistoryPanel: true,
  operationsViewMode: LIST_OPERATIONS_VIEW_MODE,
}

export const PAGE_SETTINGS_LOCAL_STORAGE_KEY = 'page-settings'

export function usePageSettingsState(): ExtendedPageSettingsState {
  const [pageSettings, setPageSettings] = useState<ExtendedPageSettings>(
    () => {
      const saved = localStorage.getItem(PAGE_SETTINGS_LOCAL_STORAGE_KEY)
      const initial = saved && JSON.parse(saved)
      return initial || COMMON_PAGE_SETTINGS_DEFAULTS
    },
  )

  const {
    hideFiltersPanel,
    hideGeneralFilters,
    previewSize,
    expandMainMenu,
    expandActivityHistoryPanel,
    operationsViewMode,
  } = pageSettings

  useEffect(() => {
    localStorage.setItem(PAGE_SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(pageSettings))
  }, [pageSettings])

  const toggleHideFiltersPanel = useCallback((value: boolean) => {
    setPageSettings({
      ...pageSettings,
      hideFiltersPanel: value,
    })
  }, [pageSettings])

  const toggleHideGeneralFilters = useCallback((value: boolean) => {
    setPageSettings({
      ...pageSettings,
      hideGeneralFilters: value,
    })
  }, [pageSettings])

  const togglePreviewSize = useCallback((value: number) => {
    setPageSettings({
      ...pageSettings,
      previewSize: value,
    })
  }, [pageSettings])

  const toggleExpandMainMenu = useCallback((value: boolean) => {
    setPageSettings({
      ...pageSettings,
      expandMainMenu: value,
    })
  }, [pageSettings])

  const toggleExpandActivityHistoryPanel = useCallback(() => {
    setPageSettings({
      ...pageSettings,
      expandActivityHistoryPanel: !expandActivityHistoryPanel,
    })
  }, [pageSettings, expandActivityHistoryPanel])

  const toggleOperationsViewMode = useCallback((value: string) => {
    setPageSettings({
      ...pageSettings,
      operationsViewMode: value,
    })
  }, [pageSettings])

  return {
    operationsViewMode,
    previewSize,
    hideFiltersPanel,
    hideGeneralFilters,
    expandMainMenu,
    expandActivityHistoryPanel,
    toggleOperationsViewMode,
    togglePreviewSize,
    toggleHideFiltersPanel,
    toggleHideGeneralFilters,
    toggleExpandMainMenu,
    toggleExpandActivityHistoryPanel,
  }
}

export type ExtendedPageSettings = {
  operationsViewMode: OperationsViewMode
  previewSize: number
  hideFiltersPanel: boolean
  hideGeneralFilters: boolean
  expandMainMenu: boolean
  expandActivityHistoryPanel: boolean
}

export type ExtendedPageSettingsCallbacks = {
  toggleOperationsViewMode: (value: string) => void
  togglePreviewSize: (value: number) => void
  toggleHideFiltersPanel: (value: boolean) => void
  toggleHideGeneralFilters: (value: boolean) => void
  toggleExpandMainMenu: (value: boolean) => void
  toggleExpandActivityHistoryPanel: () => void
}

export type ExtendedPageSettingsState = ExtendedPageSettings & ExtendedPageSettingsCallbacks
