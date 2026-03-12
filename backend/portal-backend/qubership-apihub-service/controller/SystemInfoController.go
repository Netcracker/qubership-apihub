package controller

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
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
		utils.RespondWithError(w, "Failed to check if migration is currently in progress", err)
		return
	}
	systemInfo := g.service.GetSystemInfo()
	systemInfo.MigrationInProgress = migrationInProgress
	utils.RespondWithJson(w, http.StatusOK, systemInfo)
}
