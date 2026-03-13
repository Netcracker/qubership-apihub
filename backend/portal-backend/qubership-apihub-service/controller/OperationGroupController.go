package controller

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type OperationGroupController interface {
	GetGroupedOperations(w http.ResponseWriter, r *http.Request)
	CreateOperationGroup(w http.ResponseWriter, r *http.Request)
	DeleteOperationGroup(w http.ResponseWriter, r *http.Request)
	UpdateOperationGroup(w http.ResponseWriter, r *http.Request)
	GetGroupExportTemplate(w http.ResponseWriter, r *http.Request)
	StartOperationGroupPublish(w http.ResponseWriter, r *http.Request)
	GetOperationGroupPublishStatus(w http.ResponseWriter, r *http.Request)
}

func NewOperationGroupController(roleService service.RoleService, operationGroupService service.OperationGroupService, versionService service.VersionService) OperationGroupController {
	return &operationGroupControllerImpl{
		roleService:           roleService,
		operationGroupService: operationGroupService,
		versionService:        versionService,
	}
}

type operationGroupControllerImpl struct {
	roleService           service.RoleService
	operationGroupService service.OperationGroupService
	versionService        service.VersionService
}

func (o operationGroupControllerImpl) GetGroupedOperations(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
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
	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
	}
	_, err = view.ParseApiType(apiType)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "apiType", "value": apiType},
			Debug:   err.Error(),
		})
		return
	}
	groupName, err := getUnescapedStringParam(r, "groupName")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "groupName"},
			Debug:   err.Error(),
		})
		return
	}

	textFilter, err := url.QueryUnescape(r.URL.Query().Get("textFilter"))
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "textFilter"},
			Debug:   err.Error(),
		})
		return
	}

	kind, err := url.QueryUnescape(r.URL.Query().Get("kind"))
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "kind"},
			Debug:   err.Error(),
		})
		return
	}
	apiAudience := r.URL.Query().Get("apiAudience")
	if apiAudience == "all" {
		apiAudience = ""
	}
	if apiAudience != "" && !view.ValidApiAudience(apiAudience) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "apiAudience", "value": apiAudience},
		})
		return
	}
	tag, err := url.QueryUnescape(r.URL.Query().Get("tag"))
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "tag"},
			Debug:   err.Error(),
		})
		return
	}

	limit, customError := getLimitQueryParamWithIncreasedMax(r)
	if customError != nil {
		utils.RespondWithCustomError(w, customError)
		return
	}

	page := 0
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "page", "type": "int"},
				Debug:   err.Error(),
			})
			return
		}
	}
	var deprecated *bool
	deprecatedStr := r.URL.Query().Get("deprecated")
	if deprecatedStr != "" {
		deprecatedBool, err := strconv.ParseBool(deprecatedStr)
		if err == nil {
			deprecated = &deprecatedBool
		}
	}

	emptyTag := false
	if r.URL.Query().Get("emptyTag") != "" {
		emptyTag, err = strconv.ParseBool(r.URL.Query().Get("emptyTag"))
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "emptyTag", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	if emptyTag {
		tag = ""
	}

	documentSlug, err := url.QueryUnescape(r.URL.Query().Get("documentSlug"))
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "documentSlug"},
			Debug:   err.Error(),
		})
		return
	}

	refPackageId, err := url.QueryUnescape(r.URL.Query().Get("refPackageId"))
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "refPackageId"},
			Debug:   err.Error(),
		})
		return
	}
	onlyAddable := false
	if r.URL.Query().Get("onlyAddable") != "" {
		onlyAddable, err = strconv.ParseBool(r.URL.Query().Get("onlyAddable"))
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "onlyAddable", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	groupedOperationListReq := view.OperationListReq{
		Deprecated:   deprecated,
		Kind:         kind,
		EmptyTag:     emptyTag,
		Tag:          tag,
		Limit:        limit,
		Page:         page,
		TextFilter:   textFilter,
		ApiType:      apiType,
		DocumentSlug: documentSlug,
		RefPackageId: refPackageId,
		OnlyAddable:  onlyAddable,
		ApiAudience:  apiAudience,
	}

	groupedOperations, err := o.operationGroupService.GetGroupedOperations(packageId, versionName, apiType, groupName, groupedOperationListReq)
	if err != nil {
		utils.RespondWithError(w, "Failed to get operations from group", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, groupedOperations)
}

func (o operationGroupControllerImpl) CreateOperationGroup(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
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
	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
	}
	_, err = view.ParseApiType(apiType)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "apiType", "value": apiType},
			Debug:   err.Error(),
		})
		return
	}

	versionStatus, err := o.versionService.GetVersionStatus(packageId, versionName)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	sufficientPrivileges, err := o.roleService.HasManageVersionPermission(ctx, packageId, versionStatus)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	err = r.ParseMultipartForm(0)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	defer func() {
		err := r.MultipartForm.RemoveAll()
		if err != nil {
			log.Debugf("failed to remove temporal data: %+v", err)
		}
	}()
	createOperationGroupReq := view.CreateOperationGroupReq{}
	createOperationGroupReq.GroupName = r.FormValue("groupName")
	createOperationGroupReq.Description = r.FormValue("description")
	template, templateFileHeader, err := r.FormFile("template")
	if err != http.ErrMissingFile {
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error()})
			return
		}
		templateData, err := io.ReadAll(template)
		closeErr := template.Close()
		if closeErr != nil {
			log.Debugf("failed to close temporal file: %+v", err)
		}
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error()})
			return
		}
		createOperationGroupReq.Template = templateData
		createOperationGroupReq.TemplateFilename = templateFileHeader.Filename
	} else if r.FormValue("template") != "" {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidGroupExportTemplateType,
			Message: exception.InvalidGroupExportTemplateTypeMsg,
		})
		return
	}

	if apiType != string(view.RestApiType) && createOperationGroupReq.TemplateFilename != "" {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OperationGroupTemplateNotSupported,
			Message: exception.OperationGroupTemplateNotSupportedMsg,
			Params:  map[string]interface{}{"apiType": apiType},
		})
		return
	}

	validationErr := utils.ValidateObject(createOperationGroupReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
			return
		}
	}

	err = o.operationGroupService.CreateOperationGroup(ctx, packageId, versionName, apiType, createOperationGroupReq)
	if err != nil {
		utils.RespondWithError(w, "Failed to create operation group", err)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (o operationGroupControllerImpl) DeleteOperationGroup(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
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
	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
	}
	_, err = view.ParseApiType(apiType)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "apiType", "value": apiType},
			Debug:   err.Error(),
		})
		return
	}
	groupName, err := getUnescapedStringParam(r, "groupName")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "groupName"},
			Debug:   err.Error(),
		})
		return
	}

	versionStatus, err := o.versionService.GetVersionStatus(packageId, versionName)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	sufficientPrivileges, err := o.roleService.HasManageVersionPermission(ctx, packageId, versionStatus)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	err = o.operationGroupService.DeleteOperationGroup(ctx, packageId, versionName, apiType, groupName)
	if err != nil {
		utils.RespondWithError(w, "Failed to delete operation group", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (o operationGroupControllerImpl) UpdateOperationGroup(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
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
	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
	}
	_, err = view.ParseApiType(apiType)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "apiType", "value": apiType},
			Debug:   err.Error(),
		})
		return
	}
	groupName, err := getUnescapedStringParam(r, "groupName")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "groupName"},
			Debug:   err.Error(),
		})
		return
	}

	versionStatus, err := o.versionService.GetVersionStatus(packageId, versionName)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	sufficientPrivileges, err := o.roleService.HasManageVersionPermission(ctx, packageId, versionStatus)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	err = r.ParseMultipartForm(0)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	defer func() {
		err := r.MultipartForm.RemoveAll()
		if err != nil {
			log.Debugf("failed to remove temporal data: %+v", err)
		}
	}()
	updateOperationGroupReq := view.UpdateOperationGroupReq{}
	newGroupName := r.FormValue("groupName")
	if newGroupName != "" {
		updateOperationGroupReq.GroupName = &newGroupName
	}
	description := r.FormValue("description")
	if description != "" {
		updateOperationGroupReq.Description = &description
	}
	template, templateFileHeader, err := r.FormFile("template")
	if err != http.ErrMissingFile {
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error()})
			return
		}
		templateData, err := io.ReadAll(template)
		closeErr := template.Close()
		if closeErr != nil {
			log.Debugf("failed to close temporal file: %+v", err)
		}
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error()})
			return
		}
		updateOperationGroupReq.Template = &view.OperationGroupTemplate{
			TemplateData:     templateData,
			TemplateFilename: templateFileHeader.Filename,
		}
	} else if r.Form.Has("template") {
		if r.FormValue("template") != "" {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidGroupExportTemplateType,
				Message: exception.InvalidGroupExportTemplateTypeMsg,
			})
			return
		}
		updateOperationGroupReq.Template = &view.OperationGroupTemplate{
			TemplateData:     nil,
			TemplateFilename: "",
		}
	}

	if apiType != string(view.RestApiType) && updateOperationGroupReq.Template != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OperationGroupTemplateNotSupported,
			Message: exception.OperationGroupTemplateNotSupportedMsg,
			Params:  map[string]interface{}{"apiType": apiType},
		})
		return
	}

	operationsArrStr := r.FormValue("operations")
	if operationsArrStr != "" {
		var operations []view.GroupOperations
		err = json.Unmarshal([]byte(operationsArrStr), &operations)
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.BadRequestBody,
				Message: exception.BadRequestBodyMsg,
				Debug:   fmt.Sprintf("failed to unmarshal operations field: %v", err.Error()),
			})
			return
		}
		updateOperationGroupReq.Operations = &operations
	}
	validationErr := utils.ValidateObject(updateOperationGroupReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
			return
		}
	}

	err = o.operationGroupService.UpdateOperationGroup(ctx, packageId, versionName, apiType, groupName, updateOperationGroupReq)
	if err != nil {
		utils.RespondWithError(w, "Failed to update operation group", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (o operationGroupControllerImpl) GetGroupExportTemplate(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
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
	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
	}
	_, err = view.ParseApiType(apiType)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "apiType", "value": apiType},
			Debug:   err.Error(),
		})
		return
	}
	if apiType != string(view.RestApiType) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OperationGroupTemplateNotSupported,
			Message: exception.OperationGroupTemplateNotSupportedMsg,
			Params:  map[string]interface{}{"apiType": apiType},
		})
		return
	}
	groupName, err := getUnescapedStringParam(r, "groupName")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "groupName"},
			Debug:   err.Error(),
		})
		return
	}

	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	template, templateFilename, err := o.operationGroupService.GetOperationGroupExportTemplate(packageId, versionName, apiType, groupName)
	if err != nil {
		utils.RespondWithError(w, "Failed to get group export template", err)
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%v", templateFilename))
	w.WriteHeader(http.StatusOK)
	w.Write(template)
}

func (o operationGroupControllerImpl) StartOperationGroupPublish(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	version, err := getUnescapedStringParam(r, "version")
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
	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
	}
	if apiType != string(view.RestApiType) && apiType != string(view.GraphqlApiType) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UnsupportedApiType,
			Message: exception.UnsupportedApiTypeMsg,
			Params:  map[string]interface{}{"param": "apiType", "value": apiType},
		})
		return
	}

	groupName, err := getUnescapedStringParam(r, "groupName")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "groupName"},
			Debug:   err.Error(),
		})
		return
	}
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	defer r.Body.Close()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var req view.OperationGroupPublishReq
	err = json.Unmarshal(body, &req)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(req)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
			return
		}
	}
	_, err = view.ParseVersionStatus(req.Status)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: err.Error(),
		})
		return
	}
	sufficientPrivileges, err = o.roleService.HasManageVersionPermission(ctx, req.PackageId, req.Status)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	publishId, err := o.operationGroupService.StartOperationGroupPublish(ctx, packageId, version, apiType, groupName, req)
	if err != nil {
		utils.RespondWithError(w, "Failed to start operation group publish process", err)
		return
	}
	utils.RespondWithJson(w, http.StatusAccepted, view.OperationGroupPublishResp{PublishId: publishId})
}

func (o operationGroupControllerImpl) GetOperationGroupPublishStatus(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	publishId := getStringParam(r, "publishId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	publishStatus, err := o.operationGroupService.GetOperationGroupPublishStatus(publishId)
	if err != nil {
		utils.RespondWithError(w, "Failed to get operation group publish status", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, publishStatus)
}
