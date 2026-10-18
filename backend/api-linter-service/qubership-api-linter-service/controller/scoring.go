package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-api-linter-service/exception"
	"github.com/Netcracker/qubership-api-linter-service/responder"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/service"
)

type ScoringController interface {
	GetScoringForVersion(w http.ResponseWriter, r *http.Request)
}

func NewScoringController(scoringService service.ScoringService, authorizationService service.AuthorizationService, resp responder.Responder) ScoringController {
	return &scoringControllerImpl{
		scoringService:       scoringService,
		authorizationService: authorizationService,
		responder:            resp,
	}
}

type scoringControllerImpl struct {
	scoringService       service.ScoringService
	authorizationService service.AuthorizationService
	responder            responder.Responder
}

func (s scoringControllerImpl) GetScoringForVersion(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")

	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := s.authorizationService.HasReadPackagePermission(ctx, packageId)
	if err != nil {
		s.responder.RespondWithError(w, "Failed to check permissions", err)
		return
	}
	if !sufficientPrivileges {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}

	result, err := s.scoringService.GetScoringForVersion(ctx, packageId, versionName)
	if err != nil {
		s.responder.RespondWithError(w, "Failed to get scoring", err)
		return
	}
	if result == nil {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.LintResultNotFound,
			Message: exception.LintResultNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId, "version": versionName},
		})
		return
	}
	s.responder.RespondWithJson(w, http.StatusOK, result)
}
