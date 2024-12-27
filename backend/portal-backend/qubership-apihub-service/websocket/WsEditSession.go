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
	"encoding/json"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	ws "github.com/gorilla/websocket"
	log "github.com/sirupsen/logrus"
)

// WsEditSession General operations for websocket file/branch edit session
type WsEditSession struct {
	clients              sync.Map
	messageHandler       WsMessageHandler
	sessionClosedHandler SessionClosedHandler
	EditSessionId        string
	registerClientsCh    chan *RegMsg
	OriginatorUserId     string
}

type RegMsg struct {
	client *WsClient
	wg     *sync.WaitGroup
}

func NewWsEditSession(editSessionId string, messageHandler WsMessageHandler, sessionClosedHandler SessionClosedHandler, originatorUserId string) *WsEditSession {
	sess := &WsEditSession{
		clients:              sync.Map{},
		messageHandler:       messageHandler,
		sessionClosedHandler: sessionClosedHandler,
		EditSessionId:        editSessionId,
		OriginatorUserId:     originatorUserId,
		registerClientsCh:    make(chan *RegMsg),
	}

	utils.SafeAsync(func() {
		sess.runClientRegistration()
	})
	log.Debugf("Started WS edit session with id %s", editSessionId)
	return sess
}

func (b *WsEditSession) ConnectClient(wsId string, conn *ws.Conn, user view.User, extWg *sync.WaitGroup) {
	conn.SetReadDeadline(time.Now().Add(PingTime * 2))
	conn.SetPongHandler(func(appData string) error {
		conn.SetReadDeadline(time.Now().Add(PingTime * 2))
		return nil
	})

	var wg sync.WaitGroup
	wg.Add(1)

	b.registerClientsCh <- &RegMsg{NewWsClient(conn, wsId, user), &wg}

	wg.Wait()
	if extWg != nil {
		extWg.Done()
	}

	utils.SafeAsync(func() {
		b.handleIncomingMessages(conn, wsId, user)
	})
}

func (b *WsEditSession) GetClient(wsId string) *WsClient {
	if client, exists := b.clients.Load(wsId); exists {
		return client.(*WsClient)
	}
	return nil
}

func (b *WsEditSession) runClientRegistration() {
	for {
		RegMsg, more := <-b.registerClientsCh
		if RegMsg != nil {
			client := RegMsg.client
			b.clients.Store(client.SessionId, client)

			//send "user:connected" notification to all other connected users
			b.NotifyOthers(client.SessionId,
				UserConnectedPatch{
					Type:        UserConnectedType,
					SessionId:   client.SessionId,
					ConnectedAt: client.ConnectedAt,
					User:        client.User,
					UserColor:   client.UserColor,
				})

			//send "user:connected" notifications for each connected user to the current user
			b.clients.Range(func(key, value interface{}) bool {
				c := value.(*WsClient)
				// use sync send method here
				err := client.send(UserConnectedPatch{
					Type:        UserConnectedType,
					SessionId:   c.SessionId,
					ConnectedAt: c.ConnectedAt,
					User:        c.User,
					UserColor:   c.UserColor,
				})
				if err != nil {
					log.Errorf("Failed to send user:connected %v: %v", client.SessionId, err.Error())
					return false
				}
				return true
			})
			RegMsg.wg.Done()
		}
		if !more {
			return
		}
	}
}

func (b *WsEditSession) NotifyClient(wsId string, message interface{}) {
	utils.SafeAsync(func() {
		v, exists := b.clients.Load(wsId)
		if exists {
			client := v.(*WsClient)
			err := client.send(message)
			if err != nil {
				log.Errorf("Failed to notify client %v: %v", client.SessionId, err.Error())
			}
		} else {
			log.Debugf("Unable to send message '%s' since client %s not found", message, wsId)
		}
	})
}

func (b *WsEditSession) NotifyClientSync(wsId string, message interface{}) {
	v, exists := b.clients.Load(wsId)
	if exists {
		client := v.(*WsClient)
		err := client.send(message)
		if err != nil {
			log.Errorf("Failed to notify client sync %v: %v", client.SessionId, err.Error())
		}
	} else {
		log.Debugf("Unable to send message '%s' since client %s not found", message, wsId)
	}
}

func (b *WsEditSession) NotifyOthers(wsId string, message interface{}) {
	utils.SafeAsync(func() {
		b.clients.Range(func(key, value interface{}) bool {
			c := value.(*WsClient)
			if c.SessionId == wsId {
				return true
			}
			err := c.send(message)
			if err != nil {
				log.Errorf("Failed to notify client %v: %v", c.SessionId, err.Error())
			}
			return true
		})
	})
}

func (b *WsEditSession) NotifyAll(message interface{}) {
	utils.SafeAsync(func() {
		b.clients.Range(func(key, value interface{}) bool {
			c := value.(*WsClient)
			err := c.send(message)
			if err != nil {
				log.Errorf("Failed to notify client %v: %v", c.SessionId, err.Error())
			}
			return true
		})
	})
}

func (b *WsEditSession) handleIncomingMessages(connection *ws.Conn, wsId string, user view.User) {
	defer connection.Close()
	for {
		_, data, err := connection.ReadMessage()
		if err != nil {
			log.Debugf("Connection %v closed: %v", wsId, err.Error())
			b.handleClientDisconnect(wsId)
			break
		}
		if b.messageHandler != nil {
			b.messageHandler.HandleMessage(data, wsId, b)
		}
	}
}

func (b *WsEditSession) handleClientDisconnect(wsId string) {
	v, exists := b.clients.Load(wsId)
	if !exists {
		return
	}
	client := v.(*WsClient)

	b.clients.Delete(wsId)

	clientsCount := 0
	b.clients.Range(func(key, value interface{}) bool {
		clientsCount++
		return true
	})

	if clientsCount > 0 {
		b.NotifyAll(UserDisconnectedPatch{Type: UserDisconnectedType, SessionId: wsId, User: client.User})
		if b.sessionClosedHandler != nil {
			b.sessionClosedHandler.HandleUserDisconnected(b.EditSessionId, wsId)
		}
	} else {
		close(b.registerClientsCh)
		if b.sessionClosedHandler != nil {
			b.sessionClosedHandler.HandleSessionClosed(b.EditSessionId)
		}
		log.Debugf("Closed WS edit session with id %s", b.EditSessionId)
	}
}

func (b *WsEditSession) ForceDisconnectAll() {
	utils.SafeAsync(func() {
		b.clients.Range(func(key, value interface{}) bool {
			c := value.(*WsClient)
			c.Connection.Close()
			return true
		})
	})
}

func (b *WsEditSession) ForceDisconnect(wsId string) {
	v, exists := b.clients.Load(wsId)
	if exists {
		client := v.(*WsClient)
		client.Connection.Close()
	}
}

func (b *WsEditSession) MarshalJSON() ([]byte, error) {
	var clients map[string]*WsClient
	b.clients.Range(func(key, value interface{}) bool {
		clients[key.(string)] = value.(*WsClient)
		return true
	})

	return json.Marshal(&struct {
		Clients          map[string]*WsClient `json:"clients"`
		EditSessionId    string               `json:"editSessionId"`
		OriginatorUserId string               `json:"originatorUserId"`
	}{
		Clients:          clients,
		EditSessionId:    b.EditSessionId,
		OriginatorUserId: b.OriginatorUserId,
	})
}

const PingTime = time.Second * 5

func (b *WsEditSession) SendPingToAllClients() {
	b.clients.Range(func(key, value interface{}) bool {
		client := value.(*WsClient)
		utils.SafeAsync(func() {
			if err := client.Connection.WriteControl(ws.PingMessage, []byte{}, time.Now().Add(PingTime)); err != nil {
				log.Errorf("Can't send ping for %v", client.SessionId)
				log.Debugf("Connection wsId=%v will be closed due to timeout: %v", client.SessionId, err.Error())
				b.handleClientDisconnect(client.SessionId)
				client.Connection.Close()
			}
		})
		return true
	})
}
