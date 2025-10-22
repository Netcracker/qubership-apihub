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
	"crypto/tls"
	"io"
	"net/http"
	"net/url"

	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/service"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
	log "github.com/sirupsen/logrus"
)

const (
	maxHeaders      = 100
	maxHeaderValues = 1000
)

type AgentProxyController interface {
	Proxy(w http.ResponseWriter, req *http.Request)
}

func NewAgentProxyController(agentService service.AgentService) AgentProxyController {
	return &agentProxyControllerImpl{agentService: agentService, tr: http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}}
}

type agentProxyControllerImpl struct {
	agentService service.AgentService
	tr           http.Transport
}

func (a *agentProxyControllerImpl) Proxy(w http.ResponseWriter, r *http.Request) {
	agentId := getStringParam(r, "agentId")
	agent, err := a.agentService.GetAgent(agentId)
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get agent by id - '$id'",
				Debug:   err.Error(),
				Params:  map[string]interface{}{"id": agentId}})
		}
		return
	}
	if agent == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.AgentNotFound,
			Message: exception.AgentNotFoundMsg,
			Params:  map[string]interface{}{"id": agentId}})
		return
	}
	if agent.Status != view.AgentStatusActive {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.InactiveAgent,
			Message: exception.InactiveAgentMsg,
			Params:  map[string]interface{}{"agentId": agentId}})
		return
	}
	if agent.AgentVersion == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.IncompatibleAgentVersion,
			Message: exception.IncompatibleAgentVersionMsg,
			Params:  map[string]interface{}{"version": agent.AgentVersion},
		})
	}
	if agent.CompatibilityError != nil && agent.CompatibilityError.Severity == view.SeverityError {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Message: agent.CompatibilityError.Message,
		})
	}

	agentUrl, _ := url.Parse(agent.AgentUrl)
	r.URL.Host = agentUrl.Host
	r.URL.Scheme = agentUrl.Scheme
	r.Host = agentUrl.Host
	log.Debugf("Sending proxy request to %s", r.URL)
	resp, err := a.tr.RoundTrip(r)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.ProxyFailed,
			Message: exception.ProxyFailedMsg,
			Params:  map[string]interface{}{"url": r.URL.String()},
			Debug:   err.Error(),
		})
		return
	}
	defer resp.Body.Close()
	if err := copyHeader(w.Header(), resp.Header); err != nil {
		RespondWithCustomError(w, err)
		return
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func copyHeader(dst, src http.Header) *exception.CustomError {
	if len(src) > maxHeaders {
		return &exception.CustomError{
			Status:  http.StatusBadGateway,
			Code:    exception.HeadersLimitExceeded,
			Message: exception.HeadersLimitExceededMsg,
			Params:  map[string]interface{}{"maxHeaders": maxHeaders},
		}
	}

	for k, vv := range src {
		if len(vv) > maxHeaderValues {
			return &exception.CustomError{
				Status:  http.StatusBadGateway,
				Code:    exception.HeaderValuesLimitExceeded,
				Message: exception.HeaderValuesLimitExceededMsg,
				Params:  map[string]interface{}{"key": k, "maxValues": maxHeaderValues},
			}
		}
		for _, v := range vv {
			dst.Add(k, v)
		}
	}

	return nil
}
