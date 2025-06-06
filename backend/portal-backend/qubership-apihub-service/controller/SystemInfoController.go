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

	mservice "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
)

type SystemInfoController interface {
	GetSystemInfo(w http.ResponseWriter, r *http.Request)
}

func NewSystemInfoController(service service.SystemInfoService, migrationService mservice.DBMigrationService) SystemInfoController {
	return &systemInfoControllerImpl{service: service, migrationService: migrationService}
}

type systemInfoControllerImpl struct {
	service          service.SystemInfoService
	migrationService mservice.DBMigrationService
}

func (g systemInfoControllerImpl) GetSystemInfo(w http.ResponseWriter, r *http.Request) {
	migrationInProgress, err := g.migrationService.IsMigrationInProgress()
	if err != nil {
		RespondWithError(w, "Failed to check if migration is currently in progress", err)
		return
	}
	systemInfo := g.service.GetSystemInfo()
	systemInfo.MigrationInProgress = migrationInProgress
	RespondWithJson(w, http.StatusOK, systemInfo)
}
