package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/Netcracker/qubership-apihub-agent/view"
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
		respondWithError(w, "Failed to list namespaces", err)
		return
	}

	resp := view.NamespacesListResponse{Namespaces: nss, CloudName: n.namespaceListCache.GetCloudName()}
	respondWithJson(w, http.StatusOK, resp)
}
