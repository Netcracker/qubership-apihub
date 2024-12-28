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
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useEffectOnce, useInterval, useLocation } from 'react-use'

import { useParams } from 'react-router-dom'
import {
  toBranchConfig,
  useUpdateBranchConfig,
  useUpdateChangeStatusInBranchConfig,
  useUpdateEditorsInBranchConfig,
  useUpdateFilesInBranchConfig,
  useUpdateRefsInBranchConfig,
} from './useBranchConfig'
import { useBranchSearchParam } from '../../useBranchSearchParam'
import { useShowInfoNotification } from '../../BasePage/Notification'
import { useBranchConflicts } from './useBranchConflicts'
import { useUpdateBranchCache, useUpdateExistingFileInBranchCache } from './useBranchCache'
import { useAuthorization } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import type {
  BranchConfigSnapshotEventData,
  BranchConfigUpdatedEventData,
  BranchFilesContent,
  BranchFilesDataModifiedEventData,
  BranchFilesResetEventData,
  BranchFilesUpdatedEventData,
  BranchRefsUpdatedEventData,
  BranchSavedEventData,
  UserConnectedEventData,
} from '@apihub/entities/ws-branch-events'
import {
  isBranchConfigSnapshotEventData,
  isBranchConfigUpdatedEventData,
  isBranchEditorsAddedEventData,
  isBranchEditorsRemovedEventData,
  isBranchFilesDataModifiedEventData,
  isBranchFilesResetEventData,
  isBranchFilesUpdatedEventData,
  isBranchRefsUpdatedEventData,
  isBranchResetEventData,
  isBranchSavedEventData,
  isUserConnectedEventData,
  isUserDisconnectedEventData,
} from '@apihub/entities/ws-branch-events'
import { toUser } from '@netcracker/qubership-apihub-ui-shared/types/user'
import type { ChangeType } from '@apihub/entities/branches'
import {
  ADDED_CHANGE_TYPE,
  DELETED_CHANGE_TYPE,
  NONE_CHANGE_TYPE,
  UPDATED_CHANGE_TYPE,
} from '@apihub/entities/branches'
import { ADD_OPERATION, PATCH_OPERATION, REMOVE_OPERATION } from '@apihub/entities/operations'
import type { ChangeStatus } from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'
import {
  ADDED_CHANGE_STATUS,
  DELETED_CHANGE_STATUS,
  EXCLUDED_CHANGE_STATUS,
  INCLUDED_CHANGE_STATUS,
  MODIFIED_CHANGE_STATUS,
  MOVED_CHANGE_STATUS,
  UNMODIFIED_CHANGE_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'
import {
  DEFAULT_RECONNECT_INTERVAL,
  isSocketClosed,
  NORMAL_CLOSURE_CODE,
} from '@netcracker/qubership-apihub-ui-shared/utils/sockets'
import { getToken } from '@netcracker/qubership-apihub-ui-shared/utils/storages'

export const BranchEditingWebSocketProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const { projectId } = useParams()
  const [branch] = useBranchSearchParam()
  const { host, protocol } = useLocation()
  const [authorization] = useAuthorization()

  const [connectedUsersData, setConnectedUsersData] = useState<UserConnectedEventData[]>([])

  const updateBranchConfig = useUpdateBranchConfig()
  const updateEditorsInBranchConfig = useUpdateEditorsInBranchConfig()
  const updateFilesInBranchConfig = useUpdateFilesInBranchConfig()
  const updateRefsInBranchConfig = useUpdateRefsInBranchConfig()
  const updateChangeTypeInBranchConfig = useUpdateChangeStatusInBranchConfig()
  const [updateBranchCache] = useUpdateBranchCache()
  const [updateExistingFileInBranchCache] = useUpdateExistingFileInBranchCache()

  const [reconnectInterval, setReconnectInterval] = useState<number | null>()
  const [connecting, setConnecting] = useState(false)

  const connectedUsers = useMemo(
    () => connectedUsersData.map(({ user }) => toUser(user)),
    [connectedUsersData],
  )

  const showNotification = useShowInfoNotification()
  const [, , getBranchConflicts] = useBranchConflicts()

  const websocket = useRef<WebSocket | null>(null)

  const messageHandler = useCallback(({ data }: { data: string }) => {
    if (data) {
      const eventData = JSON.parse(data)
      const { userId } = eventData
      const username = userId ? connectedUsers.find(({ key }) => key === userId)?.name : ''
      const isNotCurrentUser = authorization?.user.key !== userId

      if (isUserConnectedEventData(eventData)) {
        setConnectedUsersData(prevState => [...prevState, eventData])
      }
      if (isUserDisconnectedEventData(eventData)) {
        setConnectedUsersData(prevState => prevState.filter(({ sessionId }) => sessionId !== eventData.sessionId))
      }
      if (isBranchEditorsAddedEventData(eventData) || isBranchEditorsRemovedEventData(eventData)) {
        updateEditorsInBranchConfig(eventData)
      }
      if (isBranchFilesResetEventData(eventData)) {
        const { fileId = '' }: BranchFilesResetEventData = eventData
        isNotCurrentUser && showNotification({ message: `${username} reset "${fileId}" file` })
        getBranchConflicts()
      }
      if (isBranchConfigSnapshotEventData(eventData)) {
        const { data }: BranchConfigSnapshotEventData = eventData
        updateBranchConfig(toBranchConfig(data))
      }
      if (isBranchConfigUpdatedEventData(eventData)) {
        const { data }: BranchConfigUpdatedEventData = eventData
        updateChangeTypeInBranchConfig(data.changeType)
      }
      if (isBranchFilesUpdatedEventData(eventData)) {
        const { fileId = '', data }: BranchFilesUpdatedEventData = eventData
        updateFilesInBranchConfig(eventData)

        if (needAddToBranchCache(eventData)) {
          updateBranchCache(data?.fileId ?? fileId)
        }

        if (needRemoveFromBranchCache(eventData)) {
          updateBranchCache(data?.fileId ?? fileId)
        }

        const newData: BranchFilesContent = {
          fileId: fileId ?? data?.fileId,
          ...(data ? data : {}),
        }

        if (newData.changeType && newData.changeType !== NONE_CHANGE_TYPE) {
          showNotification({
            message: `${username} ${CHANGE_TYPE_MAP[newData.changeType]} "${newData.fileId}" ${fileId && newData.fileId && fileId !== newData.fileId ? `with "${newData.fileId}"` : ''}`,
          })
        }
      }
      if (isBranchFilesDataModifiedEventData(eventData)) {
        const { fileId }: BranchFilesDataModifiedEventData = eventData
        updateExistingFileInBranchCache(fileId)
      }
      if (isBranchRefsUpdatedEventData(eventData)) {
        const { refId, data, operation }: BranchRefsUpdatedEventData = eventData
        isNotCurrentUser && showNotification({
          message: data?.refId && data?.status && operation !== REMOVE_OPERATION
            ? `${username} ${STATUS_MAP[data.status]} "${data.refId}"`
            : `${username} ${STATUS_MAP[DELETED_CHANGE_STATUS]} "${refId}"`,
        })
        updateRefsInBranchConfig(eventData)
      }
      if (isBranchResetEventData(eventData)) {
        isNotCurrentUser && showNotification({ message: `${username} reset "${branch}" branch` })
      }
      if (isBranchSavedEventData(eventData)) {
        const { comment, branch, mrUrl }: BranchSavedEventData = eventData
        isNotCurrentUser && showNotification({
          message: `${username} saved changes: "${comment}" ${branch ? `to "${branch}" branch` : ''}`,
          link: mrUrl ? {
            name: 'See MR',
            href: mrUrl,
          } : undefined,
        })
        getBranchConflicts()
      }
    }
  }, [connectedUsers, authorization?.user.key, updateEditorsInBranchConfig, showNotification, getBranchConflicts, updateBranchConfig, updateChangeTypeInBranchConfig, updateFilesInBranchConfig, updateBranchCache, updateExistingFileInBranchCache, updateRefsInBranchConfig, branch])

  const openWebsocket = useCallback(
    () => {
      if (isSocketClosed(websocket.current)) {
        setConnecting(true)

        websocket.current = new WebSocket(
          `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}/ws/v1/projects/${encodeURIComponent(projectId!)}/branches/${encodeURIComponent(branch!)}?token=${getToken()}`,
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
    [branch, host, messageHandler, projectId, protocol],
  )

  useInterval(openWebsocket, reconnectInterval)

  useEffectOnce(() => {
    openWebsocket()
    return () => {
      websocket.current?.close(NORMAL_CLOSURE_CODE)
      websocket.current = null
      setReconnectInterval(null)
    }
  })

  useEffect(() => {
    if (websocket.current) {
      websocket.current.onmessage = messageHandler
    }
  }, [messageHandler])

  return (
    <ConnectingContext.Provider value={connecting}>
      <ConnectedUsersContext.Provider value={connectedUsersData}>
        {children}
      </ConnectedUsersContext.Provider>
    </ConnectingContext.Provider>
  )
})

const CHANGE_TYPE_MAP: Partial<Record<ChangeType, string>> = {
  [ADDED_CHANGE_TYPE]: 'added',
  [UPDATED_CHANGE_TYPE]: 'modified',
  [DELETED_CHANGE_TYPE]: 'deleted',
}

const STATUS_MAP: Partial<Record<ChangeStatus, string>> = {
  [ADDED_CHANGE_STATUS]: 'added',
  [MODIFIED_CHANGE_STATUS]: 'modified',
  [DELETED_CHANGE_STATUS]: 'deleted',
}

// TODO: Seems redundant. Check
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const VISIBLE_CHANGE_STATUSES = [MODIFIED_CHANGE_STATUS, MOVED_CHANGE_STATUS]

const ConnectedUsersContext = createContext<UserConnectedEventData[]>()
const ConnectingContext = createContext<boolean>()

export function useConnectedUsers(): UserConnectedEventData[] {
  return useContext(ConnectedUsersContext)
}

export function useConnecting(): boolean {
  return useContext(ConnectingContext)
}

function needAddToBranchCache(event: BranchFilesUpdatedEventData): boolean {
  const isFileToAdd = !!event.data?.fileId && event.operation === ADD_OPERATION
  const isUpdatedFileToAdd = !!event.fileId && (
    event.operation === PATCH_OPERATION && (
      event.data?.status === MOVED_CHANGE_STATUS || event.data?.status === MODIFIED_CHANGE_STATUS || event.data?.status === INCLUDED_CHANGE_STATUS || event.data?.status === UNMODIFIED_CHANGE_STATUS
    )
  )
  return isFileToAdd || isUpdatedFileToAdd
}

function needRemoveFromBranchCache(event: BranchFilesUpdatedEventData): boolean {
  const isFileToRemove = !!event.fileId && event.operation === REMOVE_OPERATION
  const isUpdatedFileToRemove = !!event.fileId && (
    event.operation === REMOVE_OPERATION || (
      event.operation === PATCH_OPERATION && (event.data?.status === EXCLUDED_CHANGE_STATUS || event.data?.status === DELETED_CHANGE_STATUS)
    )
  )
  return isFileToRemove || isUpdatedFileToRemove
}
