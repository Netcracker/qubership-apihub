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

import type { Emitter, Handler } from 'mitt'
import mitt from 'mitt'
import type { IPlainTextOperation } from '@otjs/plaintext'
import { PlainTextOperation } from '@otjs/plaintext'
import type { ICursor, IDatabaseAdapter, TDatabaseAdapterEventArgs } from '@otjs/plaintext-editor'
import { DatabaseAdapterEvent } from '@otjs/plaintext-editor'
import type {
  DocumentSnapshotEventData,
  UserCursorEventData,
  UserOperationEventData,
} from '@apihub/entities/ws-file-events'
import { isUserCursorEventData, isUserOperationEventData } from '@apihub/entities/ws-file-events'
import type { UserConnectedEventData } from '@apihub/entities/ws-branch-events'
import { isUserConnectedEventData, isUserDisconnectedEventData } from '@apihub/entities/ws-branch-events'

export type TWSAdapterConstructionOptions = {
  /** Firebase Database Reference. */
  websocket: WebSocket
  initialDocument?: DocumentSnapshotEventData
  /** Unique Identifier of the User. */
  userId: string
  /** Color String (Hex, HSL, RGB, Text etc.) for Cursor/Selection. */
  userColor?: string
  /** Name or Short Name of the User. */
  userName?: string
  users?: UserConnectedEventData[]
  cursors?: UserCursorEventData[]
}

type TUser = {
  userColor: string
  userName: string
}

/**
 * @internal
 * Copy of the Operation and Revision Id just sent.
 */
export type TSentOperation = {
  /** Revision */
  revision: number
  /** Operation Sent to Server */
  operation: IPlainTextOperation
}

/**
 * @public
 * Websocket Server Events.
 */
export enum ServerEvent {
  UserConnected = 'user:connected',
  UserDisconnected = 'user:disconnected',
  UserCursor = 'user:cursor',
  UserOperation = 'user:operation',
  Snapshot = 'server:snapshot',
}

/**
 * @public
 * Database Adapter Interface - This Interface should be implemented over Persistence Layer to have OT capabilities.
 */
export class WSAdapter implements IDatabaseAdapter {
  ws: WebSocket | null
  userId: string
  userName: string
  initialDocument?: DocumentSnapshotEventData
  protected _emitter: Emitter<TDatabaseAdapterEventArgs> = mitt()
  protected _document: IPlainTextOperation = new PlainTextOperation()
  // protected _pendingRevision: any
  protected _revision = 0
  protected _ready = false
  protected _sent: TSentOperation | null = null
  protected _users = new Map<string, TUser>()

  protected onClose: (event: CloseEvent) => void
  protected onMessage: (event: MessageEvent) => void
  handleSnapshot: (document: DocumentSnapshotEventData) => void
  handleConnectedUser: (user: UserConnectedEventData) => void
  handleUserCursor: (user: UserCursorEventData) => void

  constructor(
    { userId, userName, websocket, initialDocument }: TWSAdapterConstructionOptions,
  ) {
    this.userId = userId
    this.userName = userName || this.userId
    this.onClose = this.onclose.bind(this)
    this.onMessage = this.onmessage.bind(this)
    this.handleSnapshot = this._handleSnapshot.bind(this)
    this.handleConnectedUser = this._handleConnectedUser.bind(this)
    this.handleUserCursor = this._handleUserCursor.bind(this)
    this.ws = websocket
    this.initialDocument = initialDocument
    this._initWebSocket(this.ws)
  }

  dispose(): void {
    this._users.clear()
    this.ws?.removeEventListener('close', this.onClose)
    this.ws?.removeEventListener('message', this.onMessage)
  }

  /**
   * Add listener to WA Adapter.
   * @param event - Event name.
   * @param listener - Event handler callback.
   */
  on<Key extends DatabaseAdapterEvent>(
    event: Key,
    listener: Handler<TDatabaseAdapterEventArgs[Key]>,
  ): void {
    this._emitter.on(event, listener)
  }

  /**
   * Remove listener to WS Adapter.
   * @param event - Event name.
   * @param listener - Event handler callback (optional).
   */
  off<Key extends DatabaseAdapterEvent>(
    event: Key,
    listener?: Handler<TDatabaseAdapterEventArgs[Key]>,
  ): void {
    this._emitter.off(event, listener)
  }

  /**
   * Tests if any operation has been done yet on the document.
   */
  isHistoryEmpty(): boolean {
    return this._revision === 0
  }

  /**
   * Returns current state of the document (could be `null`).
   */
  getDocument(): IPlainTextOperation | null {
    return this._document
  }

  /**
   * Add Unique Identifier against current user to mark Cursor and Operations.
   * @param userId - Unique Identifier for current user.
   */
  setUserId(userId: string): void {
    console.log('setUserId', userId)
  }

  /**
   * Set Color to mark current user's Cursor.
   * @param userColor - Hexadecimal Color code of current user's Cursor.
   */
  setUserColor(userColor: string): void {
    console.log('setUserColor', userColor)
  }

  /**
   * Set Username to mark current user's Cursor.
   * @param userName - Name/Short Name of current user.
   */
  setUserName(userName: string): void {
    console.log('setUserName', userName)
  }

  /**
   * Tests if `clientId` matches current user's ID.
   * @param clientId - Unique Identifier for user.
   */
  isCurrentUser(clientId: string): boolean {
    return this.userId === clientId
  }

  /**
   * Send operation, while retrying on connection failure. Returns a Promise with commited status.
   * An exception will be thrown on transaction failure, which should only happen on
   * catastrophic failure like a security rule violation.
   *
   * @param operation - Plain Text Operation to sent to server.
   */
  async sendOperation(operation: IPlainTextOperation): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false
    }

    /** Sanity check that this operation is valid. */
    if (!this._document.canMergeWith(operation)) {
      const error = new InvalidOperationError(
        'sendOperation() called with an invalid operation.',
      )
      this._trigger(DatabaseAdapterEvent.Error, {
        err: error,
        operation: operation.toString(),
        document: this._document.toString(),
      })

      // TODO: WA for OT
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.apihubProductionMode && location.reload()

      throw error
    }

    const value = operation.toJSON()
    this._sent = {
      revision: this._revision,
      operation: operation,
    }
    this.ws?.send(JSON.stringify({
      type: 'operation',
      operation: value,
      revision: this._revision,
    }))

    return true
  }

  /**
   * Send current user's cursor information to server. Returns an empty Promise.
   * @param cursor - Cursor of Current User.
   */
  async sendCursor(cursor: ICursor | null): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !cursor) { return }
    const { position = -1, selectionEnd = -1 } = cursor ? cursor.toJSON() : {}
    this.ws?.send(JSON.stringify({
      type: 'cursor',
      position: position,
      selectionEnd: selectionEnd,
    }))
  }

  protected onclose({ code }: CloseEvent): void {
    console.log(`Websocket is closed with code ${code}`)
    this._trigger(DatabaseAdapterEvent.Ready, false)
  }

  protected onmessage({ data }: MessageEvent): void {
    const parsedData = JSON.parse(data)

    if (isUserConnectedEventData(parsedData)) {
      this._handleConnectedUser(parsedData)
    }

    if (isUserDisconnectedEventData(parsedData)) {
      this._users.delete(parsedData.sessionId)
      this._trigger(DatabaseAdapterEvent.CursorChange, {
        clientId: parsedData.sessionId,
        cursor: null,
      })
    }

    if (isUserCursorEventData(parsedData)) {
      this._handleUserCursor(parsedData)
    }

    if (isUserOperationEventData(parsedData)) {
      this._handleUserOperation(parsedData)
    }
  }

  protected _handleUserCursor(cursor: UserCursorEventData): void {
    const user = this._users.get(cursor.sessionId)
    this._trigger(DatabaseAdapterEvent.CursorChange, {
      clientId: cursor.sessionId,
      cursor: cursor.cursor,
      userColor: user?.userColor,
      userName: user?.userName,
    })
  }

  protected _handleConnectedUser(parsedData: UserConnectedEventData): void {
    this._users.set(parsedData.sessionId, { userColor: parsedData.userColor, userName: parsedData.user.name })
    this._trigger(DatabaseAdapterEvent.CursorChange, {
      clientId: parsedData.sessionId,
      cursor: null,
      userColor: parsedData.userColor,
      userName: parsedData.user.name,
    })
  }

  protected _initWebSocket(ws: WebSocket): void {
    ws.addEventListener('close', this.onClose)
    ws.addEventListener('message', this.onMessage)
  }

  protected _handleSnapshot({ revision, document }: DocumentSnapshotEventData): void {
    this._revision = revision || 0
    this._document = document ? PlainTextOperation.fromJSON(document) : new PlainTextOperation()
    this._trigger(DatabaseAdapterEvent.InitialRevision, undefined)
    this._trigger(DatabaseAdapterEvent.Operation, this._document)

    this._ready = true

    this._trigger(DatabaseAdapterEvent.Ready, true)
  }

  /**
   * Apply incoming changes from newly added child in `history` node of Firebase ref.
   */
  protected _handleUserOperation({ revision, operation }: UserOperationEventData): void {
    this._revision++
    const op = PlainTextOperation.fromJSON(operation)
    if (!this._document.canMergeWith(op)) {
      console.log('Invalid operation', revision, op.toString)
      return
    }
    this._document = this._document.compose(op)

    if (this._sent && revision === this._sent.revision) {
      this._trigger(DatabaseAdapterEvent.Acknowledge, undefined)
    } else {
      this._trigger(DatabaseAdapterEvent.Operation, op)
    }
  }

  /** Trigger an event with optional payload */
  protected _trigger<Key extends keyof TDatabaseAdapterEventArgs>(
    event: Key,
    payload: TDatabaseAdapterEventArgs[Key],
  ): void {
    return this._emitter.emit(event, payload)
  }
}

/**
 * Invalid Operation Error: Executing an Invalid Operation.
 */
export class InvalidOperationError extends Error {
  readonly name: string = 'Invalid Operation Encountered'
  readonly message: string = 'The Operation received was either Invalid or Corrupted, please retry!'
}
