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

package controller

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/google/uuid"
	ws "github.com/gorilla/websocket"
	log "github.com/sirupsen/logrus"
)

type BranchWSController interface {
	ConnectToProjectBranch(w http.ResponseWriter, r *http.Request)
	DebugSessionsLoadBalance(w http.ResponseWriter, r *http.Request)
	TestLogWebsocketClient(w http.ResponseWriter, r *http.Request)
	TestGetWebsocketClientMessages(w http.ResponseWriter, r *http.Request)
}

func NewBranchWSController(branchService service.BranchService, wsLoadBalancer service.WsLoadBalancer, internalWebsocketService service.InternalWebsocketService) BranchWSController {
	return &branchWSControllerImpl{
		branchService:            branchService,
		wsLoadBalancer:           wsLoadBalancer,
		internalWebsocketService: internalWebsocketService,
	}
}

type branchWSControllerImpl struct {
	branchService            service.BranchService
	wsLoadBalancer           service.WsLoadBalancer
	internalWebsocketService service.InternalWebsocketService
}

func (c branchWSControllerImpl) ConnectToProjectBranch(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
		})
		return
	}

	srv, err := c.wsLoadBalancer.SelectWsServer(projectId, branchName, "")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UnableToSelectWsServer,
			Message: exception.UnableToSelectWsServerMsg,
			Debug:   err.Error(),
		})
		return
	}

	var upgrader = ws.Upgrader{
		//skip origin check
		CheckOrigin: func(r *http.Request) bool { return true },
	}
	websocket, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ConnectionNotUpgraded,
			Message: exception.ConnectionNotUpgradedMsg,
			Debug:   err.Error(),
		})
		return
	}
	wsId := uuid.New().String()
	if srv != service.LocalServer {
		token := "?token=" + strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		c.wsLoadBalancer.RedirectWs("ws://"+srv+":8080/ws/v1/projects/"+projectId+"/branches/"+getStringParam(r, "branchName")+token, websocket, r.Header.Get("Sec-Websocket-Key"))
		return
	}

	goCtx := context.CreateContextWithSecurity(r.Context(), context.Create(r))
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("ConnectToProjectBranch()"))

	err = c.branchService.ConnectToWebsocket(goCtx, projectId, branchName, wsId, websocket)
	if err != nil {
		log.Error("Failed to connect to websocket: ", err.Error())
		//don't send error response, it doesn't work on upgraded connection
		return
	}
	//DO NOT ADD w.Write... since it's not suitable for websocket!
}

func (c branchWSControllerImpl) DebugSessionsLoadBalance(w http.ResponseWriter, r *http.Request) {
	sessions, err := c.wsLoadBalancer.ListSessions()
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Failed to list websocket loadbalancer sessions",
			Debug:   err.Error(),
		})
		return
	}

	nodes, err := c.wsLoadBalancer.ListNodes()
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Failed to list websocket loadbalancer nodes",
			Debug:   err.Error(),
		})
		return
	}

	forwardedSessions := c.wsLoadBalancer.ListForwardedSessions()

	bindAddr := c.wsLoadBalancer.GetBindAddr()

	RespondWithJson(w, http.StatusOK, debugResp{BindAddr: bindAddr, Sessions: sessions, Nodes: nodes, ForwardedSessions: forwardedSessions})
}

type debugResp struct {
	BindAddr          string
	Sessions          []service.WSLoadBalancerSession
	Nodes             []string
	ForwardedSessions []string
}

func (c branchWSControllerImpl) TestLogWebsocketClient(w http.ResponseWriter, r *http.Request) {
	projectId := r.URL.Query().Get("projectId")
	branchName := url.PathEscape(r.URL.Query().Get("branchName"))
	token := r.URL.Query().Get("token")

	c.internalWebsocketService.LogIncomingBranchMessages(r.Host, projectId, branchName, token)
	w.WriteHeader(http.StatusOK)
}

func (c branchWSControllerImpl) TestGetWebsocketClientMessages(w http.ResponseWriter, r *http.Request) {
	projectId := r.URL.Query().Get("projectId")
	branchName := url.PathEscape(r.URL.Query().Get("branchName"))

	messages := c.internalWebsocketService.GetBranchSessionLogs(projectId, branchName)
	RespondWithJson(w, http.StatusOK, messages)
}
