package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/service"
)

type RegistryController interface {
	GetRegistries(w http.ResponseWriter, r *http.Request)
	GetRepositories(w http.ResponseWriter, r *http.Request)
}

func NewRegistryController(registryService service.RegistryService, resp responder.Responder) RegistryController {
	return registryControllerImpl{
		registryService: registryService,
		responder:       resp,
	}
}

type registryControllerImpl struct {
	registryService service.RegistryService
	responder       responder.Responder
}

// GetRegistries lists what the service is configured to track. It is administrative: the base URLs of the
// internal registries are not something an ordinary library reader needs.
func (c registryControllerImpl) GetRegistries(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	registries, err := c.registryService.ListRegistries(ctx)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get the configured registries", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, registries)
}

func (c registryControllerImpl) GetRepositories(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	repositories, err := c.registryService.ListRepositories(ctx, r.URL.Query().Get("registryId"))
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get the repositories", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, repositories)
}
