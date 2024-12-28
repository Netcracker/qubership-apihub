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

import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { useInterval, useLocation } from 'react-use'
import { useParams } from 'react-router-dom'
import { useBranchSearchParam } from '../../useBranchSearchParam'
import { useFileSearchParam } from '../../useFileSearchParam'
import type { UserConnectedEventData, UserDisconnectedEventData } from '@apihub/entities/ws-branch-events'
import { isUserConnectedEventData, isUserDisconnectedEventData } from '@apihub/entities/ws-branch-events'
import type { DocumentSnapshotEventData, UserCursorEventData } from '@apihub/entities/ws-file-events'
import { isDocumentSnapshotEventData, isUserCursorEventData } from '@apihub/entities/ws-file-events'
import {
  DEFAULT_RECONNECT_INTERVAL,
  isSocketClosed,
  NORMAL_CLOSURE_CODE,
} from '@netcracker/qubership-apihub-ui-shared/utils/sockets'
import { getToken } from '@netcracker/qubership-apihub-ui-shared/utils/storages'

export const FileEditingWebSocketProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [connectedUsersData, setConnectedUsersData] = useState<UserConnectedEventData[]>([])
  const [connecting, setConnecting] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const [cursors, setCursors] = useState<UserCursorEventData[]>([])
  const [initialDocument, setInitialDocument] = useState<DocumentSnapshotEventData>()
  const [reconnectInterval, setReconnectInterval] = useState<number | null>()

  const { projectId } = useParams()
  const [branch] = useBranchSearchParam()
  const [fileId] = useFileSearchParam()
  const { host, protocol } = useLocation()

  const websocket = useRef<WebSocket | null>(null)

  const messageHandler = useCallback(({ data }: { data: string }) => {
    if (data) {
      const parsedData = JSON.parse(data)

      if (isUserConnectedEventData(parsedData)) {
        setConnectedUsersData(prevState => [...prevState, parsedData])
      }

      if (isUserDisconnectedEventData(parsedData)) {
        const { sessionId }: UserDisconnectedEventData = parsedData
        setConnectedUsersData(prevState => prevState.filter(({ sessionId: id }) => id !== sessionId))
      }

      if (isUserCursorEventData(parsedData)) {
        const { sessionId }: UserCursorEventData = parsedData
        setCursors(prevState => [...prevState.filter(cursor => cursor.sessionId !== sessionId), parsedData])
      }

      if (isDocumentSnapshotEventData(parsedData)) {
        setInitialDocument(parsedData)
        setCursors([])
        setLoading(false)
      }
    }
  }, [])

  const openWebsocket = useCallback(
    () => {
      if (isSocketClosed(websocket.current) && fileId) {
        setConnecting(true)

        websocket.current = new WebSocket(
          `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}/ws/v1/projects/${encodeURIComponent(projectId!)}/branches/${encodeURIComponent(branch!)}/files/${encodeURIComponent(fileId)}?token=${getToken()}`,
        )

        websocket.current.onopen = () => {
          setConnecting(false)
          setReconnectInterval(null)
        }

        websocket.current.onclose = ({ code }) => {
          if (code !== NORMAL_CLOSURE_CODE) {
            setConnectedUsersData([])
            setReconnectInterval(DEFAULT_RECONNECT_INTERVAL)
          }
        }

        websocket.current.onmessage = messageHandler
      }
    },
    [branch, fileId, host, messageHandler, projectId, protocol],
  )

  useInterval(openWebsocket, reconnectInterval)

  useEffect(() => {
    openWebsocket()

    return () => {
      websocket.current?.close(NORMAL_CLOSURE_CODE)
      websocket.current = null
      setReconnectInterval(null)
      setConnectedUsersData([])
    }
  }, [openWebsocket])

  useEffect(() => {
    if (websocket.current) {
      websocket.current.onmessage = messageHandler
    }
  }, [messageHandler])

  return (
    <FileEditingWebSocketContext.Provider value={websocket.current}>
      <InitialDocumentContext.Provider value={initialDocument}>
        <ConnectingContext.Provider value={connecting}>
          <SetConnectingContext.Provider value={setConnecting}>
            <ConnectedUsersContext.Provider value={connectedUsersData}>
              <UserCursorsContext.Provider value={cursors}>
                <SetConnectedUsersContext.Provider value={setConnectedUsersData}>
                  <ContentLoadingContext.Provider value={loading}>
                    <SetContentLoadingContext.Provider value={setLoading}>
                      {children}
                    </SetContentLoadingContext.Provider>
                  </ContentLoadingContext.Provider>
                </SetConnectedUsersContext.Provider>
              </UserCursorsContext.Provider>
            </ConnectedUsersContext.Provider>
          </SetConnectingContext.Provider>
        </ConnectingContext.Provider>
      </InitialDocumentContext.Provider>
    </FileEditingWebSocketContext.Provider>
  )
})

const ConnectedUsersContext = createContext<UserConnectedEventData[]>()
const UserCursorsContext = createContext<UserCursorEventData[]>()
const SetConnectedUsersContext = createContext<Dispatch<SetStateAction<UserConnectedEventData[]>>>()
const ConnectingContext = createContext<boolean>()
const SetConnectingContext = createContext<Dispatch<SetStateAction<boolean>>>()
const ContentLoadingContext = createContext<boolean>()
const SetContentLoadingContext = createContext<Dispatch<SetStateAction<boolean>>>()
const FileEditingWebSocketContext = createContext<WebSocket | null>()
const InitialDocumentContext = createContext<DocumentSnapshotEventData | undefined>()

export function useConnectedUsers(): UserConnectedEventData[] {
  return useContext(ConnectedUsersContext)
}

export function useUserCursors(): UserCursorEventData[] {
  return useContext(UserCursorsContext)
}

export function useConnecting(): boolean {
  return useContext(ConnectingContext)
}

export function useInitialDocument(): DocumentSnapshotEventData | undefined {
  return useContext(InitialDocumentContext)
}

export function useContentLoading(): boolean {
  return useContext(ContentLoadingContext)
}

export function useSetContentLoading(): Dispatch<SetStateAction<boolean>> {
  return useContext(SetContentLoadingContext)
}

export function useFileEditingWebSocket(): WebSocket | null {
  return useContext(FileEditingWebSocketContext)
}
