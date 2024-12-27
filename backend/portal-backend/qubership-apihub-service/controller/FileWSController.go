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
	"encoding/json"
	"io/ioutil"
	"net/http"
	"net/url"

	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	ws "github.com/gorilla/websocket"
)

type FileWSController interface {
	ConnectToFile(w http.ResponseWriter, r *http.Request)
	TestLogWebsocketClient(w http.ResponseWriter, r *http.Request)
	TestGetWebsocketClientMessages(w http.ResponseWriter, r *http.Request)
	TestSendMessageToWebsocket(w http.ResponseWriter, r *http.Request)
}

func NewFileWSController(wsFileEditService service.WsFileEditService, wsLoadBalancer service.WsLoadBalancer, internalWebsocketService service.InternalWebsocketService) FileWSController {
	return &fileWSControllerImpl{
		wsFileEditService:        wsFileEditService,
		wsLoadBalancer:           wsLoadBalancer,
		internalWebsocketService: internalWebsocketService,
	}
}

type fileWSControllerImpl struct {
	wsFileEditService        service.WsFileEditService
	wsLoadBalancer           service.WsLoadBalancer
	internalWebsocketService service.InternalWebsocketService
}

func (c fileWSControllerImpl) ConnectToFile(w http.ResponseWriter, r *http.Request) {
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
	fileId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}

	srv, err := c.wsLoadBalancer.SelectWsServer(projectId, branchName, fileId)
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
		c.wsLoadBalancer.RedirectWs("ws://"+srv+":8080/ws/v1/projects/"+projectId+
			"/branches/"+getStringParam(r, "branchName")+"/files/"+getStringParam(r, "fileId")+token, websocket, r.Header.Get("Sec-Websocket-Key"))
		return
	}

	err = c.wsFileEditService.ConnectToFileEditSession(context.Create(r), projectId, branchName, fileId, wsId, websocket)
	if err != nil {
		log.Error("Failed to ConnectToFileEditSession: ", err.Error())
		//don't send error response, it doesn't work on upgraded connection
		return
	}
	//DO NOT ADD w.Write... since it's not suitable for websocket!
}

func (c fileWSControllerImpl) TestLogWebsocketClient(w http.ResponseWriter, r *http.Request) {
	projectId := r.URL.Query().Get("projectId")
	branchName := url.PathEscape(r.URL.Query().Get("branchName"))
	fileId := url.PathEscape(r.URL.Query().Get("fileId"))
	token := r.URL.Query().Get("token")

	c.internalWebsocketService.LogIncomingFileMessages(r.Host, projectId, branchName, fileId, token)
	w.WriteHeader(http.StatusOK)
}

func (c fileWSControllerImpl) TestGetWebsocketClientMessages(w http.ResponseWriter, r *http.Request) {
	projectId := r.URL.Query().Get("projectId")
	branchName := url.PathEscape(r.URL.Query().Get("branchName"))
	fileId := url.PathEscape(r.URL.Query().Get("fileId"))

	messages := c.internalWebsocketService.GetFileSessionLogs(projectId, branchName, fileId)
	RespondWithJson(w, http.StatusOK, messages)
}

func (c fileWSControllerImpl) TestSendMessageToWebsocket(w http.ResponseWriter, r *http.Request) {
	projectId := r.URL.Query().Get("projectId")
	branchName := url.PathEscape(r.URL.Query().Get("branchName"))
	fileId := url.PathEscape(r.URL.Query().Get("fileId"))
	token := r.URL.Query().Get("token")

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var message interface{}
	err = json.Unmarshal(body, &message)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	c.internalWebsocketService.SendMessageToFileWebsocket(r.Host, projectId, branchName, fileId, token, message)
	w.WriteHeader(http.StatusOK)
}
