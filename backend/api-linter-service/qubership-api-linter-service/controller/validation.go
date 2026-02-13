package controller

import (
	"github.com/Netcracker/qubership-api-linter-service/exception"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/service"
	log "github.com/sirupsen/logrus"
	"net/http"
)

type ValidationController interface {
	ValidateVersion(w http.ResponseWriter, r *http.Request)
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

	taskId, err := v.validationService.ValidateVersion(ctx, packageId, version, "")
	if err != nil {
		respondWithError(w, "Failed to start version validation", err)
		return
	}

	log.Debugf("Validation task started for packageId %s version %s, taskId is: %s", packageId, version, taskId)

	w.WriteHeader(http.StatusAccepted)
}
