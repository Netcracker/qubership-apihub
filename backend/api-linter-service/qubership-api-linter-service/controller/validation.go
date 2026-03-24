package controller

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/Netcracker/qubership-api-linter-service/exception"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/service"
	"github.com/Netcracker/qubership-api-linter-service/view"
	log "github.com/sirupsen/logrus"
)

type ValidationController interface {
	ValidateVersion(w http.ResponseWriter, r *http.Request)
	StartBulkValidation(w http.ResponseWriter, r *http.Request)
	GetBulkValidationStatus(w http.ResponseWriter, r *http.Request)
}

func NewValidationController(validationService service.ValidationService, authorizationService service.AuthorizationService) ValidationController {
	return &validationControllerImpl{validationService: validationService, authorizationService: authorizationService}
}

type validationControllerImpl struct {
	validationService    service.ValidationService
	authorizationService service.AuthorizationService
}

func (v *validationControllerImpl) ValidateVersion(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")

	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := v.authorizationService.HasPublishPackagePermission(ctx, packageId)
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

	version, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}

	recalculate := r.URL.Query().Get("recalculate") == "true"
	taskId, err := v.validationService.ValidateVersion(ctx, packageId, version, "", recalculate)
	if err != nil {
		respondWithError(w, "Failed to start version validation", err)
		return
	}

	log.Debugf("Validation task started for packageId %s version %s, taskId is: %s", packageId, version, taskId)

	w.WriteHeader(http.StatusAccepted)
}

func (v *validationControllerImpl) StartBulkValidation(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var req view.BulkValidationRequest

	body, err := io.ReadAll(r.Body)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	if len(body) > 0 {
		if err := json.Unmarshal(body, &req); err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.BadRequestBody,
				Message: exception.BadRequestBodyMsg,
				Debug:   err.Error(),
			})
			return
		}
	}

	if req.PackageId == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "packageId"},
		})
		return
	}

	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := v.authorizationService.HasPublishPackagePermission(ctx, req.PackageId)
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

	jobId, err := v.validationService.StartBulkValidation(ctx, req)
	if err != nil {
		respondWithError(w, "Failed to start bulk validation", err)
		return
	}

	respondWithJson(w, http.StatusAccepted, view.BulkValidationStartResponse{JobId: jobId})
}

func (v *validationControllerImpl) GetBulkValidationStatus(w http.ResponseWriter, r *http.Request) {
	jobId := getStringParam(r, "jobId")

	ctx := secctx.MakeUserContext(r)

	result, err := v.validationService.GetBulkValidationStatus(ctx, jobId)
	if err != nil {
		respondWithError(w, "Failed to get bulk validation status", err)
		return
	}

	respondWithJson(w, http.StatusOK, result)
}
