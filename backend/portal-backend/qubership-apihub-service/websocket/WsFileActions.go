// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package websocket

import (
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/ot"
)

const (
	UserCursorOutputType  = "user:cursor"
	OperationOutputType   = "user:operation"
	DocSnapshotOutputType = "document:snapshot"
	UnexpectedMessageType = "message:unexpected"

	UserCursorInputType       = "cursor"
	OperationInputMessageType = "operation"

	DebugStateInputMessageType = "debug_state"
)

type TypedWsMessage struct {
	Type string `json:"type" msgpack:"type"`
}

type UserCursorInput struct {
	Type         string `json:"type" msgpack:"type"`
	Position     int    `json:"position" msgpack:"position"`
	SelectionEnd int    `json:"selectionEnd" msgpack:"selectionEnd"`
}

type UserCursorOutput struct {
	Type      string      `json:"type" msgpack:"type"`
	SessionId string      `json:"sessionId" msgpack:"sessionId"`
	Cursor    CursorValue `json:"cursor" msgpack:"cursor"`
}

type CursorValue struct {
	Position     int `json:"position" msgpack:"position"`
	SelectionEnd int `json:"selectionEnd" msgpack:"selectionEnd"`
}

type OperationInputMessage struct {
	Type      string        `json:"type" msgpack:"type"`
	Revision  int           `json:"revision" msgpack:"revision"`
	Operation []interface{} `json:"operation" msgpack:"operation"`
}

type OperationOutputMessage struct {
	Type      string        `json:"type" msgpack:"type"`
	SessionId string        `json:"sessionId" msgpack:"sessionId"`
	Revision  int           `json:"revision" msgpack:"revision"`
	Operation []interface{} `json:"operation" msgpack:"operation"`
}

type DocSnapshotOutputMessage struct {
	Type     string   `json:"type" msgpack:"type"`
	Revision int      `json:"revision" msgpack:"revision"`
	Document []string `json:"document" msgpack:"document"`
}

type UnexpectedMessage struct {
	Type    string      `json:"type" msgpack:"type"`
	Message interface{} `json:"message" msgpack:"message"`
}

type WsEvent struct {
	EditSessionId string // file or branch id
	WsId          string
	Data          []byte
}

type OpsStatData struct {
	LastSavedRev  int
	SaveTimestamp time.Time
}

type DebugSessionStateOutputMessage struct {
	Session     *WsEditSession
	File        *ot.ServerDoc
	Cursors     map[string]CursorValue
	OpsStatData OpsStatData
}
