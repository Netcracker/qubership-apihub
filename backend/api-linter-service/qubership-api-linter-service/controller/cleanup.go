package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-api-linter-service/exception"
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
}

func NewCleanupController(cleanupService service.CleanupService, authorizationService service.AuthorizationService, systemInfoService service.SystemInfoService) CleanupController {
	return &cleanupControllerImpl{
		cleanupService:       cleanupService,
		authorizationService: authorizationService,
		systemInfoService:    systemInfoService,
	}
}

func (c cleanupControllerImpl) ClearTestData(w http.ResponseWriter, r *http.Request) {
	if c.systemInfoService.IsProductionMode() {
		RespondWithCustomError(w, &exception.CustomError{
			Status: http.StatusNotFound,
		})
	}
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := c.authorizationService.HasRulesetManagementPermission(ctx)
	if err != nil {
		respondWithError(w, "Failed to check permissions", err)
		return
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	testId, err := getUnescapedStringParam(r, "testId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
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
		respondWithError(w, "Failed to clear test data", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
