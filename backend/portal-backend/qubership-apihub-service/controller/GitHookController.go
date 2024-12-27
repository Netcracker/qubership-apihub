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
	"io"
	"io/ioutil"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
	"github.com/xanzy/go-gitlab"
)

type GitHookController interface {
	SetGitLabToken(w http.ResponseWriter, r *http.Request)
	HandleEvent(w http.ResponseWriter, r *http.Request)
}

func NewGitHookController(gitHookService service.GitHookService) GitHookController {
	return &gitHookController{
		gitHookService: gitHookService,
	}
}

type gitHookController struct {
	gitHookService service.GitHookService
}

func (c gitHookController) SetGitLabToken(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	ctx := context.Create(r)
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
	var webhookIntegration view.GitLabWebhookIntegration
	err = json.Unmarshal(body, &webhookIntegration)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(webhookIntegration)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	err = c.gitHookService.SetGitLabToken(ctx, projectId, webhookIntegration.SecretToken)
	if err != nil {
		RespondWithError(w, "SetGitLabToken failed", err)
	} else {
		w.WriteHeader(http.StatusOK)
	}
}

func (c gitHookController) HandleEvent(w http.ResponseWriter, r *http.Request) {
	payload, err := io.ReadAll(r.Body)
	if err != nil || len(payload) == 0 {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	log.Debug("Received git hooks event: " + string(payload))

	eventType := gitlab.HookEventType(r)
	event, err := gitlab.ParseWebhook(eventType, payload)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	secretToken := r.Header.Get("X-Gitlab-Token")
	if len(secretToken) == 0 {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusUnauthorized,
			Message: http.StatusText(http.StatusUnauthorized),
		})
	}

	result, err := c.gitHookService.HandleGitLabEvent(eventType, event, secretToken)
	if err != nil {
		RespondWithError(w, "Handle event failed", err)
	} else {
		RespondWithJson(w, http.StatusOK, result)
	}
}
