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
	"fmt"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

type OperationGroupService interface {
	SetBuildService(buildService BuildService)

	CreateOperationGroup_deprecated(packageId string, version string, apiType string, createReq view.CreateOperationGroupReq_deprecated) error
	CreateOperationGroup(ctx context.SecurityContext, packageId string, version string, apiType string, createReq view.CreateOperationGroupReq) error
	ReplaceOperationGroup_deprecated(packageId string, version string, apiType string, groupName string, replaceReq view.ReplaceOperationGroupReq_deprecated) error
	ReplaceOperationGroup(ctx context.SecurityContext, packageId string, version string, apiType string, groupName string, replaceReq view.ReplaceOperationGroupReq) error
	UpdateOperationGroup_deprecated(packageId string, version string, apiType string, groupName string, updateReq view.UpdateOperationGroupReq_deprecated) error
	UpdateOperationGroup(ctx context.SecurityContext, packageId string, version string, apiType string, groupName string, updateReq view.UpdateOperationGroupReq) error
	DeleteOperationGroup(ctx context.SecurityContext, packageId string, version string, apiType string, groupName string) error
	CalculateOperationGroups(packageId string, version string, groupingPrefix string) ([]string, error)
	GetGroupedOperations(packageId string, version string, apiType string, groupName string, searchReq view.OperationListReq) (*view.GroupedOperations, error)
	CheckOperationGroupExists(packageId string, version string, apiType string, groupName string) (bool, error)
	GetOperationGroupExportTemplate(packageId string, version string, apiType string, groupName string) ([]byte, string, error)
	StartOperationGroupPublish(ctx context.SecurityContext, packageId string, version string, apiType string, groupName string, req view.OperationGroupPublishReq) (string, error)
	GetOperationGroupPublishStatus(publishId string) (*view.OperationGroupPublishStatusResponse, error)
}

func NewOperationGroupService(operationRepository repository.OperationRepository, publishedRepo repository.PublishedRepository, packageVersionEnrichmentService PackageVersionEnrichmentService, activityTrackingService ActivityTrackingService) OperationGroupService {
	return &operationGroupServiceImpl{
		operationRepo:                   operationRepository,
		publishedRepo:                   publishedRepo,
		packageVersionEnrichmentService: packageVersionEnrichmentService,
		atService:                       activityTrackingService,
	}
}

type operationGroupServiceImpl struct {
	operationRepo                   repository.OperationRepository
	publishedRepo                   repository.PublishedRepository
	packageVersionEnrichmentService PackageVersionEnrichmentService
	atService                       ActivityTrackingService
	buildService                    BuildService
}

func (o *operationGroupServiceImpl) SetBuildService(buildService BuildService) {
	o.buildService = buildService
}

func (o operationGroupServiceImpl) CheckOperationGroupExists(packageId string, version string, apiType string, groupName string) (bool, error) {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return false, err
	}
	if versionEnt == nil {
		return false, nil
	}
	group, err := o.operationRepo.GetOperationGroup(packageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
	if err != nil {
		return false, err
	}
	if group != nil {
		return true, nil
	} else {
		return false, nil
	}
}

func (o operationGroupServiceImpl) CreateOperationGroup_deprecated(packageId string, version string, apiType string, createReq view.CreateOperationGroupReq_deprecated) error {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return err
	}
	if versionEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	if createReq.GroupName == "" {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyOperationGroupName,
			Message: exception.EmptyOperationGroupNameMsg,
		}
	}

	existingGroup, err := o.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, createReq.GroupName)
	if err != nil {
		return err
	}
	if existingGroup != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OperationGroupAlreadyExists,
			Message: exception.OperationGroupAlreadyExistsMsg,
			Params:  map[string]interface{}{"groupName": createReq.GroupName},
		}
	}
	uniqueGroupId := view.MakeOperationGroupId(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, createReq.GroupName)
	newGroupEntity := &entity.OperationGroupEntity{
		PackageId:     versionEnt.PackageId,
		Version:       versionEnt.Version,
		Revision:      versionEnt.Revision,
		ApiType:       apiType,
		GroupName:     createReq.GroupName,
		GroupId:       uniqueGroupId,
		Description:   createReq.Description,
		Autogenerated: false,
	}
	return o.operationRepo.CreateOperationGroup(newGroupEntity, nil)
}

func (o operationGroupServiceImpl) CreateOperationGroup(ctx context.SecurityContext, packageId string, version string, apiType string, createReq view.CreateOperationGroupReq) error {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return err
	}
	if versionEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	if createReq.GroupName == "" {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyOperationGroupName,
			Message: exception.EmptyOperationGroupNameMsg,
		}
	}

	existingGroup, err := o.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, createReq.GroupName)
	if err != nil {
		return err
	}
	if existingGroup != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OperationGroupAlreadyExists,
			Message: exception.OperationGroupAlreadyExistsMsg,
			Params:  map[string]interface{}{"groupName": createReq.GroupName},
		}
	}
	uniqueGroupId := view.MakeOperationGroupId(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, createReq.GroupName)

	newGroupEntity := &entity.OperationGroupEntity{
		PackageId:     versionEnt.PackageId,
		Version:       versionEnt.Version,
		Revision:      versionEnt.Revision,
		ApiType:       apiType,
		GroupName:     createReq.GroupName,
		GroupId:       uniqueGroupId,
		Description:   createReq.Description,
		Autogenerated: false,
	}
	var templateEnt *entity.OperationGroupTemplateEntity
	if createReq.TemplateFilename != "" {
		templateEnt = entity.MakeOperationGroupTemplateEntity(createReq.Template)
		newGroupEntity.TemplateChecksum = templateEnt.Checksum
		newGroupEntity.TemplateFilename = createReq.TemplateFilename
	}
	err = o.operationRepo.CreateOperationGroup(newGroupEntity, templateEnt)
	if err != nil {
		return err
	}
	err = o.operationRepo.AddOperationGroupHistory(entity.MakeOperationGroupHistoryEntity(*newGroupEntity, view.OperationGroupActionCreate, ctx.GetUserId()))
	if err != nil {
		log.Errorf("failed to insert operation group history: %v", err.Error())
	}
	dataMap := map[string]interface{}{}
	dataMap["groupName"] = newGroupEntity.GroupName
	dataMap["version"] = newGroupEntity.Version
	dataMap["revision"] = newGroupEntity.Revision
	dataMap["apiType"] = newGroupEntity.ApiType
	o.atService.TrackEvent(view.ActivityTrackingEvent{
		Type:      view.ATETCreateManualGroup,
		Data:      dataMap,
		PackageId: newGroupEntity.PackageId,
		Date:      time.Now(),
		UserId:    ctx.GetUserId(),
	})

	return nil
}

func (o operationGroupServiceImpl) ReplaceOperationGroup_deprecated(packageId string, version string, apiType string, groupName string, replaceReq view.ReplaceOperationGroupReq_deprecated) error {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return err
	}
	if versionEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	existingGroup, err := o.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
	if err != nil {
		return err
	}
	if existingGroup == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationGroupNotFound,
			Message: exception.OperationGroupNotFoundMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	if existingGroup.Autogenerated {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OperationGroupNotModifiable,
			Message: exception.OperationGroupNotModifiableMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	if groupName != replaceReq.GroupName {
		if replaceReq.GroupName == "" {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.EmptyOperationGroupName,
				Message: exception.EmptyOperationGroupNameMsg,
			}
		}
		existingNewGroup, err := o.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, replaceReq.GroupName)
		if err != nil {
			return err
		}
		if existingNewGroup != nil {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.OperationGroupAlreadyExists,
				Message: exception.OperationGroupAlreadyExistsMsg,
				Params:  map[string]interface{}{"groupName": replaceReq.GroupName},
			}
		}
	}

	if len(replaceReq.Operations) > view.OperationGroupOperationsLimit {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.GroupOperationsLimitExceeded,
			Message: exception.GroupOperationsLimitExceededMsg,
			Params:  map[string]interface{}{"limit": view.OperationGroupOperationsLimit},
		}
	}
	newGroupEntity := *existingGroup
	newGroupEntity.GroupName = replaceReq.GroupName
	newGroupEntity.Description = replaceReq.Description
	newGroupEntity.GroupId = view.MakeOperationGroupId(newGroupEntity.PackageId, newGroupEntity.Version, newGroupEntity.Revision, newGroupEntity.ApiType, newGroupEntity.GroupName)
	operationEntities := make([]entity.GroupedOperationEntity, 0)
	allowedVersions := make(map[string]struct{}, 0)
	refs, err := o.publishedRepo.GetVersionRefsV3(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return err
	}
	if len(refs) > 0 {
		for _, ref := range refs {
			if ref.Excluded {
				continue
			}
			allowedVersions[view.MakePackageRefKey(ref.RefPackageId, ref.RefVersion, ref.RefRevision)] = struct{}{}
		}
	} else {
		allowedVersions[view.MakePackageRefKey(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)] = struct{}{}
	}
	versionMapCache := make(map[string]entity.PublishedVersionEntity, 0)
	for _, operation := range replaceReq.Operations {
		operationEnt := entity.GroupedOperationEntity{
			GroupId:     newGroupEntity.GroupId,
			OperationId: operation.OperationId,
		}
		if operation.PackageId == "" || operation.Version == "" {
			operationEnt.PackageId = newGroupEntity.PackageId
			operationEnt.Version = newGroupEntity.Version
			operationEnt.Revision = newGroupEntity.Revision
		} else {
			operationVersion, operationRevision, err := repository.SplitVersionRevision(operation.Version)
			if err != nil {
				return err
			}
			//versionMapCache includes version revision so any version without specified '@revision' will not hit the cache
			if versionEnt, cached := versionMapCache[view.MakePackageRefKey(operation.PackageId, operationVersion, operationRevision)]; cached {
				operationEnt.PackageId = versionEnt.PackageId
				operationEnt.Version = versionEnt.Version
				operationEnt.Revision = versionEnt.Revision
			} else {
				versionEnt, err := o.publishedRepo.GetVersion(operation.PackageId, operation.Version)
				if err != nil {
					return err
				}
				if versionEnt == nil {
					return &exception.CustomError{
						Status:  http.StatusNotFound,
						Code:    exception.PublishedPackageVersionNotFound,
						Message: exception.PublishedPackageVersionNotFoundMsg,
						Params:  map[string]interface{}{"version": operation.Version, "packageId": operation.PackageId},
					}
				}
				versionKey := view.MakePackageRefKey(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
				if _, allowed := allowedVersions[versionKey]; !allowed {
					return &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.GroupingVersionNotAllowed,
						Message: exception.GroupingVersionNotAllowedMsg,
						Params:  map[string]interface{}{"version": operation.Version, "packageId": operation.PackageId},
					}
				}
				versionMapCache[versionKey] = *versionEnt
				operationEnt.PackageId = versionEnt.PackageId
				operationEnt.Version = versionEnt.Version
				operationEnt.Revision = versionEnt.Revision
			}
		}
		operationEntities = append(operationEntities, operationEnt)
	}
	return o.operationRepo.ReplaceOperationGroup(existingGroup, &newGroupEntity, operationEntities, nil)
}

func (o operationGroupServiceImpl) ReplaceOperationGroup(ctx context.SecurityContext, packageId string, version string, apiType string, groupName string, replaceReq view.ReplaceOperationGroupReq) error {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return err
	}
	if versionEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	existingGroup, err := o.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
	if err != nil {
		return err
	}
	if existingGroup == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationGroupNotFound,
			Message: exception.OperationGroupNotFoundMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	if existingGroup.Autogenerated {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OperationGroupNotModifiable,
			Message: exception.OperationGroupNotModifiableMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	if groupName != replaceReq.GroupName {
		if replaceReq.GroupName == "" {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.EmptyOperationGroupName,
				Message: exception.EmptyOperationGroupNameMsg,
			}
		}
		existingNewGroup, err := o.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, replaceReq.GroupName)
		if err != nil {
			return err
		}
		if existingNewGroup != nil {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.OperationGroupAlreadyExists,
				Message: exception.OperationGroupAlreadyExistsMsg,
				Params:  map[string]interface{}{"groupName": replaceReq.GroupName},
			}
		}
	}

	newGroupEntity := *existingGroup
	newGroupEntity.GroupName = replaceReq.GroupName
	newGroupEntity.Description = replaceReq.Description
	var templateEnt *entity.OperationGroupTemplateEntity
	newGroupEntity.TemplateFilename = replaceReq.TemplateFilename
	if replaceReq.TemplateFilename != "" {
		templateEnt = entity.MakeOperationGroupTemplateEntity(replaceReq.Template)
		newGroupEntity.TemplateChecksum = templateEnt.Checksum
	} else {
		newGroupEntity.TemplateChecksum = ""
	}
	newGroupEntity.GroupId = view.MakeOperationGroupId(newGroupEntity.PackageId, newGroupEntity.Version, newGroupEntity.Revision, newGroupEntity.ApiType, newGroupEntity.GroupName)
	groupedOperationEntities, err := o.makeGroupedOperationEntities(versionEnt, &newGroupEntity, replaceReq.Operations)
	if err != nil {
		return err
	}
	err = o.operationRepo.ReplaceOperationGroup(existingGroup, &newGroupEntity, groupedOperationEntities, templateEnt)
	if err != nil {
		return err
	}
	err = o.clearOperationGroupCache(packageId, versionEnt.Version, versionEnt.Revision, apiType, existingGroup.GroupId)
	if err != nil {
		return err
	}

	groupParameters := make([]string, 0)
	if existingGroup.GroupId != newGroupEntity.GroupId {
		err = o.operationRepo.AddOperationGroupHistory(entity.MakeOperationGroupHistoryEntity(*existingGroup, view.OperationGroupActionDelete, ctx.GetUserId()))
		if err != nil {
			log.Errorf("failed to insert operation group history: %v", err.Error())
		}
		err = o.operationRepo.AddOperationGroupHistory(entity.MakeOperationGroupHistoryEntity(newGroupEntity, view.OperationGroupActionCreate, ctx.GetUserId()))
		if err != nil {
			log.Errorf("failed to insert operation group history: %v", err.Error())
		}
		groupParameters = append(groupParameters, "name")
	} else {
		err = o.operationRepo.AddOperationGroupHistory(entity.MakeOperationGroupHistoryEntity(newGroupEntity, view.OperationGroupActionUpdate, ctx.GetUserId()))
		if err != nil {
			log.Errorf("failed to insert operation group history: %v", err.Error())
		}
	}
	if existingGroup.Description != newGroupEntity.Description {
		groupParameters = append(groupParameters, "description")
	}
	if existingGroup.TemplateChecksum != newGroupEntity.TemplateChecksum {
		groupParameters = append(groupParameters, "template")
	}
	if replaceReq.Operations != nil {
		groupParameters = append(groupParameters, "operations")
	}
	dataMap := map[string]interface{}{}
	dataMap["groupName"] = newGroupEntity.GroupName
	dataMap["version"] = newGroupEntity.Version
	dataMap["revision"] = newGroupEntity.Revision
	dataMap["apiType"] = newGroupEntity.ApiType
	dataMap["isPrefixGroup"] = newGroupEntity.Autogenerated
	dataMap["groupParameters"] = groupParameters
	o.atService.TrackEvent(view.ActivityTrackingEvent{
		Type:      view.ATETOperationsGroupParameters,
		Data:      dataMap,
		PackageId: newGroupEntity.PackageId,
		Date:      time.Now(),
		UserId:    ctx.GetUserId(),
	})
	return nil
}

func (o operationGroupServiceImpl) makeGroupedOperationEntities(versionEnt *entity.PublishedVersionEntity, groupEntity *entity.OperationGroupEntity, operations []view.GroupOperations) ([]entity.GroupedOperationEntity, error) {
	if len(operations) > view.OperationGroupOperationsLimit {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.GroupOperationsLimitExceeded,
			Message: exception.GroupOperationsLimitExceededMsg,
			Params:  map[string]interface{}{"limit": view.OperationGroupOperationsLimit},
		}
	}
	operationEntities := make([]entity.GroupedOperationEntity, 0)
	allowedVersions := make(map[string]struct{}, 0)
	refs, err := o.publishedRepo.GetVersionRefsV3(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}
	if len(refs) > 0 {
		for _, ref := range refs {
			if ref.Excluded {
				continue
			}
			allowedVersions[view.MakePackageRefKey(ref.RefPackageId, ref.RefVersion, ref.RefRevision)] = struct{}{}
		}
	} else {
		allowedVersions[view.MakePackageRefKey(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)] = struct{}{}
	}
	versionMapCache := make(map[string]entity.PublishedVersionEntity, 0)
	for _, operation := range operations {
		operationEnt := entity.GroupedOperationEntity{
			GroupId:     groupEntity.GroupId,
			OperationId: operation.OperationId,
		}
		if operation.PackageId == "" || operation.Version == "" {
			operationEnt.PackageId = groupEntity.PackageId
			operationEnt.Version = groupEntity.Version
			operationEnt.Revision = groupEntity.Revision
		} else {
			operationVersion, operationRevision, err := repository.SplitVersionRevision(operation.Version)
			if err != nil {
				return nil, err
			}
			//versionMapCache includes version revision so any version without specified '@revision' will not hit the cache
			if versionEnt, cached := versionMapCache[view.MakePackageRefKey(operation.PackageId, operationVersion, operationRevision)]; cached {
				operationEnt.PackageId = versionEnt.PackageId
				operationEnt.Version = versionEnt.Version
				operationEnt.Revision = versionEnt.Revision
			} else {
				versionEnt, err := o.publishedRepo.GetVersion(operation.PackageId, operation.Version)
				if err != nil {
					return nil, err
				}
				if versionEnt == nil {
					return nil, &exception.CustomError{
						Status:  http.StatusNotFound,
						Code:    exception.PublishedPackageVersionNotFound,
						Message: exception.PublishedPackageVersionNotFoundMsg,
						Params:  map[string]interface{}{"version": operation.Version, "packageId": operation.PackageId},
					}
				}
				versionKey := view.MakePackageRefKey(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
				if _, allowed := allowedVersions[versionKey]; !allowed {
					return nil, &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.GroupingVersionNotAllowed,
						Message: exception.GroupingVersionNotAllowedMsg,
						Params:  map[string]interface{}{"version": operation.Version, "packageId": operation.PackageId},
					}
				}
				versionMapCache[versionKey] = *versionEnt
				operationEnt.PackageId = versionEnt.PackageId
				operationEnt.Version = versionEnt.Version
				operationEnt.Revision = versionEnt.Revision
			}
		}
		operationEntities = append(operationEntities, operationEnt)
	}
	return operationEntities, nil
}

func (o operationGroupServiceImpl) UpdateOperationGroup_deprecated(packageId string, version string, apiType string, groupName string, updateReq view.UpdateOperationGroupReq_deprecated) error {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return err
	}
	if versionEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	existingGroup, err := o.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
	if err != nil {
		return err
	}
	if existingGroup == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationGroupNotFound,
			Message: exception.OperationGroupNotFoundMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	if existingGroup.Autogenerated {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OperationGroupNotModifiable,
			Message: exception.OperationGroupNotModifiableMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	if updateReq.GroupName == nil && updateReq.Description == nil {
		return nil
	}
	updatedGroup := *existingGroup
	if updateReq.GroupName != nil && *updateReq.GroupName != existingGroup.GroupName {
		if *updateReq.GroupName == "" {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.EmptyOperationGroupName,
				Message: exception.EmptyOperationGroupNameMsg,
			}
		}
		existingNewGroup, err := o.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, *updateReq.GroupName)
		if err != nil {
			return err
		}
		if existingNewGroup != nil {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.OperationGroupAlreadyExists,
				Message: exception.OperationGroupAlreadyExistsMsg,
				Params:  map[string]interface{}{"groupName": *updateReq.GroupName},
			}
		}

		updatedGroup.GroupName = *updateReq.GroupName
		updatedGroup.GroupId = view.MakeOperationGroupId(updatedGroup.PackageId, updatedGroup.Version, updatedGroup.Revision, updatedGroup.ApiType, *updateReq.GroupName)
	}
	if updateReq.Description != nil && *updateReq.Description != existingGroup.Description {
		updatedGroup.Description = *updateReq.Description
	}
	return o.operationRepo.UpdateOperationGroup(existingGroup, &updatedGroup, nil, nil)
}

func (o operationGroupServiceImpl) UpdateOperationGroup(ctx context.SecurityContext, packageId string, version string, apiType string, groupName string, updateReq view.UpdateOperationGroupReq) error {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return err
	}
	if versionEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	existingGroup, err := o.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
	if err != nil {
		return err
	}
	if existingGroup == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationGroupNotFound,
			Message: exception.OperationGroupNotFoundMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	if existingGroup.Autogenerated && updateReq.Description == nil && updateReq.Template == nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OperationGroupNotModifiable,
			Message: exception.OperationGroupNotModifiableMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	if updateReq.GroupName == nil && updateReq.Description == nil && updateReq.Template == nil && updateReq.Operations == nil {
		return nil
	}
	updatedGroup := *existingGroup
	if updateReq.GroupName != nil && *updateReq.GroupName != existingGroup.GroupName {
		if *updateReq.GroupName == "" {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.EmptyOperationGroupName,
				Message: exception.EmptyOperationGroupNameMsg,
			}
		}
		existingNewGroup, err := o.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, *updateReq.GroupName)
		if err != nil {
			return err
		}
		if existingNewGroup != nil {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.OperationGroupAlreadyExists,
				Message: exception.OperationGroupAlreadyExistsMsg,
				Params:  map[string]interface{}{"groupName": *updateReq.GroupName},
			}
		}

		updatedGroup.GroupName = *updateReq.GroupName
		updatedGroup.GroupId = view.MakeOperationGroupId(updatedGroup.PackageId, updatedGroup.Version, updatedGroup.Revision, updatedGroup.ApiType, *updateReq.GroupName)
	}
	if updateReq.Description != nil && *updateReq.Description != existingGroup.Description {
		updatedGroup.Description = *updateReq.Description
	}
	var templateEnt *entity.OperationGroupTemplateEntity
	if updateReq.Template != nil {
		updatedGroup.TemplateFilename = updateReq.Template.TemplateFilename
		if updateReq.Template.TemplateFilename != "" {
			templateEnt = entity.MakeOperationGroupTemplateEntity(updateReq.Template.TemplateData)
			updatedGroup.TemplateChecksum = templateEnt.Checksum
		} else {
			updatedGroup.TemplateChecksum = ""
		}
	}
	var newGroupedOperationEntities *[]entity.GroupedOperationEntity
	if updateReq.Operations != nil {
		groupedOperationEntities, err := o.makeGroupedOperationEntities(versionEnt, &updatedGroup, *updateReq.Operations)
		if err != nil {
			return err
		}
		newGroupedOperationEntities = &groupedOperationEntities
	}

	err = o.operationRepo.UpdateOperationGroup(existingGroup, &updatedGroup, templateEnt, newGroupedOperationEntities)
	if err != nil {
		return err
	}
	err = o.clearOperationGroupCache(packageId, versionEnt.Version, versionEnt.Revision, apiType, existingGroup.GroupId)
	if err != nil {
		return err
	}

	groupParameters := make([]string, 0)
	if existingGroup.GroupId != updatedGroup.GroupId {
		err = o.operationRepo.AddOperationGroupHistory(entity.MakeOperationGroupHistoryEntity(*existingGroup, view.OperationGroupActionDelete, ctx.GetUserId()))
		if err != nil {
			log.Errorf("failed to insert operation group history: %v", err.Error())
		}
		err = o.operationRepo.AddOperationGroupHistory(entity.MakeOperationGroupHistoryEntity(updatedGroup, view.OperationGroupActionCreate, ctx.GetUserId()))
		if err != nil {
			log.Errorf("failed to insert operation group history: %v", err.Error())
		}
		groupParameters = append(groupParameters, "name")
	} else {
		err = o.operationRepo.AddOperationGroupHistory(entity.MakeOperationGroupHistoryEntity(updatedGroup, view.OperationGroupActionUpdate, ctx.GetUserId()))
		if err != nil {
			log.Errorf("failed to insert operation group history: %v", err.Error())
		}
	}
	if existingGroup.Description != updatedGroup.Description {
		groupParameters = append(groupParameters, "description")
	}
	if existingGroup.TemplateChecksum != updatedGroup.TemplateChecksum {
		groupParameters = append(groupParameters, "template")
	}
	if updateReq.Operations != nil {
		groupParameters = append(groupParameters, "operations")
	}
	dataMap := map[string]interface{}{}
	dataMap["groupName"] = updatedGroup.GroupName
	dataMap["version"] = updatedGroup.Version
	dataMap["revision"] = updatedGroup.Revision
	dataMap["apiType"] = updatedGroup.ApiType
	dataMap["isPrefixGroup"] = updatedGroup.Autogenerated
	dataMap["groupParameters"] = groupParameters
	o.atService.TrackEvent(view.ActivityTrackingEvent{
		Type:      view.ATETOperationsGroupParameters,
		Data:      dataMap,
		PackageId: updatedGroup.PackageId,
		Date:      time.Now(),
		UserId:    ctx.GetUserId(),
	})
	return nil
}

func (o operationGroupServiceImpl) DeleteOperationGroup(ctx context.SecurityContext, packageId string, version string, apiType string, groupName string) error {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return err
	}
	if versionEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	existingGroup, err := o.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
	if err != nil {
		return err
	}
	if existingGroup == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationGroupNotFound,
			Message: exception.OperationGroupNotFoundMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	if existingGroup.Autogenerated {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OperationGroupNotModifiable,
			Message: exception.OperationGroupNotModifiableMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	err = o.operationRepo.DeleteOperationGroup(existingGroup)
	if err != nil {
		return err
	}
	err = o.clearOperationGroupCache(packageId, versionEnt.Version, versionEnt.Revision, apiType, existingGroup.GroupId)
	if err != nil {
		return err
	}
	err = o.operationRepo.AddOperationGroupHistory(entity.MakeOperationGroupHistoryEntity(*existingGroup, view.OperationGroupActionDelete, ctx.GetUserId()))
	if err != nil {
		log.Errorf("failed to insert operation group history: %v", err.Error())
	}
	dataMap := map[string]interface{}{}
	dataMap["groupName"] = existingGroup.GroupName
	dataMap["version"] = existingGroup.Version
	dataMap["revision"] = existingGroup.Revision
	dataMap["apiType"] = existingGroup.ApiType
	o.atService.TrackEvent(view.ActivityTrackingEvent{
		Type:      view.ATETDeleteManualGroup,
		Data:      dataMap,
		PackageId: existingGroup.PackageId,
		Date:      time.Now(),
		UserId:    ctx.GetUserId(),
	})

	return nil
}

func (o operationGroupServiceImpl) CalculateOperationGroups(packageId string, version string, groupingPrefix string) ([]string, error) {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	operationGroups, err := o.operationRepo.CalculateOperationGroups(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, groupingPrefix)
	if err != nil {
		return nil, err
	}
	return operationGroups, nil
}

func (o operationGroupServiceImpl) GetGroupedOperations(packageId string, version string, apiType string, groupName string, searchReq view.OperationListReq) (*view.GroupedOperations, error) {
	if searchReq.RefPackageId != "" {
		packageEnt, err := o.publishedRepo.GetPackage(packageId)
		if err != nil {
			return nil, err
		}
		if packageEnt == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PackageNotFound,
				Message: exception.PackageNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId},
			}
		}
		if packageEnt.Kind != entity.KIND_DASHBOARD {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.UnsupportedQueryParam,
				Message: exception.UnsupportedQueryParamMsg,
				Params:  map[string]interface{}{"param": "refPackageId"}}
		}
	}
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	existingGroup, err := o.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
	if err != nil {
		return nil, err
	}
	if existingGroup == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationGroupNotFound,
			Message: exception.OperationGroupNotFoundMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	if searchReq.Kind == "all" {
		searchReq.Kind = ""
	}
	operationEnts, err := o.operationRepo.GetGroupedOperations(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName, searchReq)
	if err != nil {
		return nil, err
	}
	operationList := make([]interface{}, 0)
	packageVersions := make(map[string][]string, 0)
	for _, ent := range operationEnts {
		operationList = append(operationList, entity.MakeOperationView(ent))
		packageVersions[ent.PackageId] = append(packageVersions[ent.PackageId], view.MakeVersionRefKey(ent.Version, ent.Revision))
	}
	packagesRefs, err := o.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
	if err != nil {
		return nil, err
	}
	operations := view.GroupedOperations{
		Operations: operationList,
		Packages:   packagesRefs,
	}
	return &operations, nil
}

func (o operationGroupServiceImpl) clearOperationGroupCache(packageId string, version string, revision int, apiType string, groupId string) error {
	return o.publishedRepo.DeleteTransformedDocuments(packageId, version, revision, apiType, groupId)
}

func (o operationGroupServiceImpl) GetOperationGroupExportTemplate(packageId string, version string, apiType string, groupName string) ([]byte, string, error) {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return nil, "", err
	}
	if versionEnt == nil {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	operationsGroupTemplate, err := o.operationRepo.GetOperationGroupTemplateFile(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
	if err != nil {
		return nil, "", err
	}
	if operationsGroupTemplate == nil || operationsGroupTemplate.TemplateFilename == "" {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationGroupExportTemplateNotFound,
			Message: exception.OperationGroupExportTemplateNotFoundMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	return operationsGroupTemplate.Template, operationsGroupTemplate.TemplateFilename, nil
}

func (o operationGroupServiceImpl) StartOperationGroupPublish(ctx context.SecurityContext, packageId string, version string, apiType string, groupName string, req view.OperationGroupPublishReq) (string, error) {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return "", err
	}
	if versionEnt == nil {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version},
		}
	}
	exists, err := o.CheckOperationGroupExists(packageId, version, apiType, groupName)
	if err != nil {
		return "", err
	}
	if !exists {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationGroupNotFound,
			Message: exception.OperationGroupNotFoundMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}

	publishId := uuid.NewString()
	operationGroupPublishEnt := &entity.OperationGroupPublishEntity{
		PublishId: publishId,
		Status:    string(view.StatusRunning),
	}
	err = o.publishedRepo.StoreOperationGroupPublishProcess(operationGroupPublishEnt)
	if err != nil {
		return "", fmt.Errorf("failed to create operation group publish process: %w", err)
	}
	utils.SafeAsync(func() {
		o.publishOperationGroup(ctx, versionEnt, apiType, groupName, req, operationGroupPublishEnt)
	})
	return publishId, nil
}

func (o operationGroupServiceImpl) publishOperationGroup(ctx context.SecurityContext, version *entity.PublishedVersionEntity, apiType string, groupName string, req view.OperationGroupPublishReq, publishEnt *entity.OperationGroupPublishEntity) {
	groupId := view.MakeOperationGroupId(version.PackageId, version.Version, version.Revision, apiType, groupName)
	transformedDocuments, err := o.publishedRepo.GetTransformedDocuments(version.PackageId, view.MakeVersionRefKey(version.Version, version.Revision), apiType, groupId, view.ReducedSourceSpecificationsType, string(view.JsonDocumentFormat))
	if err != nil {
		o.updatePublishProcess(publishEnt, string(view.StatusError), fmt.Sprintf("faield to get existing transformed documents: %v", err.Error()))
		return
	}
	if transformedDocuments == nil {
		err = o.transformDocuments(ctx, version, apiType, groupName)
		if err != nil {
			o.updatePublishProcess(publishEnt, string(view.StatusError), fmt.Sprintf("faield to tranform group operations into documents: %v", err.Error()))
			return
		}
		transformedDocuments, err = o.publishedRepo.GetTransformedDocuments(version.PackageId, view.MakeVersionRefKey(version.Version, version.Revision), apiType, groupId, view.ReducedSourceSpecificationsType, string(view.JsonDocumentFormat))
		if err != nil {
			o.updatePublishProcess(publishEnt, string(view.StatusError), fmt.Sprintf("faield to get transformed documents: %v", err.Error()))
			return
		}
		if transformedDocuments == nil {
			o.updatePublishProcess(publishEnt, string(view.StatusError), "faield to get transformed documents: transformed documents not found")
			return
		}
	}
	files := make([]view.BCFile, 0)
	publishFile := true
	for _, document := range transformedDocuments.DocumentsInfo {
		files = append(files, view.BCFile{
			FileId:  document.Filename,
			Publish: &publishFile,
		})
	}
	groupPublishBuildConfig := view.BuildConfig{
		PackageId:                req.PackageId,
		Version:                  req.Version,
		BuildType:                view.BuildType,
		PreviousVersion:          req.PreviousVersion,
		PreviousVersionPackageId: req.PreviousVersionPackageId,
		Status:                   req.Status,
		Files:                    files,
		CreatedBy:                ctx.GetUserId(),
		Metadata: view.BuildConfigMetadata{
			VersionLabels: req.VersionLabels,
		},
	}
	build, err := o.buildService.PublishVersion(ctx, groupPublishBuildConfig, transformedDocuments.Data, false, "", nil, false, false)
	if err != nil {
		o.updatePublishProcess(publishEnt, string(view.StatusError), fmt.Sprintf("faield to start operation group publish: %v", err.Error()))
		return
	}
	err = o.buildService.AwaitBuildCompletion(build.PublishId)
	if err != nil {
		o.updatePublishProcess(publishEnt, string(view.StatusError), fmt.Sprintf("faield to publish operation group: %v", err.Error()))
		return
	}
	o.updatePublishProcess(publishEnt, string(view.StatusComplete), "")
}

func (o operationGroupServiceImpl) transformDocuments(ctx context.SecurityContext, version *entity.PublishedVersionEntity, apiType string, groupName string) error {
	buildId, err := o.buildService.CreateBuildWithoutDependencies(view.BuildConfig{
		PackageId: version.PackageId,
		Version:   view.MakeVersionRefKey(version.Version, version.Revision),
		BuildType: view.ReducedSourceSpecificationsType,
		Format:    string(view.JsonDocumentFormat),
		CreatedBy: ctx.GetUserId(),
		ApiType:   apiType,
		GroupName: groupName,
	}, false, "")
	if err != nil {
		return fmt.Errorf("failed to create documents transformation build: %v", err.Error())
	}
	err = o.buildService.AwaitBuildCompletion(buildId)
	if err != nil {
		return fmt.Errorf("documents transformation build failed: %v", err.Error())
	}
	return nil
}

func (o operationGroupServiceImpl) updatePublishProcess(publishEnt *entity.OperationGroupPublishEntity, status string, details string) {
	publishEnt.Status = status
	publishEnt.Details = details
	err := o.publishedRepo.UpdateOperationGroupPublishProcess(publishEnt)
	if err != nil {
		log.Errorf("failed to update operation group publish process: %v", err.Error())
	}
}

func (o operationGroupServiceImpl) GetOperationGroupPublishStatus(publishId string) (*view.OperationGroupPublishStatusResponse, error) {
	publishProcess, err := o.publishedRepo.GetOperationGroupPublishProcess(publishId)
	if err != nil {
		return nil, err
	}
	if publishProcess == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishProcessNotFound,
			Message: exception.PublishProcessNotFoundMsg,
			Params:  map[string]interface{}{"publishId": publishId},
		}
	}
	return &view.OperationGroupPublishStatusResponse{
		Status:  publishProcess.Status,
		Message: publishProcess.Details,
	}, nil
}
