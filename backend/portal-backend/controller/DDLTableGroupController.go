package controller

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/view"
)

type DDLTableGroupController interface {
	ListDdlTableGroups(w http.ResponseWriter, r *http.Request)
	GetGroupedDdlEntities(w http.ResponseWriter, r *http.Request)
	CreateDdlTableGroup(w http.ResponseWriter, r *http.Request)
	UpdateDdlTableGroup(w http.ResponseWriter, r *http.Request)
	DeleteDdlTableGroup(w http.ResponseWriter, r *http.Request)
}

func NewDDLTableGroupController(roleService service.RoleService,
	ddlTableGroupService service.DDLTableGroupService,
	versionService service.VersionService,
	ptHandler service.PackageTransitionHandler,
	responder responder.Responder) DDLTableGroupController {
	return &ddlTableGroupControllerImpl{
		roleService:          roleService,
		ddlTableGroupService: ddlTableGroupService,
		versionService:       versionService,
		ptHandler:            ptHandler,
		responder:            responder,
	}
}

type ddlTableGroupControllerImpl struct {
	roleService          service.RoleService
	ddlTableGroupService service.DDLTableGroupService
	versionService       service.VersionService
	ptHandler            service.PackageTransitionHandler
	responder            responder.Responder
}

func (c *ddlTableGroupControllerImpl) checkReadAccess(w http.ResponseWriter, r *http.Request, packageId string) bool {
	ctx := secctx.MakeUserContext(r)
	ok, err := c.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.responder, c.ptHandler, packageId, "Failed to check user privileges", err)
		return false
	}
	if !ok {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return false
	}
	return true
}

func (c *ddlTableGroupControllerImpl) checkManageVersionAccess(w http.ResponseWriter, r *http.Request, packageId, versionName string) bool {
	ctx := secctx.MakeUserContext(r)
	versionStatus, err := c.versionService.GetVersionStatus(ctx, packageId, versionName)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.responder, c.ptHandler, packageId, "Failed to check user privileges", err)
		return false
	}
	ok, err := c.roleService.HasManageVersionPermission(ctx, packageId, versionStatus)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.responder, c.ptHandler, packageId, "Failed to check user privileges", err)
		return false
	}
	if !ok {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return false
	}
	return true
}

func (c *ddlTableGroupControllerImpl) readJsonRequestBody(w http.ResponseWriter, r *http.Request, req interface{}) bool {
	defer r.Body.Close()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return false
	}
	if err = json.Unmarshal(body, req); err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return false
	}
	if validationErr := utils.ValidateObject(req); validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			c.responder.RespondWithCustomError(w, customError)
			return false
		}
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   validationErr.Error(),
		})
		return false
	}
	return true
}

func (c *ddlTableGroupControllerImpl) ListDdlTableGroups(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	if !c.checkReadAccess(w, r, packageId) {
		return
	}
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	ctx := secctx.MakeUserContext(r)
	result, svcErr := c.ddlTableGroupService.ListDdlTableGroups(ctx, packageId, versionName)
	if svcErr != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.responder, c.ptHandler, packageId, "Failed to list DDL table groups", svcErr)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, result)
}

func (c *ddlTableGroupControllerImpl) GetGroupedDdlEntities(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	if !c.checkReadAccess(w, r, packageId) {
		return
	}
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	groupName, err := getUnescapedStringParam(r, "groupName")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "groupName"},
			Debug:   err.Error(),
		})
		return
	}
	textFilter, _ := url.QueryUnescape(r.URL.Query().Get("textFilter"))
	refPackageId := r.URL.Query().Get("refPackageId")
	limit, limErr := getLimitQueryParam(r)
	if limErr != nil {
		c.responder.RespondWithCustomError(w, limErr)
		return
	}
	offset := 0
	if r.URL.Query().Get("offset") != "" {
		offset, _ = strconv.Atoi(r.URL.Query().Get("offset"))
	}
	ctx := secctx.MakeUserContext(r)
	result, svcErr := c.ddlTableGroupService.GetGroupedDdlEntities(ctx, packageId, versionName, groupName, refPackageId, textFilter, limit, offset)
	if svcErr != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.responder, c.ptHandler, packageId, "Failed to get DDL entities of the group", svcErr)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, result)
}

func (c *ddlTableGroupControllerImpl) CreateDdlTableGroup(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	if !c.checkManageVersionAccess(w, r, packageId, versionName) {
		return
	}
	var req view.CreateDdlTableGroupReq
	if !c.readJsonRequestBody(w, r, &req) {
		return
	}
	ctx := secctx.MakeUserContext(r)
	if err := c.ddlTableGroupService.CreateDdlTableGroup(ctx, packageId, versionName, req); err != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.responder, c.ptHandler, packageId, "Failed to create DDL table group", err)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (c *ddlTableGroupControllerImpl) UpdateDdlTableGroup(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	groupName, err := getUnescapedStringParam(r, "groupName")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "groupName"},
			Debug:   err.Error(),
		})
		return
	}
	if !c.checkManageVersionAccess(w, r, packageId, versionName) {
		return
	}
	var req view.UpdateDdlTableGroupReq
	if !c.readJsonRequestBody(w, r, &req) {
		return
	}
	ctx := secctx.MakeUserContext(r)
	if err := c.ddlTableGroupService.UpdateDdlTableGroup(ctx, packageId, versionName, groupName, req); err != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.responder, c.ptHandler, packageId, "Failed to update DDL table group", err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (c *ddlTableGroupControllerImpl) DeleteDdlTableGroup(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	groupName, err := getUnescapedStringParam(r, "groupName")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "groupName"},
			Debug:   err.Error(),
		})
		return
	}
	if !c.checkManageVersionAccess(w, r, packageId, versionName) {
		return
	}
	ctx := secctx.MakeUserContext(r)
	if err := c.ddlTableGroupService.DeleteDdlTableGroup(ctx, packageId, versionName, groupName); err != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.responder, c.ptHandler, packageId, "Failed to delete DDL table group", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
