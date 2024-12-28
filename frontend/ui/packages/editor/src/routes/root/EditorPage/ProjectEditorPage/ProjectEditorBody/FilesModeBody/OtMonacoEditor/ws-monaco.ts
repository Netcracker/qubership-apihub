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

import { WSAdapter } from './ws-adapter'
import { disposeCursorWidget, MonacoAdapter } from './monaco'
import type { EditorClientEvent, IEditorClient, TEditorClientEventArgs } from '@otjs/plaintext-editor'
import { DatabaseAdapterEvent, EditorClient } from '@otjs/plaintext-editor'
import type { Handler } from 'mitt'

import type { IWSMonacoEditor, IWSMonacoEditorConstructionOptions } from './ws-monaco.types'

export class WSMonacoEditor implements IWSMonacoEditor {
  protected _databaseAdapter: WSAdapter | null
  protected _editorAdapter: MonacoAdapter | null
  protected _editorClient: IEditorClient | null

  constructor(
    {
      announcementDuration,
      editor,
      websocket,
      initialDocument,
      userId,
      userName,
      users,
      cursors,
    }: IWSMonacoEditorConstructionOptions,
  ) {
    this._databaseAdapter = new WSAdapter({
        websocket,
        initialDocument,
        userId,
        userName,
      },
    )
    this._editorAdapter = new MonacoAdapter({
      announcementDuration: announcementDuration,
      editor: editor,
      bindEvents: true,
    })
    this._editorClient = new EditorClient({
      databaseAdapter: this._databaseAdapter,
      editorAdapter: this._editorAdapter,
    })

    this._userId = userId
    this._userName = userName ?? null

    this._databaseAdapter.on(
      DatabaseAdapterEvent.CursorChange,
      ({ clientId, cursor }) => {
        if (cursor === null) {
          disposeCursorWidget(clientId)
        }
      })
    this._databaseAdapter.on(
      DatabaseAdapterEvent.Ready,
      (ready) => {
        if (!ready) {
          // When socket reconnects, we need to reset initiated state to avoid intermediate operations
          this._editorAdapter?.resetInitiated()
        }
      })

    users?.forEach(user => {
      this._databaseAdapter?.handleConnectedUser(user)
    })
    initialDocument && this._databaseAdapter.handleSnapshot(initialDocument)
    cursors?.forEach(cursor => {
      this._databaseAdapter?.handleUserCursor(cursor)
    })
  }

  protected _disposed = false

  get disposed(): boolean {
    return this._disposed
  }

  protected _userId: string

  get userId(): string {
    return this._userId
  }

  set userId(userId: string) {
    if (this._disposed) {
      return
    }

    this._databaseAdapter?.setUserId(userId)
    this._userId = userId
  }

  protected _userColor = ''

  get userColor(): string {
    return this._userColor
  }

  set userColor(userColor: string) {
    if (this._disposed) {
      return
    }

    this._databaseAdapter?.setUserColor(userColor)
    this._userColor = userColor
  }

  protected _userName: string | null = null

  get userName(): string {
    return this._userName ?? this._userId
  }

  set userName(userName: string) {
    if (this._disposed) {
      return
    }

    this._databaseAdapter?.setUserName(userName)
    this._userName = userName
  }

  get text(): string {
    if (this._disposed) {
      return ''
    }

    return this._editorAdapter?.getText() ?? ''
  }

  set text(content: string) {
    if (this._disposed) {
      return
    }

    this._editorAdapter?.setText(content)
  }

  clearHistory(): void {
    this._editorClient?.clearUndoRedoStack()
  }

  dispose(): void {
    if (this._disposed) {
      return
    }

    this._databaseAdapter?.dispose()
    this._editorClient?.dispose()
    this._editorAdapter?.dispose()

    this._databaseAdapter = null
    this._editorAdapter = null
    this._editorClient = null

    this._disposed = true
  }

  isHistoryEmpty(): boolean {
    return this._databaseAdapter?.isHistoryEmpty() ?? true
  }

  on<Key extends EditorClientEvent>(
    event: Key,
    listener: Handler<TEditorClientEventArgs[Key]>,
  ): void {
    this._editorClient?.on(event, listener)
  }

  off<Key extends EditorClientEvent>(
    event: Key,
    listener?: Handler<TEditorClientEventArgs[Key]>,
  ): void {
    this._editorClient?.off(event, listener)
  }
}
