package controller

import (
	"context"
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/responder"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/secctx"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/service"
)

const failedToGetScoringMsg = "Failed to get scoring"

type ScoringController interface {
	GetScoringForVersion(w http.ResponseWriter, r *http.Request)
	GetScoringForVersion_deprecated(w http.ResponseWriter, r *http.Request)
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
	ctx, packageId, versionName, ok := s.readScoringRequest(w, r)
	if !ok {
		return
	}
	result, err := s.scoringService.GetScoringForVersion(ctx, packageId, versionName)
	if err != nil {
		s.responder.RespondWithError(w, failedToGetScoringMsg, err)
		return
	}
	if result == nil {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.VersionScoreNotFound,
			Message: exception.VersionScoreNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId, "version": versionName},
		})
		return
	}
	s.responder.RespondWithJson(w, http.StatusOK, result)
}

func (s scoringControllerImpl) GetScoringForVersion_deprecated(w http.ResponseWriter, r *http.Request) {
	ctx, packageId, versionName, ok := s.readScoringRequest(w, r)
	if !ok {
		return
	}
	result, err := s.scoringService.GetScoringForVersion_deprecated(ctx, packageId, versionName)
	if err != nil {
		s.responder.RespondWithError(w, failedToGetScoringMsg, err)
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

func (s scoringControllerImpl) readScoringRequest(w http.ResponseWriter, r *http.Request) (context.Context, string, string, bool) {
	packageId := getStringParam(r, "packageId")

	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := s.authorizationService.HasReadPackagePermission(ctx, packageId)
	if err != nil {
		s.responder.RespondWithError(w, "Failed to check permissions", err)
		return nil, "", "", false
	}
	if !sufficientPrivileges {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return nil, "", "", false
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
		return nil, "", "", false
	}
	return ctx, packageId, versionName, true
}
