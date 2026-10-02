import { atom, useAtom } from 'jotai'
import { useCallback, useEffect } from 'react'

import type { IServer } from '../utils/http-spec/IServer'
import { persistAtom } from '../utils/jotai/persistAtom'

type ChosenServerRef = string | { url: string; position: number };

const chosenServerRefAtom = persistAtom<ChosenServerRef | undefined>(
  'playground-chosen-sever-url',
  atom<ChosenServerRef | undefined>(undefined),
)

/**
 * Custom hook for managing server selection state with automatic fallback logic.
 *
 * Features:
 * - Persists the selected server in global state
 * - Automatically falls back to first available server when current selection becomes invalid
 * - Handles empty server lists and removed servers
 */
export const useServerSelection = (availableServers: IServer[]) => {
  const [chosenServerRef, setChosenServerRef] = useAtom(chosenServerRefAtom)

  const chosenUrl = typeof chosenServerRef === 'string' ? chosenServerRef : chosenServerRef?.url
  const chosenPosition = typeof chosenServerRef === 'object' ? chosenServerRef.position : -1

  const fallbackServer = availableServers[0] ?? null
  const chosenServer =
    (availableServers[chosenPosition]?.url === chosenUrl
      ? availableServers[chosenPosition]
      : availableServers.find(server => server.url === chosenUrl)) ?? null

  const hasValidSelection = Boolean(chosenUrl && chosenServer)
  const hasFallbackAvailable = Boolean(fallbackServer?.url)
  const shouldApplyFallback = !hasValidSelection && hasFallbackAvailable
  const shouldClearSelection = !hasFallbackAvailable && Boolean(chosenUrl)

  useEffect(() => {
    if (shouldApplyFallback) {
      setChosenServerRef(fallbackServer!.url)
      return
    }

    if (shouldClearSelection) {
      setChosenServerRef('')
    }
  }, [shouldApplyFallback, shouldClearSelection, fallbackServer, setChosenServerRef])

  const selectServer = useCallback((url: string, position?: number) => {
    // Only update if the selection actually changed
    if (url !== chosenUrl || (position ?? -1) !== chosenPosition) {
      // Without a position the url is all the caller knows, so it is stored on its own.
      setChosenServerRef(position === undefined ? url : { url, position })
    }
  }, [chosenUrl, chosenPosition, setChosenServerRef])

  return {
    chosenServer,
    selectServer,
  }
}
