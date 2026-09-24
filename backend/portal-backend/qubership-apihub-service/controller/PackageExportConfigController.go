package controller

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/responder"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type PackageExportConfigController interface {
	GetConfig(w http.ResponseWriter, r *http.Request)
	SetConfig(w http.ResponseWriter, r *http.Request)
}

func NewPackageExportConfigController(roleService service.RoleService,
	expConfSvc service.PackageExportConfigService,
	ptHandler service.PackageTransitionHandler, responder responder.Responder) PackageExportConfigController {
	return packageExportConfigControllerImpl{roleService: roleService, expConfSvc: expConfSvc, ptHandler: ptHandler, responder: responder}
}

type packageExportConfigControllerImpl struct {
	roleService service.RoleService
	expConfSvc  service.PackageExportConfigService
	ptHandler   service.PackageTransitionHandler
	responder   responder.Responder
}

func (p packageExportConfigControllerImpl) GetConfig(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	packageId := getStringParam(r, "packageId")
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.responder, p.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		p.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	result, err := p.expConfSvc.GetConfig(ctx, packageId)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.responder, p.ptHandler, packageId, "Failed to get package export config", err)
		return
	}

	p.responder.RespondWithJson(w, http.StatusOK, result)
}

func (p packageExportConfigControllerImpl) SetConfig(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.CreateAndUpdatePackagePermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.responder, p.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		p.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	defer r.Body.Close()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		p.responder.RespondWithCustomError(w, &exception.CustomError{
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
		p.responder.RespondWithCustomError(w, &exception.CustomError{
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
			p.responder.RespondWithCustomError(w, customError)
			return
		}
	}

	err = p.expConfSvc.SetConfig(ctx, packageId, req.AllowedOasExtensions)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.responder, p.ptHandler, packageId, "Failed to update package export config", err)
		return
	}

	result, err := p.expConfSvc.GetConfig(ctx, packageId)
	if err != nil {
		p.responder.RespondWithError(w, r, "Failed to get package export config after update", err)
		return
	}

	p.responder.RespondWithJson(w, http.StatusOK, result)
}
