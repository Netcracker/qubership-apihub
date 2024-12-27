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

package service

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/cache"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/buraksezer/olric"
	"github.com/gorilla/websocket"
	"github.com/shaj13/libcache"
	log "github.com/sirupsen/logrus"
)

type InternalWebsocketService interface {
	GetBranchSessionLogs(projectId string, branchName string) []interface{}
	GetFileSessionLogs(projectId string, branchName string, fileId string) []interface{}
	LogIncomingBranchMessages(host string, projectId string, branchName string, token string)
	LogIncomingFileMessages(host string, projectId string, branchName string, fileId string, token string)
	SendMessageToFileWebsocket(host string, projectId string, branchName string, fileId string, token string, message interface{})
}

func NewInternalWebsocketService(wsLoadBalancer WsLoadBalancer, op cache.OlricProvider) InternalWebsocketService {
	logsCache := libcache.FIFO.New(0)
	logsCache.SetTTL(time.Hour)
	is := &internalWebsocketServiceImpl{
		logsCache:      logsCache,
		wsLoadBalancer: wsLoadBalancer,
		op:             op,
		isReadyWg:      sync.WaitGroup{},
	}
	is.isReadyWg.Add(1)
	utils.SafeAsync(func() {
		is.initDTopic()
	})
	return is
}

type internalWebsocketServiceImpl struct {
	logsCache      libcache.Cache
	wsLoadBalancer WsLoadBalancer
	op             cache.OlricProvider
	isReadyWg      sync.WaitGroup
	olricC         *olric.Olric
	wsLogMessages  map[string][]interface{}
	wsLogMutex     sync.RWMutex
	wsLogTopic     *olric.DTopic
}

type wsMessage struct {
	SessionId string
	Data      interface{}
}

func (l *internalWebsocketServiceImpl) initDTopic() {
	var err error
	l.olricC = l.op.Get()
	topicName := "ws-log-messages"
	l.wsLogTopic, err = l.olricC.NewDTopic(topicName, 10000, 1)
	if err != nil {
		log.Errorf("Failed to create DTopic: %s", err.Error())
	}
	l.wsLogMessages = make(map[string][]interface{})
	l.wsLogTopic.AddListener(func(topic olric.DTopicMessage) {
		// lock the mutex to prevent concurrent access to the logs map
		l.wsLogMutex.Lock()
		defer l.wsLogMutex.Unlock()

		var wsMsg wsMessage
		if topic.Message != nil {
			err := json.Unmarshal(topic.Message.([]byte), &wsMsg)
			if err != nil {
				log.Errorf("Error while deserializing the ws log message : %s", err)
				return
			}
		}
		messages, ok := l.wsLogMessages[wsMsg.SessionId]
		if !ok {
			messages = make([]interface{}, 0)
		}
		messages = append(messages, wsMsg.Data)
		l.wsLogMessages[wsMsg.SessionId] = messages
	})

	l.isReadyWg.Done()
}

func (l *internalWebsocketServiceImpl) GetBranchSessionLogs(projectId string, branchName string) []interface{} {
	return l.getSessionLogs(makeBranchEditSessionId(projectId, branchName))
}

func (l *internalWebsocketServiceImpl) GetFileSessionLogs(projectId string, branchName string, fileId string) []interface{} {
	return l.getSessionLogs(makeFileEditSessionId(projectId, branchName, fileId))
}

func (l *internalWebsocketServiceImpl) LogIncomingBranchMessages(host string, projectId string, branchName string, token string) {

	srv, err := l.wsLoadBalancer.SelectWsServer(projectId, branchName, "")
	if err != nil {
		log.Errorf("Failed to select ws server: %s", err.Error())
		return
	}
	var wsUrl string
	if srv != LocalServer {
		wsUrl = "ws://" + srv + fmt.Sprintf(":8080/ws/v1/projects/%s/branches/%s?token=%s", projectId, branchName, token)
	} else {
		wsUrl = "ws://" + fmt.Sprintf("localhost:8080/ws/v1/projects/%s/branches/%s?token=%s", projectId, branchName, token)
	}

	sessionId := makeBranchEditSessionId(projectId, branchName)
	utils.SafeAsync(func() {
		l.logIncommingMessages(wsUrl, sessionId)
	})
}

func (l *internalWebsocketServiceImpl) LogIncomingFileMessages(host string, projectId string, branchName string, fileId string, token string) {
	srv, err := l.wsLoadBalancer.SelectWsServer(projectId, branchName, "")
	if err != nil {
		log.Errorf("Failed to select ws server: %s", err.Error())
		return
	}
	var wsUrl string
	if srv != LocalServer {
		wsUrl = "ws://" + srv + fmt.Sprintf(":8080/ws/v1/projects/%s/branches/%s/files/%s?token=%s", projectId, branchName, fileId, token)
	} else {
		wsUrl = "ws://" + fmt.Sprintf("localhost:8080/ws/v1/projects/%s/branches/%s/files/%s?token=%s", projectId, branchName, fileId, token)
	}

	sessionId := makeFileEditSessionId(projectId, branchName, fileId)
	utils.SafeAsync(func() {
		l.logIncommingMessages(wsUrl, sessionId)
	})
}

func (l *internalWebsocketServiceImpl) SendMessageToFileWebsocket(host string, projectId string, branchName string, fileId string, token string, message interface{}) {
	srv, err := l.wsLoadBalancer.SelectWsServer(projectId, branchName, "")
	if err != nil {
		log.Errorf("Failed to select ws server: %s", err.Error())
		return
	}
	var wsUrl string
	if srv != LocalServer {
		wsUrl = "ws://" + srv + fmt.Sprintf(":8080/ws/v1/projects/%s/branches/%s/files/%s?token=%s", projectId, branchName, fileId, token)
	} else {
		wsUrl = "ws://" + host + fmt.Sprintf("/ws/v1/projects/%s/branches/%s/files/%s?token=%s", projectId, branchName, fileId, token)
	}

	utils.SafeAsync(func() {
		l.sendMessageToWebsocket(wsUrl, message)
	})
}

func (l *internalWebsocketServiceImpl) storeSessionLogs(sessionId string, message interface{}) {
	var data wsMessage
	if message != nil {
		data = wsMessage{SessionId: sessionId,
			Data: message,
		}
		serializedMessage, err := json.Marshal(data)
		if err != nil {
			log.Errorf("Error while serializing the ws log message : %s", err)
			return
		}
		err = l.wsLogTopic.Publish(serializedMessage)
		if err != nil {
			log.Errorf("Error while publishing the ws log message : %s", err)
		}
	}
}

func (l *internalWebsocketServiceImpl) getSessionLogs(sessionId string) []interface{} {
	messages, ok := l.wsLogMessages[sessionId]
	if !ok {
		log.Infof("ws log message key not found for sessionId: %s", sessionId)
		return make([]interface{}, 0)
	}
	return messages
}

func (l *internalWebsocketServiceImpl) logIncommingMessages(wsUrl string, sessionId string) {
	ws, _, err := websocket.DefaultDialer.Dial(wsUrl, nil)
	if err != nil {
		log.Errorf("Failed to connect to internal ws : %v , %s ", err.Error(), wsUrl)
		return
	}
	defer ws.Close()

	ws.SetReadDeadline(time.Now().Add(time.Hour))
	for {
		_, message, err := ws.ReadMessage()
		if err != nil {
			log.Debugf("Stop reading from internal ws: %v", err.Error())
			break
		}
		var jsonMessage interface{}
		err = json.Unmarshal(message, &jsonMessage)
		if err != nil {
			log.Debugf("Failed to decode message from internal ws: %v", err.Error())
			continue
		}
		l.storeSessionLogs(sessionId, jsonMessage)
	}
}

func (l *internalWebsocketServiceImpl) sendMessageToWebsocket(wsUrl string, message interface{}) {
	ws, _, err := websocket.DefaultDialer.Dial(wsUrl, nil)
	if err != nil {
		log.Errorf("Failed to connect to internal ws: %v , %s ", err.Error(), wsUrl)
		return
	}
	defer ws.Close()

	if err := ws.WriteJSON(message); err != nil {
		log.Debugf("Failed to send message to internal ws: %v", err.Error())
		return
	}
	time.Sleep(time.Minute * 5) //wait for server to respond
}
