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
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/utils"
	log "github.com/sirupsen/logrus"
)

type HealthController interface {
	HandleStartupRequest(w http.ResponseWriter, r *http.Request)
	HandleReadyRequest(w http.ResponseWriter, r *http.Request)
	HandleLiveRequest(w http.ResponseWriter, r *http.Request)
	AddStartupCheck(check StartupCheckFunc, name string)
	RunStartupChecks()
}

type StartupCheckFunc func() bool

func NewHealthController() HealthController {
	c := healthControllerImpl{
		startupOk: false,
		checks:    map[string]StartupCheckFunc{},
	}
	return &c
}

type healthControllerImpl struct {
	startupOk bool
	checks    map[string]StartupCheckFunc
}

func (h *healthControllerImpl) HandleStartupRequest(w http.ResponseWriter, r *http.Request) {
	if h.startupOk {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusNotFound)
	}
}

func (h *healthControllerImpl) HandleReadyRequest(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (h *healthControllerImpl) HandleLiveRequest(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (h *healthControllerImpl) AddStartupCheck(check StartupCheckFunc, name string) {
	h.checks[name] = check
}

func (h *healthControllerImpl) RunStartupChecks() {
	utils.SafeAsync(func() {
		ok := true
		for name, check := range h.checks {
			log.Infof("Executing startup check '%s'", name)
			checkOk := check()
			log.Infof("Startup check '%s' returned result: %v", name, checkOk)
			if !checkOk {
				ok = false
			}
		}
		h.startupOk = ok
	})
}
