package controller

import (
	"github.com/Netcracker/qubership-api-linter-service/exception"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/service"
	"net/http"
)

type ValidationResultController interface {
	GetValidationSummaryForVersion(w http.ResponseWriter, r *http.Request)
	GetValidatedDocumentsForVersion(w http.ResponseWriter, r *http.Request)
	GetValidationResultForDocument(w http.ResponseWriter, r *http.Request)
}

func NewValidationResultController(validationService service.ValidationService, authorizationService service.AuthorizationService) ValidationResultController {
	return &validationResultControllerImpl{
		validationService:    validationService,
		authorizationService: authorizationService,
	}
}

type validationResultControllerImpl struct {
	validationService    service.ValidationService
	authorizationService service.AuthorizationService
}

func (v validationResultControllerImpl) GetValidationSummaryForVersion(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")

	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := v.authorizationService.HasReadPackagePermission(ctx, packageId)
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

	versionName, err := getUnescapedStringParam(r, "version")
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

	result, err := v.validationService.GetVersionSummary(ctx, packageId, versionName)
	if err != nil {
		respondWithError(w, "Failed to get version summary", err)
	}
	if result == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.LintResultNotFound,
			Message: exception.LintResultNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId, "version": versionName},
		})
		return
	}
	respondWithJson(w, http.StatusOK, result)
}

func (v validationResultControllerImpl) GetValidatedDocumentsForVersion(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")

	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := v.authorizationService.HasReadPackagePermission(ctx, packageId)
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

	versionName, err := getUnescapedStringParam(r, "version")
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

	result, err := v.validationService.GetValidatedDocuments(ctx, packageId, versionName)
	if err != nil {
		respondWithError(w, "Failed to get validated documents for version", err)
		return
	}
	if result == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.LintResultNotFound,
			Message: exception.LintResultNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId, "version": versionName},
		})
		return
	}
	respondWithJson(w, http.StatusOK, result)
}

func (v validationResultControllerImpl) GetValidationResultForDocument(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")

	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := v.authorizationService.HasReadPackagePermission(ctx, packageId)
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

	versionName, err := getUnescapedStringParam(r, "version")
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

	slug, err := getUnescapedStringParam(r, "slug")
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

	result, err := v.validationService.GetValidationResult(secctx.MakeUserContext(r), packageId, versionName, slug)
	if err != nil {
		respondWithError(w, "Failed to get validation result for document", err)
	}
	if result == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.LintResultNotFound,
			Message: exception.LintResultNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId, "version": versionName},
		})
		return
	}
	respondWithJson(w, http.StatusOK, result)
}
