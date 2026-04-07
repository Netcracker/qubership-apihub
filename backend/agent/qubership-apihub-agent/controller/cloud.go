package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/secctx"
	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

type CloudController interface {
	ListAllServices_deprecated(w http.ResponseWriter, r *http.Request)
	StartAllDiscovery_deprecated(w http.ResponseWriter, r *http.Request)
}

func NewCloudController(cloudService service.CloudService) CloudController {
	return &cloudControllerImpl{cloudService: cloudService}
}

type cloudControllerImpl struct {
	cloudService service.CloudService
}

func (c cloudControllerImpl) ListAllServices_deprecated(w http.ResponseWriter, r *http.Request) {
	workspaceId := getStringParam(r, "workspaceId")
	//v1 support
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	result := c.cloudService.GetAllServicesList_deprecated(workspaceId)
	respondWithJson(w, http.StatusOK, result)
}

func (c cloudControllerImpl) StartAllDiscovery_deprecated(w http.ResponseWriter, r *http.Request) {
	workspaceId := getStringParam(r, "workspaceId")
	//v1 support
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	err := c.cloudService.StartAllDiscovery_deprecated(secctx.Create(r), workspaceId)
	if err != nil {
		log.Error("Failed to start discovery all process: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to start discovery all process",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusAccepted)
}
