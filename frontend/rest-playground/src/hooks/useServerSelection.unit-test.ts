import { act, renderHook } from '@testing-library/react-hooks'

import type { IServer } from '../utils/http-spec/IServer'
import { useServerSelection } from './useServerSelection'

// Mocks
const mockSetChosenServerUrl = jest.fn()

jest.mock('jotai', () => {
  const actualJotai = jest.requireActual('jotai')
  return {
    ...actualJotai,
    useAtom: jest.fn(),
  }
})

describe('useServerSelection', () => {
  // Test data
  const mockServers: IServer[] = [
    { url: 'https://api.example.com', description: 'Main API' },
    { url: 'https://staging.example.com', description: 'Staging API' },
    { url: 'https://dev.example.com', description: 'Dev API' },
  ]

  const useAtomMock = require('jotai').useAtom

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initialization behavior', () => {
    it('should select first server when no server is chosen and servers are available', () => {
      // Setup: No server is currently selected
      useAtomMock.mockReturnValue([undefined, mockSetChosenServerUrl])

      renderHook(() => useServerSelection(mockServers))

      // Expectation: First server should be selected automatically
      expect(mockSetChosenServerUrl).toHaveBeenCalledWith('https://api.example.com')
    })

    it('should not select anything when no servers are available', () => {
      // Setup: No server is currently selected and no servers are available
      useAtomMock.mockReturnValue([undefined, mockSetChosenServerUrl])

      const { result } = renderHook(() => useServerSelection([]))

      // Expectation: Nothing should be selected
      expect(result.current.chosenServer).toBeNull()
      expect(mockSetChosenServerUrl).not.toHaveBeenCalled()
    })
  })

  describe('when a server is already selected', () => {
    it('should return the selected server when it exists in the available servers', () => {
      // Setup: A valid server is already selected
      useAtomMock.mockReturnValue(['https://staging.example.com', mockSetChosenServerUrl])

      const { result } = renderHook(() => useServerSelection(mockServers))

      // Expectation: The selected server should be returned
      expect(result.current.chosenServer).toEqual({
        url: 'https://staging.example.com',
        description: 'Staging API',
      })
      // No change should be made since the selection is valid
      expect(mockSetChosenServerUrl).not.toHaveBeenCalled()
    })

    it('should fallback to first server when selected server is not in available servers', () => {
      // Setup: A server that doesn't exist in the list is selected
      useAtomMock.mockReturnValue(['https://removed.example.com', mockSetChosenServerUrl])

      renderHook(() => useServerSelection(mockServers))

      // Expectation: Should fallback to first server
      expect(mockSetChosenServerUrl).toHaveBeenCalledWith('https://api.example.com')
    })
  })

  describe('manual server selection', () => {
    it('should update selection when selectServer is called with a new URL', () => {
      // Setup: A server is already selected
      useAtomMock.mockReturnValue(['https://api.example.com', mockSetChosenServerUrl])

      const { result } = renderHook(() => useServerSelection(mockServers))

      // Action: Select a different server
      act(() => {
        result.current.selectServer('https://staging.example.com')
      })

      // Expectation: The selection should be updated
      expect(mockSetChosenServerUrl).toHaveBeenCalledWith('https://staging.example.com')
    })

    it('should not update selection when selectServer is called with the same URL', () => {
      // Setup: A server is already selected
      useAtomMock.mockReturnValue(['https://api.example.com', mockSetChosenServerUrl])

      const { result } = renderHook(() => useServerSelection(mockServers))

      // Action: Try to select the same server
      act(() => {
        result.current.selectServer('https://api.example.com')
      })

      // Expectation: No update should happen
      expect(mockSetChosenServerUrl).not.toHaveBeenCalled()
    })

    it('should allow clearing selection with empty string', () => {
      // Setup: A server is already selected
      useAtomMock.mockReturnValue(['https://api.example.com', mockSetChosenServerUrl])

      const { result } = renderHook(() => useServerSelection(mockServers))

      // Action: Clear the selection
      act(() => {
        result.current.selectServer('')
      })

      // Expectation: Selection should be cleared
      expect(mockSetChosenServerUrl).toHaveBeenCalledWith('')
    })
  })

  describe('when a server list changes', () => {
    it('should automatically select the first server when the selected server is removed', () => {
      // Setup: Staging server is selected
      useAtomMock.mockReturnValue(['https://staging.example.com', mockSetChosenServerUrl])

      // Initially render with all servers
      const { rerender } = renderHook(
        (servers: IServer[]) => useServerSelection(servers),
        { initialProps: mockServers },
      )

      // Action: Remove the selected server from the list
      const newServers = [mockServers[0], mockServers[2]] // Remove staging server
      rerender(newServers)

      // Expectation: Should fallback to first available server
      expect(mockSetChosenServerUrl).toHaveBeenCalledWith('https://api.example.com')
    })

    it('should keep current selection when removing non-selected server', () => {
      // Setup: Staging server is selected
      useAtomMock.mockReturnValue(['https://staging.example.com', mockSetChosenServerUrl])

      // Initially render with all servers
      const { rerender } = renderHook(
        (servers: IServer[]) => useServerSelection(servers),
        { initialProps: mockServers },
      )

      // Action: Remove a non-selected server (dev server) from the list
      const newServers = [mockServers[0], mockServers[1]] // Remove dev server, keep main and staging
      rerender(newServers)

      // Expectation: Selection should remain unchanged since selected server is still available
      expect(mockSetChosenServerUrl).not.toHaveBeenCalled()
    })
  })
})
