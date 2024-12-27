// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package controller

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type BranchController interface {
	GetProjectBranches(w http.ResponseWriter, r *http.Request)
	GetProjectBranchDetails(w http.ResponseWriter, r *http.Request)
	GetProjectBranchConfigRaw(w http.ResponseWriter, r *http.Request)
	CommitBranchDraftChanges(w http.ResponseWriter, r *http.Request)
	GetProjectBranchContentZip(w http.ResponseWriter, r *http.Request)
	GetProjectBranchFiles(w http.ResponseWriter, r *http.Request)
	GetProjectBranchCommitHistory_deprecated(w http.ResponseWriter, r *http.Request)
	CloneBranch(w http.ResponseWriter, r *http.Request)
	DeleteBranch(w http.ResponseWriter, r *http.Request)
	DeleteBranchDraft(w http.ResponseWriter, r *http.Request)
	GetBranchConflicts(w http.ResponseWriter, r *http.Request)
	AddBranchEditor(w http.ResponseWriter, r *http.Request)
	RemoveBranchEditor(w http.ResponseWriter, r *http.Request)
}

func NewBranchController(branchService service.BranchService,
	commitService service.CommitService,
	projectFilesService service.GitRepoFilesService,
	searchService service.SearchService,
	publishedService service.PublishedService,
	branchEditorsService service.BranchEditorsService,
	wsBranchService service.WsBranchService) BranchController {
	return &branchControllerImpl{
		branchService:        branchService,
		commitService:        commitService,
		projectFilesService:  projectFilesService,
		searchService:        searchService,
		publishedService:     publishedService,
		branchEditorsService: branchEditorsService,
		wsBranchService:      wsBranchService,
	}
}

type branchControllerImpl struct {
	branchService        service.BranchService
	commitService        service.CommitService
	projectFilesService  service.GitRepoFilesService
	searchService        service.SearchService
	publishedService     service.PublishedService
	branchEditorsService service.BranchEditorsService
	wsBranchService      service.WsBranchService
}

func (b branchControllerImpl) GetProjectBranches(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	filter := r.URL.Query().Get("filter")
	branches, err := b.searchService.GetProjectBranches(context.Create(r), projectId, filter)
	if err != nil {
		log.Error("Failed to get project branches: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get project branches",
				Debug:   err.Error()})
		}
		return
	}
	RespondWithJson(w, http.StatusOK, branches)
}

func (b branchControllerImpl) GetProjectBranchDetails(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
		})
		return
	}

	goCtx := context.CreateContextWithSecurity(r.Context(), context.Create(r))
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("GetProjectBranchDetails()"))

	branch, err := b.branchService.GetBranchDetailsEP(goCtx, projectId, branchName, true)
	if err != nil {
		log.Error("Failed to get branch details: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get branch details",
				Debug:   err.Error()})
		}
		return
	}
	branch.RemoveFolders()
	RespondWithJson(w, http.StatusOK, branch)
}

func (b branchControllerImpl) GetProjectBranchConfigRaw(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
		})
		return
	}
	originalStr := r.URL.Query().Get("original")
	original := false
	if originalStr != "" {
		original, err = strconv.ParseBool(originalStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "original", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	goCtx := context.CreateContextWithSecurity(r.Context(), context.Create(r))
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("GetProjectBranchConfigRaw()"))

	var configRaw []byte
	if original {
		configRaw, err = b.branchService.GetBranchRawConfigFromGit(goCtx, projectId, branchName)
	} else {
		configRaw, err = b.branchService.GetBranchRawConfigFromDraft(goCtx, projectId, branchName)
	}
	if err != nil {
		log.Error("Failed to get branch config: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get branch config",
				Debug:   err.Error()})
		}
		return
	}
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write(configRaw)
}

func (b branchControllerImpl) CommitBranchDraftChanges(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
		})
		return
	}
	defer r.Body.Close()
	params, err := getParamsFromBody(r)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	commitMessage, err := getBodyStringParam(params, "comment")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "comment"},
			Debug:   err.Error(),
		})
		return
	}
	if commitMessage == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "comment"},
		})
		return
	}
	newBranchName, err := getBodyStringParam(params, "branch")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "branch"},
			Debug:   err.Error(),
		})
		return
	}
	createMergeRequestParam, err := getBodyBoolParam(params, "createMergeRequest")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectParamType,
			Message: exception.IncorrectParamTypeMsg,
			Params:  map[string]interface{}{"param": "createMergeRequest", "type": "boolean"},
			Debug:   err.Error(),
		})
		return
	}
	createMergeRequest := false
	if createMergeRequestParam != nil {
		createMergeRequest = *createMergeRequestParam
	}

	err = b.commitService.CommitBranchDraftChanges(context.Create(r), projectId, branchName, newBranchName, commitMessage, createMergeRequest)
	if err != nil {
		log.Error("Failed to commit branch draft: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			b.wsBranchService.DisconnectClients(projectId, branchName)
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to commit branch draft",
				Debug:   err.Error()})
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (b branchControllerImpl) GetProjectBranchContentZip(w http.ResponseWriter, r *http.Request) {
	RespondWithCustomError(w, &exception.CustomError{
		Status:  http.StatusNotImplemented,
		Message: "Not implemented"})
}

func (b branchControllerImpl) GetProjectBranchFiles(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
		})
		return
	}

	path, err := url.QueryUnescape(r.URL.Query().Get("path"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "path"},
			Debug:   err.Error(),
		})
		return
	}

	onlyAddable := false
	onlyAddableStr := r.URL.Query().Get("onlyAddable")
	if onlyAddableStr != "" {
		onlyAddable, err = strconv.ParseBool(onlyAddableStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameter,
				Message: exception.InvalidParameterMsg,
				Params:  map[string]interface{}{"param": "onlyAddable"},
				Debug:   err.Error(),
			})
			return
		}
	}

	page := 1
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "page", "type": "int"},
				Debug:   err.Error(),
			})
			return
		}
	}

	limit, customError := getLimitQueryParam(r)
	if customError != nil {
		RespondWithCustomError(w, customError)
		return
	}

	result, err := b.projectFilesService.ListFiles(context.Create(r), projectId, branchName, path, view.PagingParams{Page: page, ItemsPerPage: limit}, onlyAddable)
	if err != nil {
		log.Error("Failed to list files: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to list files",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusOK, view.ListFilesView{Files: result})
}

func (b branchControllerImpl) GetProjectBranchCommitHistory_deprecated(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
		})
		return
	}
	limit, customError := getLimitQueryParam(r)
	if customError != nil {
		RespondWithCustomError(w, customError)
		return
	}
	page := 0
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "page", "type": "int"},
				Debug:   err.Error()})
			return
		}
	}
	changes, err := b.searchService.GetBranchHistory_deprecated(context.Create(r), projectId, branchName, limit, page)
	if err != nil {
		log.Error("Failed to get project branch commit history: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get project branch commit history",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusOK, changes)
}

func (b branchControllerImpl) CloneBranch(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
		})
		return
	}
	defer r.Body.Close()
	params, err := getParamsFromBody(r)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	newBranchName, err := getBodyStringParam(params, "branch")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "branch"},
			Debug:   err.Error(),
		})
		return
	}
	if newBranchName == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "branch"},
		})
		return
	}

	goCtx := context.CreateContextWithSecurity(r.Context(), context.Create(r))
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("CloneBranch()"))

	err = b.branchService.CloneBranch(goCtx, projectId, branchName, newBranchName)
	if err != nil {
		log.Error("Failed to clone branch: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to clone branch",
				Debug:   err.Error()})
		}
		return
	}
	//todo maybe put it in service
	RespondWithJson(w, http.StatusOK, map[string]string{"cloned_branch": newBranchName})
}

func (b branchControllerImpl) DeleteBranch(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
		})
		return
	}

	goCtx := context.CreateContextWithSecurity(r.Context(), context.Create(r))
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("DeleteBranch()"))

	err = b.branchService.DeleteBranch(goCtx, projectId, branchName)
	if err != nil {
		log.Error("Failed to delete branch: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to delete branch",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (b branchControllerImpl) DeleteBranchDraft(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
		})
		return
	}

	goCtx := context.CreateContextWithSecurity(r.Context(), context.Create(r))
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("DeleteBranchDraft()"))

	err = b.branchService.ResetBranchDraft(goCtx, projectId, branchName, true)
	if err != nil {
		log.Error("Failed to delete branch draft: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			b.wsBranchService.DisconnectClients(projectId, branchName)
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to delete branch draft",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (b branchControllerImpl) GetBranchConflicts(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
		})
		return
	}

	goCtx := context.CreateContextWithSecurity(r.Context(), context.Create(r))
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("GetBranchConflicts()"))

	branchConflicts, err := b.branchService.CalculateBranchConflicts(goCtx, projectId, branchName)
	if err != nil {
		log.Error("Failed to get branch conflicts: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			b.wsBranchService.DisconnectClients(projectId, branchName) //todo maybe not needed here
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get branch conflicts",
				Debug:   err.Error()})
		}
		return
	}
	RespondWithJson(w, http.StatusOK, branchConflicts)
}

func (b branchControllerImpl) AddBranchEditor(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
		})
		return
	}

	err = b.branchEditorsService.AddBranchEditor(projectId, branchName, context.Create(r).GetUserId())
	if err != nil {
		log.Error("Failed to add editor: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to add editor",
				Debug:   err.Error()})
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (b branchControllerImpl) RemoveBranchEditor(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
		})
		return
	}

	err = b.branchEditorsService.RemoveBranchEditor(projectId, branchName, context.Create(r).GetUserId())
	if err != nil {
		log.Error("Failed to remove editor: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to remove editor",
				Debug:   err.Error()})
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}
