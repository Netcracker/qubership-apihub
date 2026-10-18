package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-api-linter-service/exception"
	"github.com/Netcracker/qubership-api-linter-service/responder"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/service"
)

type CleanupController interface {
	ClearTestData(w http.ResponseWriter, r *http.Request)
}

type cleanupControllerImpl struct {
	cleanupService       service.CleanupService
	authorizationService service.AuthorizationService
	systemInfoService    service.SystemInfoService
	responder            responder.Responder
}

func NewCleanupController(cleanupService service.CleanupService, authorizationService service.AuthorizationService, systemInfoService service.SystemInfoService, resp responder.Responder) CleanupController {
	return &cleanupControllerImpl{
		cleanupService:       cleanupService,
		authorizationService: authorizationService,
		systemInfoService:    systemInfoService,
		responder:            resp,
	}
}

func (c cleanupControllerImpl) ClearTestData(w http.ResponseWriter, r *http.Request) {
	if c.systemInfoService.IsProductionMode() {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status: http.StatusNotFound,
		})
		return
	}
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := c.authorizationService.HasRulesetManagementPermission(ctx)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to check permissions", err)
		return
	}
	if !sufficientPrivileges {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	testId, err := getUnescapedStringParam(r, "testId")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "testId"},
			Debug:   err.Error(),
		})
		return
	}

	err = c.cleanupService.ClearTestData(ctx, testId)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to clear test data", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
