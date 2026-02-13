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
