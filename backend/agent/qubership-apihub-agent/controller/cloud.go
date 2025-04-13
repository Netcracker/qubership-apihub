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
	ListAllServices(w http.ResponseWriter, r *http.Request)
	StartAllDiscovery(w http.ResponseWriter, r *http.Request)
}

func NewCloudController(cloudService service.CloudService) CloudController {
	return &cloudControllerImpl{cloudService: cloudService}
}

type cloudControllerImpl struct {
	cloudService service.CloudService
}

func (c cloudControllerImpl) ListAllServices(w http.ResponseWriter, r *http.Request) {
	workspaceId := getStringParam(r, "workspaceId")
	//v1 support
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	result := c.cloudService.GetAllServicesList(workspaceId)
	respondWithJson(w, http.StatusOK, result)
}

func (c cloudControllerImpl) StartAllDiscovery(w http.ResponseWriter, r *http.Request) {
	workspaceId := getStringParam(r, "workspaceId")
	//v1 support
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	err := c.cloudService.StartAllDiscovery(secctx.Create(r), workspaceId)
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
