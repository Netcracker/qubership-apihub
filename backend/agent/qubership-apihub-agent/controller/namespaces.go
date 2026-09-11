package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/responder"
	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/Netcracker/qubership-apihub-agent/view"
)

type NamespaceController interface {
	ListNamespaces(w http.ResponseWriter, r *http.Request)
}

func NewNamespaceController(namespaceListCache service.NamespaceListCache, resp responder.Responder) NamespaceController {
	return namespaceControllerImpl{namespaceListCache: namespaceListCache, responder: resp}
}

type namespaceControllerImpl struct {
	namespaceListCache service.NamespaceListCache
	responder          responder.Responder
}

func (n namespaceControllerImpl) ListNamespaces(w http.ResponseWriter, r *http.Request) {

	nss, err := n.namespaceListCache.ListNamespaces()
	if err != nil {
		n.responder.RespondWithError(w, "Failed to list namespaces", err)
		return
	}

	resp := view.NamespacesListResponse{Namespaces: nss, CloudName: n.namespaceListCache.GetCloudName()}
	n.responder.RespondWithJson(w, http.StatusOK, resp)
}
