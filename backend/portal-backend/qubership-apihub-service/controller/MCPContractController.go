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

type MCPContractController interface {
	ListMcpEntities(w http.ResponseWriter, r *http.Request)
	GetMcpEntity(w http.ResponseWriter, r *http.Request)
}

func NewMCPContractController(roleService service.RoleService,
	mcpContractService service.MCPContractService,
	ptHandler service.PackageTransitionHandler) MCPContractController {
	return &mcpContractControllerImpl{
		roleService:        roleService,
		mcpContractService: mcpContractService,
		ptHandler:          ptHandler,
	}
}

type mcpContractControllerImpl struct {
	roleService        service.RoleService
	mcpContractService service.MCPContractService
	ptHandler          service.PackageTransitionHandler
}

func (c *mcpContractControllerImpl) checkReadAccess(w http.ResponseWriter, r *http.Request, packageId string) bool {
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

func (c *mcpContractControllerImpl) ListMcpEntities(w http.ResponseWriter, r *http.Request) {
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
	entitySegment := getStringParam(r, "entity")
	kind, ok := view.McpEntitySegmentToKind[entitySegment]
	if !ok {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "entity", "value": entitySegment},
		})
		return
	}
	mcpEndpoint, _ := url.QueryUnescape(r.URL.Query().Get("mcpEndpoint"))
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
	result, svcErr := c.mcpContractService.ListMcpEntities(packageId, versionName, kind, mcpEndpoint, textFilter, limit, offset)
	if svcErr != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.ptHandler, packageId, "Failed to list MCP entities", svcErr)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, result)
}

func (c *mcpContractControllerImpl) GetMcpEntity(w http.ResponseWriter, r *http.Request) {
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
	mcpEntityId, err := getUnescapedStringParam(r, "mcpEntityId")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "mcpEntityId"},
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

	result, svcErr := c.mcpContractService.GetMcpEntity(packageId, versionName, mcpEntityId, includeData)
	if svcErr != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.ptHandler, packageId, "Failed to get MCP entity", svcErr)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, result)
}
