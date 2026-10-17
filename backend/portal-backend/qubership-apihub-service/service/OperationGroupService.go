package service

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/archive"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

const operationGroupPublishTimeout = 30 * time.Minute

type OperationGroupService interface {
	SetBuildService(buildService BuildService)

	CreateOperationGroup(ctx context.Context, packageId string, version string, apiType string, createReq view.CreateOperationGroupReq) error
	UpdateOperationGroup(ctx context.Context, packageId string, version string, apiType string, groupName string, updateReq view.UpdateOperationGroupReq) error
	DeleteOperationGroup(ctx context.Context, packageId string, version string, apiType string, groupName string) error
	CalculateOperationGroups(ctx context.Context, packageId string, version string, groupingPrefix string) ([]string, error)
	GetGroupedOperations(ctx context.Context, packageId string, version string, apiType string, groupName string, searchReq view.OperationListReq) (*view.GroupedOperations, error)
	CheckOperationGroupExists(ctx context.Context, packageId string, version string, apiType string, groupName string) (bool, error)
	GetOperationGroupExportTemplate(ctx context.Context, packageId string, version string, apiType string, groupName string) ([]byte, string, error)
	StartOperationGroupPublish(ctx context.Context, packageId string, version string, apiType string, groupName string, req view.OperationGroupPublishReq) (string, error)
	GetOperationGroupPublishStatus(ctx context.Context, publishId string) (*view.OperationGroupPublishStatusResponse, error)
}

func NewOperationGroupService(operationRepository repository.OperationRepository, publishedRepo repository.PublishedRepository, exportRepository repository.ExportResultRepository,
	packageVersionEnrichmentService PackageVersionEnrichmentService, activityTrackingService ActivityTrackingService, publishedService PublishedService, systemInfoService SystemInfoService) OperationGroupService {
	return &operationGroupServiceImpl{
		operationRepo:                          operationRepository,
		publishedRepo:                          publishedRepo,
		exportRepository:                       exportRepository,
		packageVersionEnrichmentService:        packageVersionEnrichmentService,
		atService:                              activityTrackingService,
		publishedService:                       publishedService,
		previousVersionStatusValidationEnabled: systemInfoService.GetFeatureFlags().PreviousVersionStatusValidation,
	}
}

type operationGroupServiceImpl struct {
	operationRepo                          repository.OperationRepository
	publishedRepo                          repository.PublishedRepository
	exportRepository                       repository.ExportResultRepository
	packageVersionEnrichmentService        PackageVersionEnrichmentService
	atService                              ActivityTrackingService
	publishedService                       PublishedService
	previousVersionStatusValidationEnabled bool
	buildService                           BuildService
}

func (o *operationGroupServiceImpl) SetBuildService(buildService BuildService) {
	o.buildService = buildService
}

func (o operationGroupServiceImpl) CheckOperationGroupExists(ctx context.Context, packageId string, version string, apiType string, groupName string) (bool, error) {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
	if err != nil {
		return false, err
	}
	if versionEnt == nil {
		return false, nil
	}
	group, err := o.operationRepo.GetOperationGroup(ctx, packageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
	if err != nil {
		return false, err
	}
	if group != nil {
		return true, nil
	} else {
		return false, nil
	}
}

func (o operationGroupServiceImpl) CreateOperationGroup(ctx context.Context, packageId string, version string, apiType string, createReq view.CreateOperationGroupReq) error {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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

	existingGroup, err := o.operationRepo.GetOperationGroup(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, createReq.GroupName)
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
	err = o.operationRepo.CreateOperationGroup(ctx, newGroupEntity, templateEnt)
	if err != nil {
		return err
	}
	err = o.operationRepo.AddOperationGroupHistory(ctx, entity.MakeOperationGroupHistoryEntity(*newGroupEntity, view.OperationGroupActionCreate, secctx.GetUserId(ctx)))
	if err != nil {
		log.Errorf("failed to insert operation group history: %v", err.Error())
	}
	dataMap := map[string]interface{}{}
	dataMap["groupName"] = newGroupEntity.GroupName
	dataMap["version"] = newGroupEntity.Version
	dataMap["revision"] = newGroupEntity.Revision
	dataMap["apiType"] = newGroupEntity.ApiType
	o.atService.TrackEvent(ctx, view.ActivityTrackingEvent{
		Type:      view.ATETCreateManualGroup,
		Data:      dataMap,
		PackageId: newGroupEntity.PackageId,
		Date:      time.Now(),
		UserId:    secctx.GetUserId(ctx),
	})

	return nil
}

func (o operationGroupServiceImpl) makeGroupedOperationEntities(ctx context.Context, versionEnt *entity.PublishedVersionEntity, groupEntity *entity.OperationGroupEntity, operations []view.GroupOperations) ([]entity.GroupedOperationEntity, error) {
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
	refs, err := o.publishedRepo.GetVersionRefsV3(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
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
				versionEnt, err := o.publishedRepo.GetVersion(ctx, operation.PackageId, operation.Version)
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

func (o operationGroupServiceImpl) UpdateOperationGroup(ctx context.Context, packageId string, version string, apiType string, groupName string, updateReq view.UpdateOperationGroupReq) error {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
	existingGroup, err := o.operationRepo.GetOperationGroup(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
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
		existingNewGroup, err := o.operationRepo.GetOperationGroup(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, *updateReq.GroupName)
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
		groupedOperationEntities, err := o.makeGroupedOperationEntities(ctx, versionEnt, &updatedGroup, *updateReq.Operations)
		if err != nil {
			return err
		}
		newGroupedOperationEntities = &groupedOperationEntities
	}

	err = o.operationRepo.UpdateOperationGroup(ctx, existingGroup, &updatedGroup, templateEnt, newGroupedOperationEntities)
	if err != nil {
		return err
	}
	err = o.clearOperationGroupCache(ctx, packageId, versionEnt.Version, versionEnt.Revision, apiType, existingGroup.GroupId)
	if err != nil {
		return err
	}

	groupParameters := make([]string, 0)
	if existingGroup.GroupId != updatedGroup.GroupId {
		err = o.operationRepo.AddOperationGroupHistory(ctx, entity.MakeOperationGroupHistoryEntity(*existingGroup, view.OperationGroupActionDelete, secctx.GetUserId(ctx)))
		if err != nil {
			log.Errorf("failed to insert operation group history: %v", err.Error())
		}
		err = o.operationRepo.AddOperationGroupHistory(ctx, entity.MakeOperationGroupHistoryEntity(updatedGroup, view.OperationGroupActionCreate, secctx.GetUserId(ctx)))
		if err != nil {
			log.Errorf("failed to insert operation group history: %v", err.Error())
		}
		groupParameters = append(groupParameters, "name")
	} else {
		err = o.operationRepo.AddOperationGroupHistory(ctx, entity.MakeOperationGroupHistoryEntity(updatedGroup, view.OperationGroupActionUpdate, secctx.GetUserId(ctx)))
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
	o.atService.TrackEvent(ctx, view.ActivityTrackingEvent{
		Type:      view.ATETOperationsGroupParameters,
		Data:      dataMap,
		PackageId: updatedGroup.PackageId,
		Date:      time.Now(),
		UserId:    secctx.GetUserId(ctx),
	})
	return nil
}

func (o operationGroupServiceImpl) DeleteOperationGroup(ctx context.Context, packageId string, version string, apiType string, groupName string) error {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
	existingGroup, err := o.operationRepo.GetOperationGroup(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
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
	err = o.operationRepo.DeleteOperationGroup(ctx, existingGroup)
	if err != nil {
		return err
	}
	err = o.clearOperationGroupCache(ctx, packageId, versionEnt.Version, versionEnt.Revision, apiType, existingGroup.GroupId)
	if err != nil {
		return err
	}
	err = o.operationRepo.AddOperationGroupHistory(ctx, entity.MakeOperationGroupHistoryEntity(*existingGroup, view.OperationGroupActionDelete, secctx.GetUserId(ctx)))
	if err != nil {
		log.Errorf("failed to insert operation group history: %v", err.Error())
	}
	dataMap := map[string]interface{}{}
	dataMap["groupName"] = existingGroup.GroupName
	dataMap["version"] = existingGroup.Version
	dataMap["revision"] = existingGroup.Revision
	dataMap["apiType"] = existingGroup.ApiType
	o.atService.TrackEvent(ctx, view.ActivityTrackingEvent{
		Type:      view.ATETDeleteManualGroup,
		Data:      dataMap,
		PackageId: existingGroup.PackageId,
		Date:      time.Now(),
		UserId:    secctx.GetUserId(ctx),
	})

	return nil
}

func (o operationGroupServiceImpl) CalculateOperationGroups(ctx context.Context, packageId string, version string, groupingPrefix string) ([]string, error) {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
	operationGroups, err := o.operationRepo.CalculateOperationGroups(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, groupingPrefix)
	if err != nil {
		return nil, err
	}
	return operationGroups, nil
}

func (o operationGroupServiceImpl) GetGroupedOperations(ctx context.Context, packageId string, version string, apiType string, groupName string, searchReq view.OperationListReq) (*view.GroupedOperations, error) {
	if searchReq.RefPackageId != "" {
		packageEnt, err := o.publishedRepo.GetPackage(ctx, packageId)
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
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
	existingGroup, err := o.operationRepo.GetOperationGroup(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
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
	searchReq.CustomTagKey, searchReq.CustomTagValue, err = parseTextFilterToCustomTagKeyValue(searchReq.TextFilter)
	if err != nil {
		return nil, err
	}
	operationEnts, err := o.operationRepo.GetGroupedOperations(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName, searchReq)
	if err != nil {
		return nil, err
	}
	operationList := make([]interface{}, 0)
	packageVersions := make(map[string][]string, 0)
	for _, ent := range operationEnts {
		operationList = append(operationList, entity.MakeOperationView(ent))
		packageVersions[ent.PackageId] = append(packageVersions[ent.PackageId], view.MakeVersionRefKey(ent.Version, ent.Revision))
	}
	packagesRefs, err := o.packageVersionEnrichmentService.GetPackageVersionRefsMap(ctx, packageVersions)
	if err != nil {
		return nil, err
	}
	operations := view.GroupedOperations{
		Operations: operationList,
		Packages:   packagesRefs,
	}
	return &operations, nil
}

func (o operationGroupServiceImpl) clearOperationGroupCache(ctx context.Context, packageId string, version string, revision int, apiType string, groupId string) error {
	return o.exportRepository.DeleteTransformedDocuments(ctx, packageId, version, revision, apiType, groupId)
}

func (o operationGroupServiceImpl) GetOperationGroupExportTemplate(ctx context.Context, packageId string, version string, apiType string, groupName string) ([]byte, string, error) {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
	operationsGroupTemplate, err := o.operationRepo.GetOperationGroupTemplateFile(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
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

func (o operationGroupServiceImpl) StartOperationGroupPublish(ctx context.Context, packageId string, version string, apiType string, groupName string, req view.OperationGroupPublishReq) (string, error) {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
	exists, err := o.CheckOperationGroupExists(ctx, packageId, version, apiType, groupName)
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
	if req.PreviousVersion != "" {
		previousVersionPackageId := req.PreviousVersionPackageId
		if previousVersionPackageId == "" {
			previousVersionPackageId = req.PackageId
		}
		previousVersionStatus, previousVersionHasErrors, previousVersionFound, err := o.publishedService.GetVersionStatus(ctx, previousVersionPackageId, req.PreviousVersion)
		if err != nil {
			return "", err
		}
		if o.previousVersionStatusValidationEnabled {
			if !previousVersionFound {
				return "", &exception.CustomError{
					Status:  http.StatusNotFound,
					Code:    exception.PublishedPackageVersionNotFound,
					Message: exception.PublishedPackageVersionNotFoundMsg,
					Params:  map[string]interface{}{"packageId": previousVersionPackageId, "version": req.PreviousVersion},
				}
			}
			// A release version's previous version must be a release; a draft version may reference a draft previous version.
			if req.Status == string(view.Release) && previousVersionStatus == string(view.Draft) {
				return "", newReleaseVersionPreviousVersionNotReleaseError(ctx, req.PackageId, req.Version, previousVersionPackageId, req.PreviousVersion)
			}
		}
		if previousVersionHasErrors {
			return "", &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.VersionHasErrors,
				Message: exception.PreviousVersionHasErrorsMsg,
				Params: map[string]interface{}{
					"previousVersionPackageId": previousVersionPackageId,
					"previousVersion":          req.PreviousVersion,
				},
			}
		}
	}

	// Publishing this version as a draft must not leave a release version that references it as its previous version.
	if o.previousVersionStatusValidationEnabled && req.Status == string(view.Draft) {
		if err := o.publishedService.CheckNoReleaseDependentVersions(ctx, req.PackageId, req.Version); err != nil {
			return "", err
		}
	}

	publishId := uuid.NewString()
	operationGroupPublishEnt := &entity.OperationGroupPublishEntity{
		PublishId: publishId,
		Status:    string(view.StatusRunning),
	}
	err = o.publishedRepo.StoreOperationGroupPublishProcess(ctx, operationGroupPublishEnt)
	if err != nil {
		return "", fmt.Errorf("failed to create operation group publish process: %w", err)
	}
	// Detach from the request context so the async operation-group publish survives the response, but
	// keep a safety-net bound so a runaway publish can't run forever.
	bgCtx, cancel := context.WithTimeout(secctx.Detach(ctx), operationGroupPublishTimeout)
	utils.SafeAsync(func() {
		defer cancel()
		o.publishOperationGroup(bgCtx, versionEnt, apiType, groupName, req, operationGroupPublishEnt)
	})
	return publishId, nil
}

func (o operationGroupServiceImpl) publishOperationGroup(ctx context.Context, version *entity.PublishedVersionEntity, apiType string, groupName string, req view.OperationGroupPublishReq, publishEnt *entity.OperationGroupPublishEntity) {
	var buildConfig view.BuildConfig
	if apiType == string(view.RestApiType) {
		buildConfig = view.BuildConfig{
			PackageId:                    version.PackageId,
			Version:                      view.MakeVersionRefKey(version.Version, version.Revision),
			BuildType:                    view.ExportRestOperationsGroup,
			CreatedBy:                    secctx.GetUserId(ctx),
			ApiType:                      string(view.RestApiType),
			GroupName:                    groupName,
			OperationsSpecTransformation: view.TransformationReducedSource,
			Format:                       view.FormatJSON,
		}
	} else if apiType == string(view.GraphqlApiType) {
		buildConfig = view.BuildConfig{
			PackageId:                    version.PackageId,
			Version:                      view.MakeVersionRefKey(version.Version, version.Revision),
			BuildType:                    view.ExportGraphqlOperationsGroup,
			CreatedBy:                    secctx.GetUserId(ctx),
			ApiType:                      string(view.GraphqlApiType),
			GroupName:                    groupName,
			OperationsSpecTransformation: view.TransformationReducedSource,
			Format:                       "graphql",
		}
	} else if apiType == string(view.AsyncapiApiType) {
		buildConfig = view.BuildConfig{
			PackageId:                    version.PackageId,
			Version:                      view.MakeVersionRefKey(version.Version, version.Revision),
			BuildType:                    view.ExportAsyncapiOperationsGroup,
			CreatedBy:                    secctx.GetUserId(ctx),
			ApiType:                      string(view.AsyncapiApiType),
			GroupName:                    groupName,
			OperationsSpecTransformation: view.TransformationReducedSource,
			Format:                       view.FormatJSON,
		}
	} else {
		o.updatePublishProcess(ctx, publishEnt, string(view.StatusError), fmt.Sprintf("unsupported API type: %s", apiType))
		return
	}
	exportBuildId, _, err := o.buildService.CreateBuildWithoutDependencies(ctx, buildConfig, false, "")
	if err != nil {
		o.updatePublishProcess(ctx, publishEnt, string(view.StatusError), fmt.Sprintf("failed to create export build: %v", utils.WrapContextError(ctx, err)))
		return
	}

	err = o.buildService.AwaitBuildCompletion(ctx, exportBuildId)
	if err != nil {
		o.updatePublishProcess(ctx, publishEnt, string(view.StatusError), fmt.Sprintf("export build failed: %v", utils.WrapContextError(ctx, err)))
		return
	}
	exportResult, err := o.exportRepository.GetExportResult(ctx, exportBuildId)
	if err != nil {
		o.updatePublishProcess(ctx, publishEnt, string(view.StatusError), fmt.Sprintf("failed to get export result: %v", utils.WrapContextError(ctx, err)))
		return
	}
	if exportResult == nil {
		o.updatePublishProcess(ctx, publishEnt, string(view.StatusError), "export result not found")
		return
	}

	files := make([]view.BCFile, 0)
	publishFile := true
	var data []byte
	if strings.HasSuffix(exportResult.Filename, ".zip") {
		r, err := zip.NewReader(bytes.NewReader(exportResult.Data), int64(len(exportResult.Data)))
		if err != nil {
			o.updatePublishProcess(ctx, publishEnt, string(view.StatusError), "failed to read export result")
			return
		}
		for _, f := range r.File {
			files = append(files, view.BCFile{
				FileId:  f.Name,
				Publish: &publishFile,
			})
		}
		data = exportResult.Data
	} else {
		var buf bytes.Buffer
		zw := zip.NewWriter(&buf)
		if err := archive.AddFileToZip(zw, exportResult.Filename, exportResult.Data); err != nil {
			o.updatePublishProcess(ctx, publishEnt, string(view.StatusError), "failed to create source archive")
			return
		}
		if err := zw.Close(); err != nil {
			o.updatePublishProcess(ctx, publishEnt, string(view.StatusError), "failed to create source archive")
			return
		}
		files = append(files, view.BCFile{
			FileId:  exportResult.Filename,
			Publish: &publishFile,
		})
		data = buf.Bytes()
	}

	groupPublishBuildConfig := view.BuildConfig{
		PackageId:                req.PackageId,
		Version:                  req.Version,
		BuildType:                view.PublishType,
		PreviousVersion:          req.PreviousVersion,
		PreviousVersionPackageId: req.PreviousVersionPackageId,
		Status:                   req.Status,
		Files:                    files,
		CreatedBy:                secctx.GetUserId(ctx),
		Metadata: view.BuildConfigMetadata{
			VersionLabels: req.VersionLabels,
		},
	}
	build, err := o.buildService.PublishVersion(ctx, groupPublishBuildConfig, data, false, "", nil, false, false)
	if err != nil {
		o.updatePublishProcess(ctx, publishEnt, string(view.StatusError), fmt.Sprintf("faield to start operation group publish: %v", utils.WrapContextError(ctx, err)))
		return
	}
	err = o.buildService.AwaitBuildCompletion(ctx, build.PublishId)
	if err != nil {
		o.updatePublishProcess(ctx, publishEnt, string(view.StatusError), fmt.Sprintf("faield to publish operation group: %v", utils.WrapContextError(ctx, err)))
		return
	}
	o.updatePublishProcess(ctx, publishEnt, string(view.StatusComplete), "")
}

func (o operationGroupServiceImpl) updatePublishProcess(ctx context.Context, publishEnt *entity.OperationGroupPublishEntity, status string, details string) {
	publishEnt.Status = status
	publishEnt.Details = details
	// Persist the terminal status on an independent short-lived context so a timed-out work context
	// cannot leave the publish record stuck at 'running' (see statusFinalizationTimeout).
	finCtx, cancel := context.WithTimeout(secctx.Detach(ctx), statusFinalizationTimeout)
	defer cancel()
	err := o.publishedRepo.UpdateOperationGroupPublishProcess(finCtx, publishEnt)
	if err != nil {
		log.Errorf("failed to update operation group publish process: %v", err.Error())
	}
}

func (o operationGroupServiceImpl) GetOperationGroupPublishStatus(ctx context.Context, publishId string) (*view.OperationGroupPublishStatusResponse, error) {
	publishProcess, err := o.publishedRepo.GetOperationGroupPublishProcess(ctx, publishId)
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
