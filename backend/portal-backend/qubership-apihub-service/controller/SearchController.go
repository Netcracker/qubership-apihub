package controller

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type SearchController interface {
	Search_deprecated(w http.ResponseWriter, r *http.Request)
	Search(w http.ResponseWriter, r *http.Request)
}

func NewSearchController(operationService service.OperationService, versionService service.VersionService, monitoringService service.MonitoringService, ddlContractService service.DDLContractService, mcpContractService service.MCPContractService) SearchController {
	return &searchControllerImpl{
		operationService:   operationService,
		versionService:     versionService,
		monitoringService:  monitoringService,
		ddlContractService: ddlContractService,
		mcpContractService: mcpContractService,
	}
}

type searchControllerImpl struct {
	operationService   service.OperationService
	versionService     service.VersionService
	monitoringService  service.MonitoringService
	ddlContractService service.DDLContractService
	mcpContractService service.MCPContractService
}

func (s searchControllerImpl) Search(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	limit, customError := getLimitQueryParam(r)
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
				Debug:   err.Error()})
			return
		}
	}
	searchLevel := getStringParam(r, "searchLevel")

	var searchQuery view.SearchQueryReq
	err = json.Unmarshal(body, &searchQuery)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	if searchQuery.Workspace == "" {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidSearchParameters,
			Message: exception.InvalidSearchParametersMsg,
			Params:  map[string]interface{}{"error": "workspace is required"},
		})
		return
	}
	if strings.Contains(searchQuery.Workspace, ".") {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidSearchParameters,
			Message: exception.InvalidSearchParametersMsg,
			Params:  map[string]interface{}{"error": "workspace must be a top-level identifier (no dots)"},
		})
		return
	}

	if len(searchQuery.PackageIds) == 0 {
		searchQuery.PackageIds = []string{searchQuery.Workspace}
	} else {
		for _, pkgId := range searchQuery.PackageIds {
			if pkgId != searchQuery.Workspace && !strings.HasPrefix(pkgId, searchQuery.Workspace+".") {
				utils.RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidSearchParameters,
					Message: exception.InvalidSearchParametersMsg,
					Params:  map[string]interface{}{"error": fmt.Sprintf("packageId %s does not belong to workspace %s", pkgId, searchQuery.Workspace)},
				})
				return
			}
		}
	}

	searchQuery.Limit = limit
	searchQuery.Page = page

	//// metrics
	s.monitoringService.AddEndpointCall(getTemplatePath(r), view.SearchEndpointOpts{SearchLevel: searchLevel, ApiType: searchQuery.ApiType})

	ctx := secctx.MakeUserContext(r)
	user := secctx.GetUserId(ctx)
	pkgPostfix := "-" + searchQuery.Workspace //TODO: should we count metric per package ?
	s.monitoringService.IncreaseBusinessMetricCounter(user, metrics.GlobalSearchCalled, searchLevel+pkgPostfix)

	start := searchQuery.PublicationDateInterval.StartDate
	end := searchQuery.PublicationDateInterval.EndDate
	now := time.Now()
	if !((!start.IsZero() && start.Year() == (now.Year()-1) && start.Month() == now.Month() && start.Day() == now.Day()) &&
		(!end.IsZero() && end.Year() == now.Year() && end.Month() == now.Month() && end.Day() == now.Day())) {
		s.monitoringService.IncreaseBusinessMetricCounter(user, metrics.GlobalSearchDefaultPublicationDateModified, searchLevel)
	}
	////

	switch searchLevel {
	case view.SearchLevelOperations:
		{
			validationErr := utils.ValidateObject(searchQuery)
			if validationErr != nil {
				if customError, ok := validationErr.(*exception.CustomError); ok {
					utils.RespondWithCustomError(w, customError)
					return
				}
			}

			result, err := s.operationService.GlobalSearchForOperations(ctx, searchQuery)
			if err != nil {
				utils.RespondWithError(w, r, "Failed to perform search for operations", err)
				return
			}
			utils.RespondWithJson(w, http.StatusOK, result)
		}
	case view.SearchLevelPackages:
		{
			searchQueryReq := searchQuery.ToDeprecated()
			validationErr := utils.ValidateObject(searchQueryReq)
			if validationErr != nil {
				if customError, ok := validationErr.(*exception.CustomError); ok {
					utils.RespondWithCustomError(w, customError)
					return
				}
			}

			result, err := s.versionService.SearchForPackages(ctx, searchQueryReq)
			if err != nil {
				utils.RespondWithError(w, r, "Failed to perform search for packages", err)
				return
			}
			utils.RespondWithJson(w, http.StatusOK, result)
		}
	case view.SearchLevelDocuments:
		{
			searchQueryReq := searchQuery.ToDeprecated()
			validationErr := utils.ValidateObject(searchQueryReq)
			if validationErr != nil {
				if customError, ok := validationErr.(*exception.CustomError); ok {
					utils.RespondWithCustomError(w, customError)
					return
				}
			}

			result, err := s.versionService.SearchForDocuments(ctx, searchQueryReq)
			if err != nil {
				utils.RespondWithError(w, r, "Failed to perform search for documents", err)
				return
			}
			utils.RespondWithJson(w, http.StatusOK, result)
		}
	case view.SearchLevelDDL:
		{
			if searchQuery.SearchString == "" {
				utils.RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidSearchParameters,
					Message: exception.InvalidSearchParametersMsg,
					Params:  map[string]interface{}{"error": "searchString is required"},
				})
				return
			}
			if searchQuery.Status == "" {
				utils.RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidSearchParameters,
					Message: exception.InvalidSearchParametersMsg,
					Params:  map[string]interface{}{"error": "status is required"},
				})
				return
			}
			result, err := s.ddlContractService.GlobalSearchForDDL(ctx, searchQuery)
			if err != nil {
				utils.RespondWithError(w, r, "Failed to perform search for DDL contracts", err)
				return
			}
			utils.RespondWithJson(w, http.StatusOK, result)
		}
	case view.SearchLevelMCP:
		{
			if searchQuery.SearchString == "" {
				utils.RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidSearchParameters,
					Message: exception.InvalidSearchParametersMsg,
					Params:  map[string]interface{}{"error": "searchString is required"},
				})
				return
			}
			if searchQuery.Status == "" {
				utils.RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidSearchParameters,
					Message: exception.InvalidSearchParametersMsg,
					Params:  map[string]interface{}{"error": "status is required"},
				})
				return
			}
			result, err := s.mcpContractService.GlobalSearchForMCP(ctx, searchQuery)
			if err != nil {
				utils.RespondWithError(w, r, "Failed to perform search for MCP contracts", err)
				return
			}
			utils.RespondWithJson(w, http.StatusOK, result)
		}
	default:
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "searchLevel", "value": searchLevel},
		})
		return
	}
}

func (s searchControllerImpl) Search_deprecated(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var searchQuery view.SearchQueryReq_deprecated

	err = json.Unmarshal(body, &searchQuery)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(searchQuery)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
			return
		}
	}
	limit, customError := getLimitQueryParam(r)
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
				Debug:   err.Error()})
			return
		}
	}
	searchLevel := getStringParam(r, "searchLevel")
	searchQuery.Limit = limit
	searchQuery.Page = page

	//// metrics
	s.monitoringService.AddEndpointCall(getTemplatePath(r), view.MakeSearchEndpointOptions(searchLevel, searchQuery.OperationSearchParams))

	ctx := secctx.MakeUserContext(r)
	user := secctx.GetUserId(ctx)
	pkgPostfix := ""
	if len(searchQuery.PackageIds) > 0 {
		pkgPostfix += "-" + searchQuery.PackageIds[0] // enrich the search level with pkg id (workspace, group, package). Currently only one item supported in the array.
	}
	s.monitoringService.IncreaseBusinessMetricCounter(user, metrics.GlobalSearchCalled, searchLevel+pkgPostfix)

	start := searchQuery.PublicationDateInterval.StartDate
	end := searchQuery.PublicationDateInterval.EndDate
	now := time.Now()
	if !((!start.IsZero() && start.Year() == (now.Year()-1) && start.Month() == now.Month() && start.Day() == now.Day()) &&
		(!end.IsZero() && end.Year() == now.Year() && end.Month() == now.Month() && end.Day() == now.Day())) {
		// default date interval was modified
		s.monitoringService.IncreaseBusinessMetricCounter(user, metrics.GlobalSearchDefaultPublicationDateModified, searchLevel)
	}
	////

	switch searchLevel {
	case view.SearchLevelOperations:
		{
			searchQueryReq := view.MakeSearchQueryReq(searchQuery)
			result, err := s.operationService.GlobalSearchForOperations(ctx, searchQueryReq)
			if err != nil {
				utils.RespondWithError(w, r, "Failed to perform search for operations", err)
				return
			}
			utils.RespondWithJson(w, http.StatusOK, result)
		}
	case view.SearchLevelPackages:
		{
			result, err := s.versionService.SearchForPackages(ctx, searchQuery)
			if err != nil {
				utils.RespondWithError(w, r, "Failed to perform search for packages", err)
				return
			}
			utils.RespondWithJson(w, http.StatusOK, result)
		}
	case view.SearchLevelDocuments:
		{
			result, err := s.versionService.SearchForDocuments(ctx, searchQuery)
			if err != nil {
				utils.RespondWithError(w, r, "Failed to perform search for documents", err)
				return
			}
			utils.RespondWithJson(w, http.StatusOK, result)
		}
	default:
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "searchLevel", "value": searchLevel},
		})
		return
	}
}
