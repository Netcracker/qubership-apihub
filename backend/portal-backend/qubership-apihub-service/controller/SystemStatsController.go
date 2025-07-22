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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
)

type SystemStatsController interface {
	GetSystemStats(w http.ResponseWriter, r *http.Request)
}

func NewSystemStatsController(statsService service.SystemStatsService, roleService service.RoleService) SystemStatsController {
	return &systemStatsControllerImpl{
		statsService: statsService,
		roleService:  roleService,
	}
}

type systemStatsControllerImpl struct {
	statsService service.SystemStatsService
	roleService  service.RoleService
}

func (s systemStatsControllerImpl) GetSystemStats(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	sufficientPrivileges := s.roleService.IsSysadm(ctx)
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	stats, err := s.statsService.GetSystemStats(r.Context())
	if err != nil {
		utils.RespondWithError(w, "Failed to get system statistics", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, stats)
}
