package controller

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type DDLContractController interface {
	ListDdlEntities(w http.ResponseWriter, r *http.Request)
	GetDdlEntity(w http.ResponseWriter, r *http.Request)
	GetDdlEntityChanges(w http.ResponseWriter, r *http.Request)
	GetChangedDdlEntities(w http.ResponseWriter, r *http.Request)
	GetDdlEntityChangesSummary(w http.ResponseWriter, r *http.Request)
}

func NewDDLContractController(roleService service.RoleService,
	ddlService service.DDLContractService,
	ptHandler service.PackageTransitionHandler) DDLContractController {
	return &ddlContractControllerImpl{
		roleService: roleService,
		ddlService:  ddlService,
		ptHandler:   ptHandler,
	}
}

type ddlContractControllerImpl struct {
	roleService service.RoleService
	ddlService  service.DDLContractService
	ptHandler   service.PackageTransitionHandler
}

func (c *ddlContractControllerImpl) checkReadAccess(w http.ResponseWriter, r *http.Request, packageId string) bool {
	ctx := context.Create(r)
	ok, err := c.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.ptHandler, packageId, "Failed to check user privileges", err)
		return false
	}
	if !ok {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return false
	}
	return true
}

func (c *ddlContractControllerImpl) ListDdlEntities(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	if !c.checkReadAccess(w, r, packageId) {
		return
	}
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	textFilter, _ := url.QueryUnescape(r.URL.Query().Get("textFilter"))
	limit, limErr := getLimitQueryParam(r)
	if limErr != nil {
		utils.RespondWithCustomError(w, limErr)
		return
	}
	offset := 0
	if r.URL.Query().Get("offset") != "" {
		offset, _ = strconv.Atoi(r.URL.Query().Get("offset"))
	}
	result, svcErr := c.ddlService.ListDdlEntities(packageId, versionName, textFilter, limit, offset)
	if svcErr != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.ptHandler, packageId, "Failed to list DDL entities", svcErr)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, result)
}

func (c *ddlContractControllerImpl) GetDdlEntity(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	if !c.checkReadAccess(w, r, packageId) {
		return
	}
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	ddlEntityId, err := getUnescapedStringParam(r, "ddlEntityId")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "ddlEntityId"},
			Debug:   err.Error(),
		})
		return
	}

	includeData := true
	if r.URL.Query().Get("includeData") != "" {
		includeData, err = strconv.ParseBool(r.URL.Query().Get("includeData"))
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "includeData", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	result, svcErr := c.ddlService.GetDdlEntity(packageId, versionName, ddlEntityId, includeData)
	if svcErr != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.ptHandler, packageId, "Failed to get DDL entity", svcErr)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, result)
}

func (c *ddlContractControllerImpl) GetDdlEntityChanges(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	if !c.checkReadAccess(w, r, packageId) {
		return
	}
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	ddlEntityId, err := getUnescapedStringParam(r, "ddlEntityId")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "ddlEntityId"},
			Debug:   err.Error(),
		})
		return
	}
	previousVersion := r.URL.Query().Get("previousVersion")
	previousVersionPackageId := r.URL.Query().Get("previousVersionPackageId")
	severities, customErr := getListFromParam(r, "severity")
	if customErr != nil {
		utils.RespondWithCustomError(w, customErr)
		return
	}
	for _, severity := range severities {
		if !view.ValidSeverity(severity) {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidParameterValueMsg,
				Params:  map[string]interface{}{"param": "severity", "value": severity},
			})
			return
		}
	}
	result, svcErr := c.ddlService.GetDdlEntityChanges(packageId, versionName, ddlEntityId, previousVersion, previousVersionPackageId, severities)
	if svcErr != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.ptHandler, packageId, "Failed to get DDL entity changes", svcErr)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, result)
}

func (c *ddlContractControllerImpl) GetChangedDdlEntities(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	if !c.checkReadAccess(w, r, packageId) {
		return
	}
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	textFilter, _ := url.QueryUnescape(r.URL.Query().Get("textFilter"))
	previousVersion := r.URL.Query().Get("previousVersion")
	previousVersionPackageId := r.URL.Query().Get("previousVersionPackageId")
	refPackageId := r.URL.Query().Get("refPackageId")
	limit, limErr := getLimitQueryParam(r)
	if limErr != nil {
		utils.RespondWithCustomError(w, limErr)
		return
	}
	page := 0
	if r.URL.Query().Get("page") != "" {
		page, _ = strconv.Atoi(r.URL.Query().Get("page"))
	}
	severities, customErr := getListFromParam(r, "severity")
	if customErr != nil {
		utils.RespondWithCustomError(w, customErr)
		return
	}
	for _, severity := range severities {
		if !view.ValidSeverity(severity) {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidParameterValueMsg,
				Params:  map[string]interface{}{"param": "severity", "value": severity},
			})
			return
		}
	}
	result, svcErr := c.ddlService.GetChangedDdlEntities(packageId, versionName, view.DdlChangesReq{
		PreviousVersion:          previousVersion,
		PreviousVersionPackageId: previousVersionPackageId,
		RefPackageId:             refPackageId,
		Severities:               severities,
		TextFilter:               textFilter,
		Limit:                    limit,
		Offset:                   limit * page,
	})
	if svcErr != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.ptHandler, packageId, "Failed to get changed DDL entities", svcErr)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, result)
}

func (c *ddlContractControllerImpl) GetDdlEntityChangesSummary(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	if !c.checkReadAccess(w, r, packageId) {
		return
	}
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	ddlEntityId, err := getUnescapedStringParam(r, "ddlEntityId")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "ddlEntityId"},
			Debug:   err.Error(),
		})
		return
	}
	previousVersion := r.URL.Query().Get("previousVersion")
	previousVersionPackageId := r.URL.Query().Get("previousVersionPackageId")
	result, svcErr := c.ddlService.GetDdlEntityChangesSummary(packageId, versionName, ddlEntityId, previousVersion, previousVersionPackageId)
	if svcErr != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.ptHandler, packageId, "Failed to get DDL entity changes summary", svcErr)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, result)
}
