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

	"github.com/Netcracker/qubership-api-linter-service/utils"
)

type HealthController interface {
	HandleReadyRequest(w http.ResponseWriter, r *http.Request)
	HandleLiveRequest(w http.ResponseWriter, r *http.Request)
}

func NewHealthController(readyChan chan bool) HealthController {
	c := healthControllerImpl{ready: false}
	utils.SafeAsync(func() {
		c.watchReady(readyChan)
	})
	return &c
}

type healthControllerImpl struct {
	ready bool
}

func (h healthControllerImpl) HandleReadyRequest(w http.ResponseWriter, r *http.Request) {
	if h.ready {
		w.WriteHeader(http.StatusOK) // any code in (>=200 & <400)
		return
	} else {
		w.WriteHeader(http.StatusNotFound) // any code >= 400
	}
}

func (h healthControllerImpl) HandleLiveRequest(w http.ResponseWriter, r *http.Request) {
	// Just return 200 at this moment
	// TODO: but maybe need to check some internal status
	w.WriteHeader(http.StatusOK)
}

func (h *healthControllerImpl) watchReady(readyChan chan bool) {
	h.ready = <-readyChan
}
