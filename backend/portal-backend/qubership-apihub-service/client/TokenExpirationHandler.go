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

package client

import (
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type TokenExpirationHandler interface {
	TokenExpired(userId string, integrationType view.GitIntegrationType) (string, *time.Time, error)
}

type TokenExpirationHandlerStub struct {
}

func (t TokenExpirationHandlerStub) TokenExpired(userId string, integrationType view.GitIntegrationType) (string, *time.Time, error) {
	log.Errorf("Token expired! userId: %s, integrationType: %s", userId, integrationType)
	return "", nil, &exception.CustomError{
		Status:  http.StatusNotExtended,
		Code:    exception.IntegrationTokenExpired,
		Message: exception.IntegrationTokenExpiredMsg,
		Params:  map[string]interface{}{"integration": integrationType},
	}
}
