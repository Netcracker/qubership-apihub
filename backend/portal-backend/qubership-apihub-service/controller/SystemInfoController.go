package controller

import (
	"net/http"

	mservice "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/responder"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
)

type SystemInfoController interface {
	GetSystemInfo(w http.ResponseWriter, r *http.Request)
}

func NewSystemInfoController(service service.SystemInfoService, migrationService mservice.DBMigrationService, responder responder.Responder) SystemInfoController {
	return &systemInfoControllerImpl{service: service, migrationService: migrationService, responder: responder}
}

type systemInfoControllerImpl struct {
	service          service.SystemInfoService
	migrationService mservice.DBMigrationService
	responder        responder.Responder
}

func (g systemInfoControllerImpl) GetSystemInfo(w http.ResponseWriter, r *http.Request) {
	migrationInProgress, err := g.migrationService.IsMigrationInProgress(r.Context())
	if err != nil {
		g.responder.RespondWithError(w, r, "Failed to check if migration is currently in progress", err)
		return
	}
	systemInfo := g.service.GetSystemInfo()
	systemInfo.MigrationInProgress = migrationInProgress
	g.responder.RespondWithJson(w, http.StatusOK, systemInfo)
}
