package controller

import (
	"encoding/json"
	"io/ioutil"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/responder"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type SysAdminController interface {
	GetSystemAdministrators(w http.ResponseWriter, r *http.Request)
	AddSystemAdministrator(w http.ResponseWriter, r *http.Request)
	DeleteSystemAdministrator(w http.ResponseWriter, r *http.Request)
}

func NewSysAdminController(roleService service.RoleService, responder responder.Responder) SysAdminController {
	return &sysAdminControllerImpl{
		roleService: roleService,
		responder:   responder,
	}
}

type sysAdminControllerImpl struct {
	roleService service.RoleService
	responder   responder.Responder
}

func (a sysAdminControllerImpl) GetSystemAdministrators(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges := secctx.IsSysadm(ctx)
	if !sufficientPrivileges {
		a.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	admins, err := a.roleService.GetSystemAdministrators(ctx)
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to get system administrators", err)
		return
	}
	a.responder.RespondWithJson(w, http.StatusOK, admins)
}

func (a sysAdminControllerImpl) AddSystemAdministrator(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges := secctx.IsSysadm(ctx)
	if !sufficientPrivileges {
		a.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		a.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var addSysadmReq view.AddSysadmReq
	err = json.Unmarshal(body, &addSysadmReq)
	if err != nil {
		a.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(addSysadmReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			a.responder.RespondWithCustomError(w, customError)
			return
		}
	}

	admins, err := a.roleService.AddSystemAdministrator(ctx, addSysadmReq.UserId)
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to add system administrator", err)
		return
	}
	a.responder.RespondWithJson(w, http.StatusOK, admins)
}

func (a sysAdminControllerImpl) DeleteSystemAdministrator(w http.ResponseWriter, r *http.Request) {
	userId := getStringParam(r, "userId")
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges := secctx.IsSysadm(ctx)
	if !sufficientPrivileges {
		a.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	err := a.roleService.DeleteSystemAdministrator(ctx, userId)
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to delete system administrator", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
