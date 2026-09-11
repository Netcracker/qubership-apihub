package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/responder"
	"github.com/Netcracker/qubership-apihub-agent/secctx"
	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/Netcracker/qubership-apihub-agent/view"
)

type CloudController interface {
	ListAllServices_deprecated(w http.ResponseWriter, r *http.Request)
	StartAllDiscovery_deprecated(w http.ResponseWriter, r *http.Request)
}

func NewCloudController(cloudService service.CloudService, resp responder.Responder) CloudController {
	return &cloudControllerImpl{cloudService: cloudService, responder: resp}
}

type cloudControllerImpl struct {
	cloudService service.CloudService
	responder    responder.Responder
}

func (c cloudControllerImpl) ListAllServices_deprecated(w http.ResponseWriter, r *http.Request) {
	workspaceId := getStringParam(r, "workspaceId")
	//v1 support
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	result := c.cloudService.GetAllServicesList_deprecated(workspaceId)
	c.responder.RespondWithJson(w, http.StatusOK, result)
}

func (c cloudControllerImpl) StartAllDiscovery_deprecated(w http.ResponseWriter, r *http.Request) {
	workspaceId := getStringParam(r, "workspaceId")
	//v1 support
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	err := c.cloudService.StartAllDiscovery_deprecated(secctx.Create(r), workspaceId)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to start discovery all process", err)
		return
	}
	w.WriteHeader(http.StatusAccepted)
}
