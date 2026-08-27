package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
)

type SystemStatsController interface {
	GetSystemStats(w http.ResponseWriter, r *http.Request)
}

func NewSystemStatsController(statsService service.SystemStatsService) SystemStatsController {
	return &systemStatsControllerImpl{
		statsService: statsService,
	}
}

type systemStatsControllerImpl struct {
	statsService service.SystemStatsService
}

func (s systemStatsControllerImpl) GetSystemStats(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges := secctx.IsSysadm(ctx)
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	stats, err := s.statsService.GetSystemStats(ctx)
	if err != nil {
		utils.RespondWithError(w, r, "Failed to get system statistics", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, stats)
}
