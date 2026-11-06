package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/service"
)

// NavigationController serves the public guides tree, filtered by the caller's article visibility.
type NavigationController interface {
	GetNavigation(w http.ResponseWriter, r *http.Request)
}

func NewNavigationController(navigationService service.NavigationService, responder responder.Responder) NavigationController {
	return &navigationControllerImpl{navigationService: navigationService, responder: responder}
}

type navigationControllerImpl struct {
	navigationService service.NavigationService
	responder         responder.Responder
}

// GET /api/v1/navigation?scope=generic|package&packageId=&version=
func (n navigationControllerImpl) GetNavigation(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	q := r.URL.Query()
	navigation, err := n.navigationService.GetNavigation(ctx, q.Get("scope"), q.Get("packageId"), q.Get("version"))
	if err != nil {
		n.responder.RespondWithError(w, r, "Failed to get navigation", err)
		return
	}
	n.responder.RespondWithJson(w, http.StatusOK, navigation)
}
