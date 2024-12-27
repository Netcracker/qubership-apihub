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
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	ws "github.com/gorilla/websocket"
)

type WsClient struct {
	Connection  *ws.Conn
	SessionId   string
	User        view.User
	ConnectedAt time.Time
	UserColor   string
	mutex       sync.RWMutex
}

func NewWsClient(connection *ws.Conn, sessionId string, user view.User) *WsClient {
	client := &WsClient{
		Connection:  connection,
		SessionId:   sessionId,
		ConnectedAt: time.Now(),
		User:        user,
		UserColor:   generateUserColor(),
		mutex:       sync.RWMutex{},
	}
	return client
}

func (c *WsClient) send(payload interface{}) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	err := c.Connection.WriteJSON(payload)
	if err != nil {
		c.Connection.Close()
		return fmt.Errorf("failed to send message to sess %s: %s", c.SessionId, err.Error())
	}
	return nil
}

func (c *WsClient) MarshalJSON() ([]byte, error) {
	return json.Marshal(&struct {
		SessionId   string    `json:"wsId"`
		User        view.User `json:"user"`
		ConnectedAt time.Time `json:"connectedAt"`
		UserColor   string    `json:"userColor"`
	}{
		SessionId:   c.SessionId,
		User:        c.User,
		ConnectedAt: c.ConnectedAt,
		UserColor:   c.UserColor,
	})
}

func generateUserColor() string {
	r, _ := rand.Int(rand.Reader, big.NewInt(256))
	g, _ := rand.Int(rand.Reader, big.NewInt(256))
	b, _ := rand.Int(rand.Reader, big.NewInt(256))
	return fmt.Sprintf("rgb(%d, %d, %d)", r, g, b)
}
