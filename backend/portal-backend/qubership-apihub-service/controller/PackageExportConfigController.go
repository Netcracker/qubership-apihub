package controller

import (
	"encoding/json"
	"errors"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"io"
	"net/http"
)

type PackageExportConfigController interface {
	GetConfig(w http.ResponseWriter, r *http.Request)
	SetConfig(w http.ResponseWriter, r *http.Request)
}

func NewPackageExportConfigController(roleService service.RoleService,
	expConfSvc service.PackageExportConfigService,
	ptHandler service.PackageTransitionHandler) PackageExportConfigController {
	return packageExportConfigControllerImpl{roleService: roleService, expConfSvc: expConfSvc, ptHandler: ptHandler}
}

type packageExportConfigControllerImpl struct {
	roleService service.RoleService
	expConfSvc  service.PackageExportConfigService
	ptHandler   service.PackageTransitionHandler
}

func (p packageExportConfigControllerImpl) GetConfig(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")

	result, err := p.expConfSvc.GetConfig(packageId)
	if err != nil {
		RespondWithError(w, "Failed to get package export config", err)
		return
	}

	RespondWithJson(w, http.StatusOK, result)
}

func (p packageExportConfigControllerImpl) SetConfig(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.CreateAndUpdatePackagePermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to check user privileges", err)
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

	defer r.Body.Close()
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
	var req view.PackageExportConfigUpdate
	err = json.Unmarshal(body, &req)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(req)
	if validationErr != nil {
		var customError *exception.CustomError
		if errors.As(validationErr, &customError) {
			RespondWithCustomError(w, customError)
			return
		}
	}

	err = p.expConfSvc.SetConfig(packageId, req.AllowedOasExtensions)
	if err != nil {
		RespondWithError(w, "Failed to update package export config", err)
		return
	}

	result, err := p.expConfSvc.GetConfig(packageId)
	if err != nil {
		RespondWithError(w, "Failed to get package export config after update", err)
		return
	}

	RespondWithJson(w, http.StatusOK, result)
}
