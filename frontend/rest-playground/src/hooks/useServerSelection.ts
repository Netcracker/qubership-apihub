import { atom, useAtom } from 'jotai'
import { useCallback, useEffect } from 'react'

import type { IServer } from '../utils/http-spec/IServer'
import { persistAtom } from '../utils/jotai/persistAtom'

const chosenServerUrlAtom = persistAtom<string | undefined>(
  'playground-chosen-sever-url',
  atom<string | undefined>(undefined),
)

/**
 * Custom hook for managing server selection state with automatic fallback logic.
 *
 * Features:
 * - Persists selected server URL in global state
 * - Automatically falls back to first available server when current selection becomes invalid
 * - Handles empty server lists and removed servers
 */
export const useServerSelection = (availableServers: IServer[]) => {
  const [chosenServerUrl, setChosenServerUrl] = useAtom(chosenServerUrlAtom)

  const fallbackServer = availableServers[0] ?? null
  const chosenServer = availableServers.find(server => server.url === chosenServerUrl) ?? null

  const hasValidSelection = Boolean(chosenServerUrl && chosenServer)
  const hasFallbackAvailable = Boolean(fallbackServer?.url)
  const shouldApplyFallback = !hasValidSelection && hasFallbackAvailable
  const shouldClearSelection = !hasFallbackAvailable && Boolean(chosenServerUrl)

  useEffect(() => {
    if (shouldApplyFallback) {
      setChosenServerUrl(fallbackServer!.url)
      return
    }

    if (shouldClearSelection) {
      setChosenServerUrl('')
    }
  }, [shouldApplyFallback, shouldClearSelection, fallbackServer, setChosenServerUrl])

  const selectServer = useCallback((url: string) => {
    // Only update if the URL actually changed
    if (url !== chosenServerUrl) {
      setChosenServerUrl(url)
    }
  }, [chosenServerUrl, setChosenServerUrl])

  return {
    chosenServer,
    selectServer,
  }
}
