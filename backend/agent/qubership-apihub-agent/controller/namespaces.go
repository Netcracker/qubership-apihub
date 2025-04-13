package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

type NamespaceController interface {
	ListNamespaces(w http.ResponseWriter, r *http.Request)
}

func NewNamespaceController(namespaceListCache service.NamespaceListCache) NamespaceController {
	return namespaceControllerImpl{namespaceListCache: namespaceListCache}
}

type namespaceControllerImpl struct {
	namespaceListCache service.NamespaceListCache
}

func (n namespaceControllerImpl) ListNamespaces(w http.ResponseWriter, r *http.Request) {

	nss, err := n.namespaceListCache.ListNamespaces()
	if err != nil {
		log.Error("Failed to list namespaces: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to list namespaces",
				Debug:   err.Error()})
		}
		return
	}

	resp := view.NamespacesListResponse{Namespaces: nss, CloudName: n.namespaceListCache.GetCloudName()}
	respondWithJson(w, http.StatusOK, resp)
}
