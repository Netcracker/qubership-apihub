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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

const (
	UserConnectedType    = "user:connected"
	UserDisconnectedType = "user:disconnected"
)

type UserConnectedPatch struct {
	Type        string    `json:"type" msgpack:"type"`
	SessionId   string    `json:"sessionId"  msgpack:"sessionId"`
	ConnectedAt time.Time `json:"connectedAt"  msgpack:"connectedAt"`
	User        view.User `json:"user"  msgpack:"user"`
	UserColor   string    `json:"userColor"  msgpack:"userColor"`
}

type UserDisconnectedPatch struct {
	Type      string    `json:"type" msgpack:"type"`
	SessionId string    `json:"sessionId" msgpack:"sessionId"`
	User      view.User `json:"user" msgpack:"user"`
}
