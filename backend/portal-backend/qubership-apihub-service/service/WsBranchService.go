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
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/buraksezer/olric"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/websocket"
	log "github.com/sirupsen/logrus"

	ws "github.com/gorilla/websocket"
)

type WsBranchService interface {
	ConnectToProjectBranch(ctx context.SecurityContext, projectId string, branchName string, wsId string, connection *ws.Conn) error
	HasActiveEditSession(projectId string, branchName string) bool
	NotifyProjectBranchUsers(projectId string, branchName string, action interface{})
	NotifyProjectBranchUser(projectId string, branchName string, wsId string, action interface{})
	DisconnectClient(projectId string, branchName string, wsId string)
	DisconnectClients(projectId string, branchName string)
}

func NewWsBranchService(userService UserService, wsLoadBalancer WsLoadBalancer) WsBranchService {
	service := &wsBranchServiceImpl{
		branchEditSessions: make(map[string]*websocket.WsEditSession),
		userService:        userService,
		wsLoadBalancer:     wsLoadBalancer,
		mutex:              sync.RWMutex{},
	}
	utils.SafeAsync(func() {
		service.runAsyncBranchKeepaliveJob()
	})
	utils.SafeAsync(func() {
		_, err := wsLoadBalancer.GetBranchEventTopic().AddListener(service.handleRemoteBranchEvent)
		if err != nil {
			log.Errorf("Failed to subscribe to branch remote events: %s", err.Error())
		}
	})
	return service
}

type wsBranchServiceImpl struct {
	branchEditSessions map[string]*websocket.WsEditSession
	userService        UserService
	wsLoadBalancer     WsLoadBalancer
	mutex              sync.RWMutex
}

func (w *wsBranchServiceImpl) HasActiveEditSession(projectId string, branchName string) bool {
	editSessionId := makeBranchEditSessionId(projectId, branchName)
	if editSessionId == "" {
		log.Errorf("unable to make session id from %s %s", projectId, branchName)
		return false
	}

	_, exists := w.branchEditSessions[editSessionId]
	if !exists {
		hasSession, err := w.wsLoadBalancer.HasBranchEditSession(editSessionId)
		if err != nil {
			log.Errorf("unable to check if branch edit session exists: %s", err.Error())
			return false
		}
		return hasSession
	}
	return exists
}

func (w *wsBranchServiceImpl) ConnectToProjectBranch(ctx context.SecurityContext, projectId string, branchName string, wsId string, connection *ws.Conn) error {
	user, err := w.userService.GetUserFromDB(ctx.GetUserId()) // TODO: maybe store user object in context?
	if err != nil {
		return err
	}
	if user == nil {
		userId := ctx.GetUserId()
		user = &view.User{Id: userId, Name: userId}
	}

	editSessionId := makeBranchEditSessionId(projectId, branchName)
	if editSessionId == "" {
		return fmt.Errorf("unable to make session id from %s %s", projectId, branchName)
	}

	w.mutex.Lock()
	defer w.mutex.Unlock()

	editSession, exists := w.branchEditSessions[editSessionId]
	if !exists {
		editSession = websocket.NewWsEditSession(editSessionId, nil, w, user.Id)
		w.branchEditSessions[editSessionId] = editSession
		metrics.WSBranchEditSessionCount.WithLabelValues().Set(float64(len(w.branchEditSessions)))
	}

	editSession.ConnectClient(wsId, connection, *user, nil)

	return nil
}

func (w *wsBranchServiceImpl) NotifyProjectBranchUsers(projectId string, branchName string, action interface{}) {
	editSessionId := makeBranchEditSessionId(projectId, branchName)
	if editSessionId == "" {
		log.Errorf("unable to make session id from %s %s", projectId, branchName)
		return
	}

	editSession, exists := w.branchEditSessions[editSessionId]
	if !exists {
		err := w.wsLoadBalancer.GetBranchEventTopic().Publish(websocket.BranchEventToMap(websocket.BranchEvent{ProjectId: projectId, BranchName: branchName, Action: action}))
		if err != nil {
			log.Errorf("unable to publish ws branch event: %s", err.Error())
		}
		return
	}
	editSession.NotifyAll(action)
}

func (w *wsBranchServiceImpl) NotifyProjectBranchUser(projectId string, branchName string, wsId string, action interface{}) {
	editSessionId := makeBranchEditSessionId(projectId, branchName)
	if editSessionId == "" {
		log.Errorf("unable to make session id from %s %s", projectId, branchName)
		return
	}

	editSession, exists := w.branchEditSessions[editSessionId]
	if !exists {
		err := w.wsLoadBalancer.GetBranchEventTopic().Publish(websocket.BranchEventToMap(websocket.BranchEvent{ProjectId: projectId, BranchName: branchName, WsId: wsId, Action: action}))
		if err != nil {
			log.Errorf("unable to publish ws branch event for user: %s", err.Error())
		}
		return
	}
	editSession.NotifyClient(wsId, action)
}

func (w *wsBranchServiceImpl) HandleSessionClosed(editSessionId string) {
	w.mutex.Lock()
	defer w.mutex.Unlock()

	delete(w.branchEditSessions, editSessionId)
	metrics.WSBranchEditSessionCount.WithLabelValues().Set(float64(len(w.branchEditSessions)))
}

func (w *wsBranchServiceImpl) HandleUserDisconnected(editSessionId string, wsId string) {
}

func makeBranchEditSessionId(projectId string, branchName string) string {
	id := projectId + stringSeparator + branchName
	if strings.Count(id, stringSeparator) > 1 {
		log.Errorf("Unable to compose correct ws edit session id since names contain string separator")
		return ""
	}
	return id
}

func (w *wsBranchServiceImpl) DisconnectClient(projectId string, branchName string, wsId string) {
	sessionId := makeBranchEditSessionId(projectId, branchName)
	session, exists := w.branchEditSessions[sessionId]
	if !exists {
		return
	}
	session.ForceDisconnect(wsId)
}

func (w *wsBranchServiceImpl) DisconnectClients(projectId string, branchName string) {
	sessionId := makeBranchEditSessionId(projectId, branchName)
	session, exists := w.branchEditSessions[sessionId]
	if !exists {
		return
	}
	session.ForceDisconnectAll()
}

func (w *wsBranchServiceImpl) runAsyncBranchKeepaliveJob() {
	for range time.Tick(websocket.PingTime) {
		for sessId, session := range w.branchEditSessions {
			sessIdTmp := sessId
			sessionTmp := session
			utils.SafeAsync(func() {
				err := w.wsLoadBalancer.TrackSession(sessIdTmp)
				if err != nil {
					log.Errorf("Unable to make keepalive for branch edit session with id = %s: %s", sessIdTmp, err.Error())
				}
			})
			utils.SafeAsync(func() {
				sessionTmp.SendPingToAllClients()
			})
		}
	}
}

func (w *wsBranchServiceImpl) handleRemoteBranchEvent(msg olric.DTopicMessage) {
	eventMap := msg.Message.(map[string]interface{})
	event := websocket.BranchEventFromMap(eventMap)

	editSessionId := makeBranchEditSessionId(event.ProjectId, event.BranchName)

	editSession, exists := w.branchEditSessions[editSessionId]
	if !exists {
		return
	}
	log.Debugf("Got remote branch event: %+v, sessId: %s", event, editSessionId)
	if event.WsId != "" {
		editSession.NotifyClient(event.WsId, event.Action)
	} else {
		editSession.NotifyAll(event.Action)
	}
}
