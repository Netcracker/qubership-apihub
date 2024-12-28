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

import { Router } from 'express'
import type { Server } from 'ws'
import type { Socket } from '../../types'
import { TextState } from './text-state'
import type http from 'http'
import { BRANCH_CONFIG } from '../../mocks/projects/branches'
import { getFileContent } from '../packages/packages'

export function ProjectsWsRouter(app: http.Server, branchWss: Server, fileWss: Server): Router {

  const router = Router()

  branchWss.on('connection', (current: Socket) => {
    const connectedClients = [...branchWss.clients]
    current.id = new Date().valueOf().toString()

    connectedClients.forEach((s: Socket) => {
      s.send(JSON.stringify({
        type: 'branch:config:snapshot',
        data: BRANCH_CONFIG,
      }))
    })

    //send current user to other users
    connectedClients.forEach((s: Socket) => {
      s.send(JSON.stringify({
        type: 'user:connected',
        sessionId: current.id,
        connectedAt: new Date().toString(),
        user: {
          id: current.id,
          name: `User ${(current.id)}`,
          avatarUrl: '',
        },
      }))
    })

    //send other users to current user
    connectedClients
      .forEach(({ id }: Socket) => {
        if (id === current.id) {return}
        current.send(JSON.stringify({
          type: 'user:connected',
          sessionId: id,
          connectedAt: new Date().toString(),
          user: {
            id: id,
            name: `User ${id}`,
            avatarUrl: '',
          },
        }))
      })

    current.on('message', (msg: string) => console.log(msg))

    current.on('close', () => {
      branchWss.clients.forEach(s => {
        s.send(JSON.stringify({
          type: 'user:disconnected',
          sessionId: current.id,
          user: {
            id: current.id,
            name: `User ${current.id}`,
            avatarUrl: '',
          },
        }))
      })
    })
  })

  fileWss.on('connection', (current: Socket, fileId: string) => {
    const connectedClients = [...fileWss.clients]
    current.id = new Date().valueOf().toString()
    const textState = new TextState(getFileContent(fileId).toString())

    current.state = {
      userId: current.id!,//req.query.userId as string,
      userName: `User ${(current.id)}`, //req.query.userName as string,
      color: userColor,//req.query.userColor as string,
      revision: 0, //parseInt(req.query.revision as string),
      cursor: null,
    }

    //send current user to other users
    connectedClients
      .filter(({ id }: Socket) => id !== current.id)
      .forEach((s: Socket) => {
        const { state } = current

        if (state) {
          s.send(JSON.stringify({
            type: 'user:connected',
            sessionId: state.userId,
            connectedAt: new Date().toString(),
            user: {
              id: state.userId,
              name: state.userName,
              avatarUrl: '',
            },
            color: state.color,
          }))
        }
      })

    //send other users to current user
    connectedClients
      .forEach(({ state }: Socket) => {
        if (state) {
          current.send(JSON.stringify({
            type: 'user:connected',
            sessionId: state.userId,
            connectedAt: new Date().toString(),
            user: {
              id: state.userId,
              name: state.userName,
              avatarUrl: '',
            },
            color: state.color,
          }))

          const revision = current.state?.revision ?? 0

          current.send(JSON.stringify({
            type: 'document:snapshot',
            revision: state.revision,
            document: textState?.getSnapshot(revision),
            operations: textState?.getOperations(revision),
          }))
        }
      })

    current.on('message', (msg: string) => {
      const parsedData = JSON.parse(msg)
      if (parsedData.type === 'cursor') {
        connectedClients
          .filter(({ id }: Socket) => id !== current.id)
          .forEach((s: Socket) => {
            s.send(JSON.stringify({
              type: 'user:cursor',
              userId: current.id,
              cursor: {
                position: parsedData.position,
                selectionEnd: parsedData.selectionEnd,
              },
            }))
          })
      }

      if (parsedData.type === 'operation') {
        connectedClients.forEach((s: Socket) => {
          s.send(JSON.stringify({
            type: 'user:operation',
            userId: current.id,
            revision: parsedData.position,
            operation: parsedData.operation,
          }))
        })
        textState.clientOperation(parsedData.operation)
      }
    })

    current.on('close', () => {
      fileWss.clients.forEach(s => {
        s.send(JSON.stringify({
          type: 'user:disconnected',
          sessionId: current.id,
          user: {
            id: current.id,
            name: `User ${current.id}`,
            avatarUrl: '',
          },
        }))
      })
    })
  })

  app.on('upgrade', (req, socket, head) => {
    const { url } = req
    if (url?.includes('files')) {
      const fileId = url.substring(url.lastIndexOf('/') + 1, url.indexOf('?'))
      fileWss.handleUpgrade(req, socket, head, (ws) => {
        fileWss.emit('connection', ws, fileId)
      })
    } else {
      branchWss.handleUpgrade(req, socket, head, (ws) => {
        branchWss.emit('connection', ws)
      })
    }
  })

  return router
}

export interface IClientState {
  /** Unique User ID of Remote User */
  userId: string
  /** JSON Representation of User Cursor/Selection */
  cursor: TCursor | null
  /** Color String (Hex, HSL, RGB, Text etc.) for Cursor/Selection. */
  color?: string
  /** Name/Short Name of the Remote User */
  userName?: string
  /** Requested revision */
  revision?: number
}

export type TCursor = {
  /** Starting Position of the Cursor/Selection */
  position: number
  /** Final Position of the Selection */
  selectionEnd: number
}

const randInt = (limit = 1): number => (Math.random() * limit) | 0

const userColor = `rgb(${randInt(255)}, ${randInt(255)}, ${randInt(255)})`
