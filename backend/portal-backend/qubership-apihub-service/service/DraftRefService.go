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

package service

import (
	goctx "context"
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/websocket"
)

type DraftRefService interface {
	UpdateRefs(ctx context.SecurityContext, projectId string, branchName string, refPatch view.RefPatch) error
}

func NewRefService(draftRepository repository.DraftRepository,
	projectService ProjectService,
	branchService BranchService,
	publishedRepo repository.PublishedRepository,
	websocketService WsBranchService) DraftRefService {
	return &draftRefServiceImpl{
		draftRepository:  draftRepository,
		projectService:   projectService,
		branchService:    branchService,
		publishedRepo:    publishedRepo,
		websocketService: websocketService,
	}
}

type draftRefServiceImpl struct {
	draftRepository  repository.DraftRepository
	projectService   ProjectService
	branchService    BranchService
	publishedRepo    repository.PublishedRepository
	websocketService WsBranchService
}

func (d draftRefServiceImpl) UpdateRefs(ctx context.SecurityContext, projectId string, branchName string, refPatch view.RefPatch) error {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("UpdateRefs(%s,%s)", projectId, branchName))

	draftExists, err := d.branchService.DraftExists(projectId, branchName)
	if err != nil {
		return err
	}
	if !draftExists {
		err = d.branchService.CreateDraftFromGit(goCtx, projectId, branchName)
		if err != nil {
			return err
		}
	}
	switch refPatch.Status {
	case view.StatusModified:
		{
			err = d.replaceRef(ctx, projectId, branchName, refPatch)
		}
	case view.StatusDeleted:
		{
			err = d.removeRef(ctx, projectId, branchName, refPatch)
		}
	case view.StatusAdded:
		{
			err = d.addRef(ctx, projectId, branchName, refPatch)
		}
	default:
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UnsupportedStatus,
			Message: exception.UnsupportedStatusMsg,
			Params:  map[string]interface{}{"status": refPatch.Status},
		}
	}
	if err != nil {
		return err
	}
	err = d.branchService.RecalculateDraftConfigChangeType(goCtx, projectId, branchName)
	if err != nil {
		return err
	}
	return nil
}

func (d draftRefServiceImpl) replaceRef(ctx context.SecurityContext, projectId string, branchName string, refPatch view.RefPatch) error {
	ref, err := d.draftRepository.GetRef(projectId, branchName, refPatch.RefId, refPatch.Version)
	if err != nil {
		return err
	}
	if ref == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.RefNotFound,
			Message: exception.RefNotFoundMsg,
			Params:  map[string]interface{}{"ref": refPatch.RefId, "projectId": projectId, "version": refPatch.Version, "branch": branchName},
		}
	}
	if refPatch.Data.RefId == "" {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "data.refId"},
		}
	}
	if refPatch.Data.Version == "" {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "data.version"},
		}
	}
	newRef, err := d.draftRepository.GetRef(projectId, branchName, refPatch.Data.RefId, refPatch.Data.Version)
	if err != nil {
		return err
	}
	if newRef != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RefAlreadyExists,
			Message: exception.RefAlreadyExistsMsg,
			Params:  map[string]interface{}{"ref": refPatch.Data.RefId, "projectId": projectId, "version": refPatch.Data.Version, "branch": branchName},
		}
	}
	packageEnt, err := d.publishedRepo.GetPackage(refPatch.Data.RefId)
	if err != nil {
		return err
	}
	if packageEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ReferencedPackageNotFound,
			Message: exception.ReferencedPackageNotFoundMsg,
			Params:  map[string]interface{}{"package": refPatch.Data.RefId},
		}
	}
	version, err := d.publishedRepo.GetVersion(refPatch.Data.RefId, refPatch.Data.Version)
	if err != nil {
		return err
	}
	if version == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ReferencedPackageVersionNotFound,
			Message: exception.ReferencedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"package": refPatch.Data.RefId, "version": refPatch.Data.Version},
		}
	}
	newRefView := view.Ref{
		RefPackageId:      refPatch.Data.RefId,
		RefPackageVersion: refPatch.Data.Version,
		RefPackageName:    packageEnt.Name,
		VersionStatus:     version.Status,
		Kind:              packageEnt.Kind,
	}
	wsPatchData := &websocket.BranchRefsUpdatedPatchData{}
	status := string(view.StatusModified)
	if ref.Status == string(view.StatusDeleted) || ref.Status == string(view.StatusAdded) {
		status = ref.Status
	}
	if ref.RefPackageId != refPatch.Data.RefId {
		wsPatchData.RefId = refPatch.Data.RefId
	}
	if ref.RefVersion != refPatch.Data.Version {
		wsPatchData.Version = refPatch.Data.Version
	}
	if ref.Status != status {
		wsPatchData.Status = view.ParseFileStatus(status)
	}
	newRef = entity.MakeRefEntity(&newRefView, projectId, branchName, status)
	err = d.draftRepository.ReplaceRef(projectId, branchName, refPatch.RefId, refPatch.Version, newRef)
	if err != nil {
		return err
	}
	d.websocketService.NotifyProjectBranchUsers(projectId, branchName,
		websocket.BranchRefsUpdatedPatch{
			Type:      websocket.BranchRefsUpdatedType,
			UserId:    ctx.GetUserId(),
			Operation: "patch",
			RefId:     ref.RefPackageId,
			Version:   ref.RefVersion,
			Data:      wsPatchData,
		})
	return nil
}

func (d draftRefServiceImpl) removeRef(ctx context.SecurityContext, projectId string, branchName string, refPatch view.RefPatch) error {
	ref, err := d.draftRepository.GetRef(projectId, branchName, refPatch.RefId, refPatch.Version)
	if err != nil {
		return err
	}
	if ref == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.RefNotFound,
			Message: exception.RefNotFoundMsg,
			Params:  map[string]interface{}{"ref": refPatch.RefId, "projectId": projectId, "version": refPatch.Version, "branch": branchName},
		}
	}
	if ref.Status == string(view.StatusAdded) {
		err = d.draftRepository.DeleteRef(projectId, branchName, ref.RefPackageId, ref.RefVersion)
		if err != nil {
			return err
		}
		d.websocketService.NotifyProjectBranchUsers(projectId, branchName,
			websocket.BranchRefsUpdatedPatch{
				Type:      websocket.BranchRefsUpdatedType,
				UserId:    ctx.GetUserId(),
				Operation: "remove",
				RefId:     refPatch.RefId,
				Version:   refPatch.Version,
			})
		return nil
	}
	if ref.Status == string(view.StatusDeleted) {
		return nil
	}
	ref.Status = string(view.StatusDeleted)
	err = d.draftRepository.UpdateRef(ref)
	if err != nil {
		return err
	}
	d.websocketService.NotifyProjectBranchUsers(projectId, branchName,
		websocket.BranchRefsUpdatedPatch{
			Type:      websocket.BranchRefsUpdatedType,
			UserId:    ctx.GetUserId(),
			Operation: "patch",
			RefId:     refPatch.RefId,
			Version:   refPatch.Version,
			Data:      &websocket.BranchRefsUpdatedPatchData{Status: view.StatusDeleted},
		})
	return nil
}

func (d draftRefServiceImpl) addRef(ctx context.SecurityContext, projectId string, branchName string, refPatch view.RefPatch) error {
	ref, err := d.draftRepository.GetRef(projectId, branchName, refPatch.RefId, refPatch.Version)
	if err != nil {
		return err
	}
	if ref != nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.RefAlreadyExists,
			Message: exception.RefAlreadyExistsMsg,
			Params:  map[string]interface{}{"ref": refPatch.RefId, "projectId": projectId, "version": refPatch.Version, "branch": branchName},
		}
	}
	packageEnt, err := d.publishedRepo.GetPackage(refPatch.RefId)
	if err != nil {
		return err
	}
	if packageEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ReferencedPackageNotFound,
			Message: exception.ReferencedPackageNotFoundMsg,
			Params:  map[string]interface{}{"package": refPatch.RefId},
		}
	}
	version, err := d.publishedRepo.GetVersion(refPatch.RefId, refPatch.Version)
	if err != nil {
		return err
	}
	if version == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ReferencedPackageVersionNotFound,
			Message: exception.ReferencedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"package": refPatch.RefId, "version": refPatch.Version},
		}
	}
	newRefView := view.Ref{
		RefPackageId:      refPatch.RefId,
		RefPackageVersion: refPatch.Version,
		RefPackageName:    packageEnt.Name,
		VersionStatus:     version.Status,
		Kind:              packageEnt.Kind,
	}
	newRef := entity.MakeRefEntity(&newRefView, projectId, branchName, string(view.StatusAdded))
	err = d.draftRepository.CreateRef(newRef)
	if err != nil {
		return err
	}
	d.websocketService.NotifyProjectBranchUsers(projectId, branchName,
		websocket.BranchRefsUpdatedPatch{
			Type:      websocket.BranchRefsUpdatedType,
			UserId:    ctx.GetUserId(),
			Operation: "add",
			Data: &websocket.BranchRefsUpdatedPatchData{
				RefId:         newRefView.RefPackageId,
				Version:       newRefView.RefPackageVersion,
				Name:          newRefView.RefPackageName,
				VersionStatus: newRefView.VersionStatus,
				Status:        view.StatusAdded,
			},
		})
	return nil
}
