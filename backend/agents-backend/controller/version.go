package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/agents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/view"
)

type VersionController interface {
	GetVersion(w http.ResponseWriter, r *http.Request)
}

type versionControllerImpl struct {
	version   string
	responder responder.Responder
}

func NewVersionController(version string, resp responder.Responder) VersionController {
	return &versionControllerImpl{
		version:   version,
		responder: resp,
	}
}

func (c *versionControllerImpl) GetVersion(w http.ResponseWriter, r *http.Request) {
	c.responder.RespondWithJson(w, http.StatusOK, view.SystemVersion{Version: c.version})
}
