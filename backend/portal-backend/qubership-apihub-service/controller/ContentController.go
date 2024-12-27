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
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	log "github.com/sirupsen/logrus"
)

type ContentController interface {
	GetContent(w http.ResponseWriter, r *http.Request)
	GetContentAsFile(w http.ResponseWriter, r *http.Request)
	UpdateContent(w http.ResponseWriter, r *http.Request)
	UploadContent(w http.ResponseWriter, r *http.Request)
	GetContentHistory(w http.ResponseWriter, r *http.Request)
	GetContentFromCommit(w http.ResponseWriter, r *http.Request)
	GetContentFromBlobId(w http.ResponseWriter, r *http.Request)
	MoveFile(w http.ResponseWriter, r *http.Request)
	DeleteFile(w http.ResponseWriter, r *http.Request)
	AddFile(w http.ResponseWriter, r *http.Request)
	UpdateMetadata(w http.ResponseWriter, r *http.Request)
	ResetFile(w http.ResponseWriter, r *http.Request)
	RestoreFile(w http.ResponseWriter, r *http.Request)
	GetAllContent(w http.ResponseWriter, r *http.Request)
}

func NewContentController(contentService service.DraftContentService,
	branchService service.BranchService,
	searchService service.SearchService,
	wsFileEditService service.WsFileEditService,
	wsBranchService service.WsBranchService,
	systemInfoService service.SystemInfoService) ContentController {
	return &contentControllerImpl{
		contentService:    contentService,
		branchService:     branchService,
		searchService:     searchService,
		wsFileEditService: wsFileEditService,
		wsBranchService:   wsBranchService,
		systemInfoService: systemInfoService,
	}
}

type contentControllerImpl struct {
	contentService    service.DraftContentService
	branchService     service.BranchService
	searchService     service.SearchService
	wsFileEditService service.WsFileEditService
	wsBranchService   service.WsBranchService
	systemInfoService service.SystemInfoService
}

func (c contentControllerImpl) GetContent(w http.ResponseWriter, r *http.Request) {
	contentId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}
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

	content, err := c.contentService.GetContentFromDraftOrGit(context.Create(r), projectId, branchName, contentId)
	if err != nil {
		log.Error("Failed to get content: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get content",
				Debug:   err.Error()})
		}
		return
	}
	w.Header().Set("Content-Type", content.DataType)
	w.WriteHeader(http.StatusOK)
	w.Write(content.Data)
}

func (c contentControllerImpl) GetContentAsFile(w http.ResponseWriter, r *http.Request) {
	contentId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}
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
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("GetContentAsFile()"))

	content, err := c.branchService.GetContentNoData(goCtx, projectId, branchName, contentId)
	if err != nil {
		log.Error("Failed to get content as file: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get content as file",
				Debug:   err.Error()})
		}
		return
	}
	var fileName string
	var data []byte

	var contentData *view.ContentData
	contentData, err = c.contentService.GetContentFromDraftOrGit(context.Create(r), projectId, branchName, contentId)
	if err != nil {
		log.Error("Failed to get content as file: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get content as file",
				Debug:   err.Error()})
		}
		return
	}
	data = contentData.Data
	fileName = content.Name

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%v", fileName))
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (c contentControllerImpl) UpdateContent(w http.ResponseWriter, r *http.Request) {
	contentId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}
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
	data, err := ioutil.ReadAll(r.Body)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	//todo validate body here if it is not done on frontend
	err = c.contentService.UpdateDraftContentData(context.Create(r), projectId, branchName, contentId, data)
	if err != nil {
		log.Error("Failed to update content: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			c.wsBranchService.DisconnectClients(projectId, branchName)
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to update content",
				Debug:   err.Error()})
		}
		return
	}

	c.wsFileEditService.SetFileContent(projectId, branchName, contentId, data)

	w.WriteHeader(http.StatusOK)
}

func (c contentControllerImpl) UploadContent(w http.ResponseWriter, r *http.Request) {
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

	if r.ContentLength > c.systemInfoService.GetBranchContentSizeLimitMB() {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BranchContentSizeExceeded,
			Message: exception.BranchContentSizeExceededMsg,
			Params:  map[string]interface{}{"size": c.systemInfoService.GetBranchContentSizeLimitMB()},
		})
		return
	}

	err = r.ParseMultipartForm(0)
	if err != nil {
		if strings.Contains(err.Error(), "http: request body too large") {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.BranchContentSizeExceeded,
				Message: exception.BranchContentSizeExceededMsg,
				Params:  map[string]interface{}{"size": c.systemInfoService.GetBranchContentSizeLimitMB()},
			})
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.BadRequestBody,
				Message: exception.BadRequestBodyMsg,
				Debug:   err.Error(),
			})
		}
		return
	}
	defer func() {
		err := r.MultipartForm.RemoveAll()
		if err != nil {
			log.Debugf("failed to remove temporal data: %+v", err)
		}
	}()
	publishStr := r.FormValue("publish")
	publish := true
	if publishStr != "" {
		publish, err = strconv.ParseBool(publishStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "publish", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	ctx := context.Create(r)
	var contentToSave []view.Content
	var contentDataToSave []view.ContentData
	path := r.FormValue("path")
	for _, files := range r.MultipartForm.File {
		for _, f := range files {
			file, err := f.Open()
			if err != nil {
				log.Error("Failed to upload content:", err.Error())
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusInternalServerError,
					Message: "Failed to upload content",
					Debug:   err.Error()})
				return
			}
			data, err := ioutil.ReadAll(file)
			closeErr := file.Close()
			if closeErr != nil {
				log.Debugf("failed to close temporal file: %+v", err)
			}
			if err != nil {
				log.Error("Failed to upload content:", err.Error())
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusInternalServerError,
					Message: "Failed to upload content",
					Debug:   err.Error()})
				return
			}
			contentToSave = append(contentToSave, view.Content{Name: f.Filename, Path: path, Publish: publish})
			contentDataToSave = append(contentDataToSave, view.ContentData{Data: data})
		}
	}
	if len(contentToSave) == 0 {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.NoFilesSent,
			Message: exception.NoFilesSentMsg,
		})
		return
	}

	resultFileIds, err := c.contentService.CreateDraftContentWithData(ctx, projectId, branchName, contentToSave, contentDataToSave)
	if err != nil {
		log.Error("Failed to upload content: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to upload content",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusOK, view.ContentAddResponse{FileIds: resultFileIds})
}

func (c contentControllerImpl) GetContentHistory(w http.ResponseWriter, r *http.Request) {
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
	fileId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
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
	fileHistory, err := c.searchService.GetContentHistory(context.Create(r), projectId, branchName, fileId, limit, page)
	if err != nil {
		log.Error("Failed to get content changes: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get content changes",
				Debug:   err.Error()})
		}
		return
	}
	RespondWithJson(w, http.StatusOK, fileHistory)
}

func (c contentControllerImpl) MoveFile(w http.ResponseWriter, r *http.Request) {
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
	fileId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
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

	newFileId, err := getBodyStringParam(params, "newFileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "newFileId"},
			Debug:   err.Error(),
		})
		return
	}
	if newFileId == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "newFileId"},
		})
		return
	}
	err = c.contentService.ChangeFileId(context.Create(r), projectId, branchName, fileId, newFileId)
	if err != nil {
		log.Error("Failed to change fileId: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			c.wsBranchService.DisconnectClients(projectId, branchName)
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to change fileId",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (c contentControllerImpl) DeleteFile(w http.ResponseWriter, r *http.Request) {
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
	fileId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}
	deleteStr := r.URL.Query().Get("delete")
	deleteFromGit := false
	if deleteStr != "" {
		deleteFromGit, err = strconv.ParseBool(deleteStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "delete", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	if deleteFromGit {
		err = c.contentService.DeleteFile(context.Create(r), projectId, branchName, fileId)
	} else {
		err = c.contentService.ExcludeFile(context.Create(r), projectId, branchName, fileId)
	}

	if err != nil {
		log.Error("Failed to delete file: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			c.wsBranchService.DisconnectClients(projectId, branchName)
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to delete file",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (c contentControllerImpl) AddFile(w http.ResponseWriter, r *http.Request) {
	var err error
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

	source, err := getBodyStringParam(params, "source")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "source"},
			Debug:   err.Error(),
		})
		return
	}
	if source == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "source"},
		})
		return
	}
	publishParam, err := getBodyBoolParam(params, "publish")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "publish"},
			Debug:   err.Error(),
		})
		return
	}
	publish := true
	if publishParam != nil {
		publish = *publishParam
	}
	dataObj, err := getBodyObjectParam(params, "data")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "data"},
			Debug:   err.Error(),
		})
		return
	}
	var resultFileIds []string

	switch source {
	case "git":
		{
			paths, parseErr := getBodyStrArrayParam(dataObj, "paths")
			if len(paths) == 0 {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.EmptyParameter,
					Message: exception.EmptyParameterMsg,
					Params:  map[string]interface{}{"param": "paths"},
				})
				return
			}
			if parseErr != nil {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidParameter,
					Message: exception.InvalidParameterMsg,
					Params:  map[string]interface{}{"param": "paths"},
					Debug:   parseErr.Error(),
				})
				return
			}
			resultFileIds, err = c.contentService.AddGitFiles(context.Create(r), projectId, branchName, paths, publish)
		}
	case "url":
		{
			url, parseErr := getBodyStringParam(dataObj, "url")
			if parseErr != nil {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidParameter,
					Message: exception.InvalidParameterMsg,
					Params:  map[string]interface{}{"param": "url"},
					Debug:   parseErr.Error(),
				})
				return
			}
			if url == "" {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.EmptyParameter,
					Message: exception.EmptyParameterMsg,
					Params:  map[string]interface{}{"param": "url"},
				})
				return
			}
			path, parseErr := getBodyStringParam(dataObj, "path")
			if parseErr != nil {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidParameter,
					Message: exception.InvalidParameterMsg,
					Params:  map[string]interface{}{"param": "path"},
					Debug:   parseErr.Error(),
				})
				return
			}
			resultFileIds, err = c.contentService.AddFileFromUrl(context.Create(r), projectId, branchName, url, path, publish)
		}
	case "new":
		{
			fileName, parseErr := getBodyStringParam(dataObj, "name")
			if parseErr != nil {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidParameter,
					Message: exception.InvalidParameterMsg,
					Params:  map[string]interface{}{"param": "name"},
					Debug:   parseErr.Error(),
				})
				return
			}
			if fileName == "" {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.EmptyParameter,
					Message: exception.EmptyParameterMsg,
					Params:  map[string]interface{}{"param": "name"},
				})
				return
			}
			filePath, parseErr := getBodyStringParam(dataObj, "path")
			if parseErr != nil {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidParameter,
					Message: exception.InvalidParameterMsg,
					Params:  map[string]interface{}{"param": "path"},
					Debug:   parseErr.Error(),
				})
				return
			}
			fileTypeStr, parseErr := getBodyStringParam(dataObj, "type")
			if parseErr != nil {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidParameter,
					Message: exception.InvalidParameterMsg,
					Params:  map[string]interface{}{"param": "type"},
					Debug:   parseErr.Error(),
				})
				return
			}
			fileType := view.ParseTypeFromString(fileTypeStr)
			/*if fileType == view.Unknown {
				RespondWithCustomError(w, &exception.CustomError{
					Type:  http.StatusBadRequest,
					Code:    exception.InvalidParameter,
					Message: exception.InvalidParameterMsg, //todo maybe custom error for incorrect enum
					Params:  map[string]interface{}{"param": "type"},
					Debug:   "File type unknown",
				})
				return
			}*/
			resultFileIds, err = c.contentService.AddEmptyFile(context.Create(r), projectId, branchName, fileName, fileType, filePath, publish)
		}
	default:
		{
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.UnsupportedSourceType,
				Message: exception.UnsupportedSourceTypeMsg,
				Params:  map[string]interface{}{"type": source},
			})
			return
		}
	}

	if err != nil {
		log.Error("Failed to add new file: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			c.wsBranchService.DisconnectClients(projectId, branchName)
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to add new file",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusOK, view.ContentAddResponse{FileIds: resultFileIds})
}

func (c contentControllerImpl) GetContentFromCommit(w http.ResponseWriter, r *http.Request) {
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
	fileId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}
	commitId := getStringParam(r, "commitId")

	data, err := c.searchService.GetContentFromCommit(context.Create(r), projectId, branchName, fileId, commitId)
	if err != nil {
		log.Error("Failed to get content: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get content",
				Debug:   err.Error()})
		}
		return
	}
	w.Header().Set("Content-Type", "text/plain") // For frontend it's convenient to get all types as plain text
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (c contentControllerImpl) GetContentFromBlobId(w http.ResponseWriter, r *http.Request) {
	projectId := getStringParam(r, "projectId")
	blobId := getStringParam(r, "blobId")

	data, err := c.searchService.GetContentFromBlobId(context.Create(r), projectId, blobId)
	if err != nil {
		log.Error("Failed to get content: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get content",
				Debug:   err.Error()})
		}
		return
	}
	w.Header().Set("Content-Type", "text/plain") // For frontend it's convenient to get all types as plain text
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (c contentControllerImpl) UpdateMetadata(w http.ResponseWriter, r *http.Request) {
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
	//fileId from request can be either path to folder or path to file (depends on 'bulk' query parameter)
	path, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}

	bulkStr := r.URL.Query().Get("bulk")
	bulk := false
	if bulkStr != "" {
		bulk, err = strconv.ParseBool(bulkStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "bulk", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

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
	var metaPatch view.ContentMetaPatch
	err = json.Unmarshal(body, &metaPatch)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	err = c.contentService.UpdateMetadata(context.Create(r), projectId, branchName, path, metaPatch, bulk)
	if err != nil {
		log.Error("Failed to update content metadata: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			c.wsBranchService.DisconnectClients(projectId, branchName)
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to update content metadata",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (c contentControllerImpl) ResetFile(w http.ResponseWriter, r *http.Request) {
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
	fileId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}

	err = c.contentService.ResetFile(context.Create(r), projectId, branchName, fileId)
	if err != nil {
		log.Error("Failed to reset file to last commit: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			c.wsBranchService.DisconnectClients(projectId, branchName)
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to reset file to last commit",
				Debug:   err.Error()})
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (c contentControllerImpl) RestoreFile(w http.ResponseWriter, r *http.Request) {
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
	fileId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}

	err = c.contentService.RestoreFile(context.Create(r), projectId, branchName, fileId)
	if err != nil {
		log.Error("Failed to restore file: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			c.wsBranchService.DisconnectClients(projectId, branchName)
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to restore file",
				Debug:   err.Error()})
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (c contentControllerImpl) GetAllContent(w http.ResponseWriter, r *http.Request) {
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

	content, err := c.contentService.GetAllZippedContentFromDraftOrGit(context.Create(r), projectId, branchName)
	if err != nil {
		log.Error("Failed to get content: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get content",
				Debug:   err.Error()})
		}
		return
	}

	w.Header().Set("Content-Type", "application/zip")
	w.Write(content)
}
