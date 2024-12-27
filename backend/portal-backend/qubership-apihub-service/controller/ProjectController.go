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
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type ProjectController interface {
	AddProject(w http.ResponseWriter, r *http.Request)
	GetProject(w http.ResponseWriter, r *http.Request)
	GetFilteredProjects(w http.ResponseWriter, r *http.Request)
	UpdateProject(w http.ResponseWriter, r *http.Request)
	DeleteProject(w http.ResponseWriter, r *http.Request)
	FavorProject(w http.ResponseWriter, r *http.Request)
	DisfavorProject(w http.ResponseWriter, r *http.Request)
}

func NewProjectController(projectService service.ProjectService, groupService service.GroupService, searchService service.SearchService) ProjectController {
	return &projectControllerImpl{
		projectService: projectService,
		groupService:   groupService,
		searchService:  searchService}
}

type projectControllerImpl struct {
	projectService service.ProjectService
	groupService   service.GroupService
	searchService  service.SearchService
}

func (p projectControllerImpl) AddProject(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var project view.Project
	err = json.Unmarshal(body, &project)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	group, err := p.groupService.GetGroup(project.GroupId)
	if err != nil {
		log.Error("Failed to add project: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to add project",
				Debug:   err.Error()})
		}
		return
	}
	validationErr := utils.ValidateObject(project)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	if !IsAcceptableAlias(project.Alias) {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AliasContainsForbiddenChars,
			Message: exception.AliasContainsForbiddenCharsMsg,
		})
		return
	}

	resultProject, err := p.projectService.AddProject(context.Create(r), &project, group.Id)
	if err != nil {
		log.Error("Failed to add project: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to add project",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusCreated, resultProject)
}

func (p projectControllerImpl) GetProject(w http.ResponseWriter, r *http.Request) {
	id := getStringParam(r, "projectId")

	var project interface{} //todo remove this
	project, err := p.projectService.GetProject(context.Create(r), id)
	//todo remove this
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			if customError.Status == 404 {
				project, err = p.searchService.GetPackage(context.Create(r), id)
			}
		}
	}

	if err != nil {
		log.Error("Failed to get project: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get project",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusOK, project)
}

func (p projectControllerImpl) GetFilteredProjects(w http.ResponseWriter, r *http.Request) {
	var err error
	filter := r.URL.Query().Get("textFilter")
	groupId := r.URL.Query().Get("groupId")
	onlyFavoriteStr := r.URL.Query().Get("onlyFavorite")
	onlyFavorite := false
	if onlyFavoriteStr != "" {
		onlyFavorite, err = strconv.ParseBool(onlyFavoriteStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "onlyFavorite", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	onlyPublishedStr := r.URL.Query().Get("onlyPublished")
	onlyPublished := false
	if onlyPublishedStr != "" {
		onlyPublished, err = strconv.ParseBool(onlyPublishedStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "onlyPublished", "type": "boolean"},
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
	var filteredObjects interface{}
	if onlyPublished {
		filteredObjects, err = p.searchService.GetFilteredPackages(context.Create(r), filter, groupId, onlyFavorite, onlyPublished)
	} else {
		filteredObjects, err = p.searchService.GetFilteredProjects(context.Create(r), filter, groupId, onlyFavorite, onlyPublished, limit, page)
	}
	if err != nil {
		log.Error("Failed to get projects: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get projects",
				Debug:   err.Error()})
		}
		return
	}
	RespondWithJson(w, http.StatusOK, filteredObjects)
}

func (p projectControllerImpl) UpdateProject(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var newProject *view.Project

	err = json.Unmarshal(body, &newProject)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	newProject.Id = projectId

	savedProject, err := p.projectService.UpdateProject(context.Create(r), newProject)
	if err != nil {
		log.Errorf("Failed to update Project info: %s", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to update Project info",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusOK, savedProject)
}

func (p projectControllerImpl) DeleteProject(w http.ResponseWriter, r *http.Request) {
	id := getStringParam(r, "projectId")
	err := p.projectService.DeleteProject(context.Create(r), id)
	if err != nil {
		log.Error("Failed to delete project: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to delete project",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (p projectControllerImpl) FavorProject(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")

	err := p.projectService.FavorProject(context.Create(r), projectId)
	if err != nil {
		log.Error("Failed to add project to favorites: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to add project to favorites",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (p projectControllerImpl) DisfavorProject(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")

	err := p.projectService.DisfavorProject(context.Create(r), projectId)
	if err != nil {
		log.Error("Failed to remove project from favorites: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to remove project from favorites",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusOK)
}
