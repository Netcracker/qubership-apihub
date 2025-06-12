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
	"bufio"
	"bytes"
	"encoding/csv"
	"fmt"
	"net/http"
	"path"
	"regexp"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/crypto"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type VersionService interface {
	SetBuildService(buildService BuildService)

	GetPackageVersionContent_deprecated(packageId string, versionName string, includeSummary bool, includeOperations bool, includeGroups bool) (*view.VersionContent_deprecated, error)
	GetPackageVersionContent(packageId string, versionName string, includeSummary bool, includeOperations bool, includeGroups bool) (*view.VersionContent, error)
	GetPackageVersionsView_deprecated(req view.VersionListReq) (*view.PublishedVersionsView_deprecated_v2, error)
	GetPackageVersionsView(req view.VersionListReq) (*view.PublishedVersionsView, error)
	DeleteVersion(ctx context.SecurityContext, packageId string, versionName string) error
	PatchVersion(ctx context.SecurityContext, packageId string, versionName string, status *string, versionLabels *[]string) (*view.VersionContent, error)
	GetLatestContentDataBySlug(packageId string, versionName string, slug string) (*view.PublishedContent, *view.ContentData, error)
	GetLatestDocumentBySlug_deprecated(packageId string, versionName string, slug string) (*view.PublishedDocument_deprecated, error)
	GetLatestDocumentBySlug(packageId string, versionName string, slug string) (*view.PublishedDocument, error)
	GetLatestDocuments(packageId string, versionName string, skipRefs bool, filterReq view.DocumentsFilterReq) (*view.VersionDocuments, error)
	GetSharedFile(sharedFileId string) ([]byte, string, error)
	SharePublishedFile(packageId string, versionName string, slug string) (*view.SharedUrlResult, error)
	GetVersionValidationChanges(packageId string, versionName string) (*view.VersionValidationChanges, error)
	GetVersionValidationProblems(packageId string, versionName string) (*view.VersionValidationProblems, error)
	GetDefaultVersion(packageId string) (string, error)
	GetVersionDetails(packageId string, versionName string) (*view.VersionDetails, error)
	GetVersionReferences(packageId string, versionName string, filterReq view.VersionReferencesReq) (*view.VersionReferences, error) //deprecated
	GetVersionReferencesV3(packageId string, versionName string) (*view.VersionReferencesV3, error)
	SearchForPackages(searchReq view.SearchQueryReq) (*view.SearchResult, error)
	SearchForDocuments(searchReq view.SearchQueryReq) (*view.SearchResult, error)
	GetVersionStatus(packageId string, version string) (string, error)
	GetLatestRevision(packageId string, versionName string) (int, error)
	GetVersionChanges(packageId, version, apiType string, severities []string, changelogCalculationParams view.VersionChangesReq) (*view.VersionChangesView, error)
	GetVersionRevisionsList_deprecated(packageId, versionName string, filterReq view.PagingFilterReq) (*view.PackageVersionRevisions_deprecated, error)
	GetVersionRevisionsList(packageId, versionName string, filterReq view.PagingFilterReq) (*view.PackageVersionRevisions, error)
	GetTransformedDocuments_deprecated(packageId, version, apiType, groupName, format string) ([]byte, error)
	GetTransformedDocuments(packageId string, version string, apiType string, groupName string, buildType string, format string) ([]byte, error)
	DeleteVersionsRecursively(ctx context.SecurityContext, packageId string, retention time.Time) (string, error)
	CopyVersion(ctx context.SecurityContext, packageId string, version string, req view.CopyVersionReq) (string, error)
	GetPublishedVersionsHistory(filter view.PublishedVersionHistoryFilter) ([]view.PublishedVersionHistoryView, error)
	StartPublishFromCSV(ctx context.SecurityContext, req view.PublishFromCSVReq) (string, error)
	GetCSVDashboardPublishStatus(publishId string) (*view.CSVDashboardPublishStatusResponse, error)
	GetCSVDashboardPublishReport(publishId string) ([]byte, error)
}

func NewVersionService(gitClientProvider GitClientProvider,
	repo repository.PrjGrpIntRepository,
	favoritesRepo repository.FavoritesRepository,
	publishedRepo repository.PublishedRepository,
	publishedService PublishedService,
	operationRepo repository.OperationRepository,
	exportRepository repository.ExportResultRepository,
	operationService OperationService,
	atService ActivityTrackingService,
	systemInfoService SystemInfoService,
	packageVersionEnrichmentService PackageVersionEnrichmentService,
	portalService PortalService,
	versionCleanupRepository repository.VersionCleanupRepository,
	operationGroupService OperationGroupService) VersionService {
	return &versionServiceImpl{
		gitClientProvider:               gitClientProvider,
		pRepo:                           repo,
		favoritesRepo:                   favoritesRepo,
		publishedRepo:                   publishedRepo,
		exportRepository:                exportRepository,
		publishedService:                publishedService,
		operationRepo:                   operationRepo,
		operationService:                operationService,
		atService:                       atService,
		systemInfoService:               systemInfoService,
		packageVersionEnrichmentService: packageVersionEnrichmentService,
		portalService:                   portalService,
		versionCleanupRepository:        versionCleanupRepository,
		operationGroupService:           operationGroupService,
	}
}

type versionServiceImpl struct {
	gitClientProvider               GitClientProvider
	pRepo                           repository.PrjGrpIntRepository
	favoritesRepo                   repository.FavoritesRepository
	publishedRepo                   repository.PublishedRepository
	publishedService                PublishedService
	operationRepo                   repository.OperationRepository
	exportRepository                repository.ExportResultRepository
	operationService                OperationService
	atService                       ActivityTrackingService
	systemInfoService               SystemInfoService
	packageVersionEnrichmentService PackageVersionEnrichmentService
	portalService                   PortalService
	versionCleanupRepository        repository.VersionCleanupRepository
	buildService                    BuildService
	operationGroupService           OperationGroupService
}

func (v *versionServiceImpl) SetBuildService(buildService BuildService) {
	v.buildService = buildService
}

func (v versionServiceImpl) SharePublishedFile(packageId string, versionName string, slug string) (*view.SharedUrlResult, error) {
	version, err := v.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return nil, err
	}
	if version == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}

	content, err := v.publishedRepo.GetLatestContentBySlug(packageId, version.Version, slug)
	if err != nil {
		return nil, err
	}

	if content == nil {
		return nil, &exception.ContentNotFoundError{ContentId: slug}
	}

	for attempts := 0; attempts < 100; attempts++ {
		sharedIdInfoEntity, err := v.publishedRepo.GetFileSharedInfo(packageId, slug, version.Version)
		if err != nil {
			return nil, err
		}
		if sharedIdInfoEntity != nil {
			return entity.MakeSharedUrlInfoV2(sharedIdInfoEntity), nil
		}

		newSharedUrlInfoEntity := &entity.SharedUrlInfoEntity{
			SharedId:  generateSharedId(8),
			PackageId: packageId,
			Version:   version.Version,
			FileId:    slug, // TODO: Slug!
		}
		if err := v.publishedRepo.CreateFileSharedInfo(newSharedUrlInfoEntity); err != nil {
			if customError, ok := err.(*exception.CustomError); ok {
				if customError.Code == exception.GeneratedSharedIdIsNotUnique {
					continue
				} else {
					return nil, err
				}
			}
		} else {
			return entity.MakeSharedUrlInfoV2(newSharedUrlInfoEntity), nil
		}
	}
	return nil, fmt.Errorf("failed to generate unique shared id")
}

func generateSharedId(size int) string {
	rndHash := crypto.CreateRandomHash()
	return strings.ToLower(rndHash[:size])
}

func (v versionServiceImpl) GetSharedFile(sharedFileId string) ([]byte, string, error) {
	sharedFileIdInfo, err := v.publishedRepo.GetFileSharedInfoById(sharedFileId)
	if err != nil {
		return nil, "", err
	}
	if sharedFileIdInfo == nil {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.SharedFileIdNotFound,
			Message: exception.SharedFileIdNotFoundMsg,
			Params:  map[string]interface{}{"sharedFileId": sharedFileId},
		}
	}
	version, err := v.publishedRepo.GetVersionIncludingDeleted(sharedFileIdInfo.PackageId, sharedFileIdInfo.Version)
	if err != nil {
		return nil, "", err
	}
	if version == nil {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": sharedFileIdInfo.Version},
		}
	}
	if version.DeletedAt != nil && !version.DeletedAt.IsZero() {
		return nil, "", &exception.CustomError{
			Status:  http.StatusGone,
			Code:    exception.SharedContentUnavailable,
			Message: exception.SharedContentUnavailableMsg,
			Params:  map[string]interface{}{"sharedFileId": sharedFileId},
		}
	}

	content, err := v.publishedRepo.GetLatestContentBySlug(sharedFileIdInfo.PackageId, sharedFileIdInfo.Version, sharedFileIdInfo.FileId)
	if err != nil {
		return nil, "", err
	}
	if content == nil {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.NoContentFoundForSharedId,
			Message: exception.NoContentFoundForSharedIdMsg,
			Params:  map[string]interface{}{"sharedFileId": sharedFileId},
		}
	}

	pce, err := v.publishedRepo.GetContentData(content.PackageId, content.Checksum)
	if err != nil {
		return nil, "", err
	}
	if pce == nil {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.NoContentFoundForSharedId,
			Message: exception.NoContentFoundForSharedIdMsg,
			Params:  map[string]interface{}{"sharedFileId": sharedFileId},
		}
	}

	attachmentFileName := content.FileId
	if content.Format == view.JsonFormat {
		attachmentFileName = fmt.Sprintf("%s.%s", strings.TrimSuffix(content.FileId, path.Ext(content.FileId)), string(view.JsonExtension))
	}
	return pce.Data, attachmentFileName, nil
}

func (v versionServiceImpl) GetLatestDocumentBySlug_deprecated(packageId string, versionName string, slug string) (*view.PublishedDocument_deprecated, error) {
	versionEnt, err := v.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}

	document, err := v.publishedRepo.GetLatestContentBySlug(packageId, versionName, slug)
	if err != nil {
		return nil, err
	}
	if document == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ContentSlugNotFound,
			Message: exception.ContentSlugNotFoundMsg,
			Params:  map[string]interface{}{"contentSlug": slug},
		}
	}
	operationEnts, err := v.operationRepo.GetOperationsByIds(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, document.OperationIds)
	if err != nil {
		return nil, err
	}
	operations := make([]view.DocumentsOperation_deprecated, 0)
	for _, operationEnt := range operationEnts {
		operations = append(operations, entity.MakeDocumentsOperationView_deprecated(operationEnt))
	}
	documentView := entity.MakePublishedDocumentView_deprecated(document)
	documentView.Operations = operations
	return documentView, nil
}

func (v versionServiceImpl) GetLatestDocumentBySlug(packageId string, versionName string, slug string) (*view.PublishedDocument, error) {
	versionEnt, err := v.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}

	document, err := v.publishedRepo.GetLatestContentBySlug(packageId, versionName, slug)
	if err != nil {
		return nil, err
	}
	if document == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ContentSlugNotFound,
			Message: exception.ContentSlugNotFoundMsg,
			Params:  map[string]interface{}{"contentSlug": slug},
		}
	}
	operationEnts, err := v.operationRepo.GetOperationsByIds(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, document.OperationIds)
	if err != nil {
		return nil, err
	}
	operations := make([]interface{}, 0)
	for _, operationEnt := range operationEnts {
		operations = append(operations, entity.MakeDocumentsOperationView(operationEnt))
	}
	documentView := entity.MakePublishedDocumentView(document)
	documentView.Operations = operations
	return documentView, nil
}

func (v versionServiceImpl) GetLatestDocuments(packageId string, versionName string, skipRefs bool, filterReq view.DocumentsFilterReq) (*view.VersionDocuments, error) {
	version, err := v.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return nil, err
	}
	if version == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}

	searchQuery := entity.PublishedContentSearchQueryEntity{
		TextFilter:          filterReq.TextFilter,
		Limit:               filterReq.Limit,
		Offset:              filterReq.Offset,
		DocumentTypesFilter: view.GetDocumentTypesForApiType(filterReq.ApiType),
	}

	versionDocuments := make([]view.PublishedDocumentRefView, 0)
	packageVersions := make(map[string][]string, 0)
	versionDocumentEnts, err := v.publishedRepo.GetRevisionContentWithLimit(packageId, version.Version, version.Revision, skipRefs, searchQuery)
	if err != nil {
		return nil, err
	}
	for _, versionDocumentEnt := range versionDocumentEnts {
		tmpEnt := versionDocumentEnt
		versionDocuments = append(versionDocuments, *entity.MakePublishedDocumentRefView2(&tmpEnt))
		packageVersions[tmpEnt.PackageId] = append(packageVersions[tmpEnt.PackageId], view.MakeVersionRefKey(tmpEnt.Version, tmpEnt.Revision))
	}

	packagesRefs, err := v.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
	if err != nil {
		return nil, err
	}
	return &view.VersionDocuments{Documents: versionDocuments, Packages: packagesRefs}, nil
}

// deprecated
func (v versionServiceImpl) GetVersionReferences(packageId string, versionName string, filterReq view.VersionReferencesReq) (*view.VersionReferences, error) {
	version, err := v.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return nil, err
	}
	if version == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}
	versionReferences := make([]view.VersionReference, 0)
	searchQuery := entity.PackageVersionSearchQueryEntity{
		PackageId:          packageId,
		Version:            version.Version,
		Revision:           version.Revision,
		TextFilter:         filterReq.TextFilter,
		Kind:               filterReq.Kind,
		Limit:              filterReq.Limit,
		Offset:             filterReq.Page * filterReq.Limit,
		ShowAllDescendants: filterReq.ShowAllDescendants,
	}

	publishedReferences, err := v.publishedRepo.GetVersionRefs(searchQuery)

	if err != nil {
		return nil, err
	}

	for _, ref := range publishedReferences {
		parents, err := v.getParents(ref.PackageId)
		if err != nil {
			return nil, err
		}
		versionReferences = append(versionReferences, view.VersionReference{
			RefId:     ref.PackageId,
			Name:      ref.PackageName,
			Version:   ref.Version,
			Revision:  ref.Revision,
			Status:    ref.VersionStatus,
			Kind:      ref.Kind,
			DeletedAt: ref.DeletedAt,
			DeletedBy: ref.DeletedBy,
			Parents:   parents,
		})
	}
	return &view.VersionReferences{References: versionReferences}, nil
}

func (v versionServiceImpl) GetVersionReferencesV3(packageId string, versionName string) (*view.VersionReferencesV3, error) {
	versionEnt, err := v.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}
	versionReferences := make([]view.VersionReferenceV3, 0)

	publishedReferencesEnts, err := v.publishedRepo.GetVersionRefsV3(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}
	packageVersions := make(map[string][]string, 0)
	for _, refEntity := range publishedReferencesEnts {
		versionReferences = append(versionReferences, entity.MakePublishedReferenceView(refEntity))
		packageVersions[refEntity.RefPackageId] = append(packageVersions[refEntity.RefPackageId], view.MakeVersionRefKey(refEntity.RefVersion, refEntity.RefRevision))
	}
	packagesRefs, err := v.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
	if err != nil {
		return nil, err
	}
	return &view.VersionReferencesV3{References: versionReferences, Packages: packagesRefs}, nil
}

func (v versionServiceImpl) getParents(packageId string) ([]view.ParentPackageInfo, error) {
	parents, err := v.publishedRepo.GetParentsForPackage(packageId)
	if err != nil {
		return nil, err
	}
	var result []view.ParentPackageInfo
	for _, grp := range parents {
		result = append(result, *entity.MakePackageParentView(&grp))
	}
	return result, err
}
func (v versionServiceImpl) GetLatestContentDataBySlug(packageId string, versionName string, slug string) (*view.PublishedContent, *view.ContentData, error) {
	ent, err := v.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return nil, nil, err
	}
	if ent == nil {
		return nil, nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}

	content, err := v.publishedRepo.GetRevisionContentBySlug(packageId, ent.Version, slug, ent.Revision)
	if err != nil {
		return nil, nil, err
	}
	if content == nil {
		return nil, nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ContentSlugNotFound,
			Message: exception.ContentSlugNotFoundMsg,
			Params:  map[string]interface{}{"contentSlug": slug},
		}
	}

	pce, err := v.publishedRepo.GetContentData(packageId, content.Checksum)
	if err != nil {
		return nil, nil, err
	}
	if pce == nil {
		return nil, nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ContentSlugNotFound,
			Message: exception.ContentSlugNotFoundMsg,
			Params:  map[string]interface{}{"contentSlug": slug},
		}
	}
	return entity.MakePublishedContentView(content), entity.MakeContentDataViewPub(content, pce), nil
}

func (v versionServiceImpl) DeleteVersion(ctx context.SecurityContext, packageId string, versionName string) error {
	version, revision, err := repository.SplitVersionRevision(versionName)
	if err != nil {
		return err
	}
	versionEnt, err := v.publishedRepo.GetVersion(packageId, version)
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
	if revision != 0 && revision != versionEnt.Revision {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.UnableToDeleteOldRevision,
			Message: exception.UnableToDeleteOldRevisionMsg,
		}
	}
	err = v.publishedService.DeleteVersion(ctx, packageId, versionEnt.Version)
	if err != nil {
		return err
	}
	dataMap := map[string]interface{}{}
	dataMap["version"] = versionEnt.Version
	dataMap["revision"] = versionEnt.Revision
	dataMap["status"] = versionEnt.Status

	v.atService.TrackEvent(view.ActivityTrackingEvent{
		Type:      view.ATETDeleteVersion,
		Data:      dataMap,
		PackageId: packageId,
		Date:      time.Now(),
		UserId:    ctx.GetUserId(),
	})
	return nil
}

func (v versionServiceImpl) PatchVersion(ctx context.SecurityContext, packageId string, versionName string, status *string, versionLabels *[]string) (*view.VersionContent, error) {
	version, revision, err := repository.SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}
	versionEnt, err := v.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName, "packageId": packageId},
		}
	}
	if revision != 0 && revision != versionEnt.Revision {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.UnableToChangeOldRevision,
			Message: exception.UnableToChangeOldRevisionMsg,
		}
	}
	dataMap := map[string]interface{}{}
	versionMeta := make([]string, 0)

	if status != nil {
		newStatus := *status
		if newStatus == string(view.Release) {
			packEnt, err := v.publishedRepo.GetPackage(packageId)
			if err != nil {
				return nil, err
			}
			var pattern string
			if packEnt.ReleaseVersionPattern != "" {
				pattern = packEnt.ReleaseVersionPattern
			} else {
				pattern = ".*"
			}
			err = ReleaseVersionMatchesPattern(versionEnt.Version, pattern)
			if err != nil {
				return nil, err
			}
		}

		dataMap["oldStatus"] = versionEnt.Status
		dataMap["newStatus"] = newStatus
		versionMeta = append(versionMeta, "status")
	}

	if versionLabels != nil {
		dataMap["oldVersionLabels"] = versionEnt.Labels
		dataMap["newVersionLabels"] = versionLabels
		versionMeta = append(versionMeta, "versionLabels")
	}

	_, err = v.publishedRepo.PatchVersion(packageId, versionEnt.Version, status, versionLabels)
	if err != nil {
		return nil, err
	}

	result, err := v.GetPackageVersionContent(packageId, versionEnt.Version, true, false, false)
	if err != nil {
		return nil, err
	}
	dataMap["version"] = versionEnt.Version
	dataMap["revision"] = versionEnt.Revision
	dataMap["versionMeta"] = versionMeta
	v.atService.TrackEvent(view.ActivityTrackingEvent{
		Type:      view.ATETPatchVersionMeta,
		Data:      dataMap,
		PackageId: packageId,
		Date:      time.Now(),
		UserId:    ctx.GetUserId(),
	})
	return result, nil
}

func (v versionServiceImpl) GetPackageVersionsView_deprecated(req view.VersionListReq) (*view.PublishedVersionsView_deprecated_v2, error) {
	packageEnt, err := v.publishedRepo.GetPackage(req.PackageId)
	if err != nil {
		return nil, err
	}
	if packageEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": req.PackageId},
		}
	}
	versions := make([]view.PublishedVersionListView_deprecated_v2, 0)
	versionSortByPG := entity.GetVersionSortByPG(req.SortBy)
	if versionSortByPG == "" {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "sortBy", "value": req.SortBy},
		}
	}
	versionSortOrderPG := entity.GetVersionSortOrderPG(req.SortOrder)
	if versionSortOrderPG == "" {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "sortOrder", "value": req.SortOrder},
		}
	}

	searchQueryReq := entity.PublishedVersionSearchQueryEntity{
		PackageId:  req.PackageId,
		Status:     req.Status,
		Label:      req.Label,
		TextFilter: req.TextFilter,
		SortBy:     versionSortByPG,
		SortOrder:  versionSortOrderPG,
		Limit:      req.Limit,
		Offset:     req.Page * req.Limit,
	}
	ents, err := v.publishedRepo.GetReadonlyPackageVersionsWithLimit_deprecated(searchQueryReq, req.CheckRevisions)
	if err != nil {
		return nil, err
	}
	for _, ent := range ents {
		version := entity.MakeReadonlyPublishedVersionListView2_deprecated(&ent)
		versions = append(versions, *version)
	}
	return &view.PublishedVersionsView_deprecated_v2{Versions: versions}, nil
}

func (v versionServiceImpl) GetPackageVersionsView(req view.VersionListReq) (*view.PublishedVersionsView, error) {
	packageEnt, err := v.publishedRepo.GetPackage(req.PackageId)
	if err != nil {
		return nil, err
	}
	if packageEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": req.PackageId},
		}
	}
	versions := make([]view.PublishedVersionListView, 0)
	versionSortByPG := entity.GetVersionSortByPG(req.SortBy)
	if versionSortByPG == "" {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "sortBy", "value": req.SortBy},
		}
	}
	versionSortOrderPG := entity.GetVersionSortOrderPG(req.SortOrder)
	if versionSortOrderPG == "" {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "sortOrder", "value": req.SortOrder},
		}
	}

	searchQueryReq := entity.PublishedVersionSearchQueryEntity{
		PackageId:  req.PackageId,
		Status:     req.Status,
		Label:      req.Label,
		TextFilter: req.TextFilter,
		SortBy:     versionSortByPG,
		SortOrder:  versionSortOrderPG,
		Limit:      req.Limit,
		Offset:     req.Page * req.Limit,
	}
	ents, err := v.publishedRepo.GetReadonlyPackageVersionsWithLimit(searchQueryReq, req.CheckRevisions)
	if err != nil {
		return nil, err
	}
	for _, ent := range ents {
		version := entity.MakeReadonlyPublishedVersionListView2(&ent)
		versions = append(versions, *version)
	}
	return &view.PublishedVersionsView{Versions: versions}, nil
}
func (v versionServiceImpl) GetPackageVersionContent_deprecated(packageId string, version string, includeSummary bool, includeOperations bool, includeGroups bool) (*view.VersionContent_deprecated, error) {
	versionEnt, err := v.publishedRepo.GetReadonlyVersion_deprecated(packageId, version)
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

	latestRevision, err := v.publishedRepo.GetLatestRevision(versionEnt.PackageId, versionEnt.Version)
	if err != nil {
		return nil, err
	}
	if latestRevision == 0 {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	versionContent := &view.VersionContent_deprecated{
		PublishedAt:              versionEnt.PublishedAt,
		PublishedBy:              versionEnt.UserName,
		PreviousVersion:          view.MakeVersionRefKey(versionEnt.PreviousVersion, versionEnt.PreviousVersionRevision),
		PreviousVersionPackageId: versionEnt.PreviousVersionPackageId,
		VersionLabels:            versionEnt.Labels,
		Status:                   versionEnt.Status,
		NotLatestRevision:        versionEnt.Revision != latestRevision,
		PackageId:                versionEnt.PackageId,
		Version:                  view.MakeVersionRefKey(versionEnt.Version, versionEnt.Revision),
		RevisionsCount:           latestRevision,
	}

	versionOperationTypes, err := v.getVersionOperationTypes_deprecated(versionEnt, includeSummary, includeOperations)
	if err != nil {
		return nil, err
	}
	if includeGroups {
		versionContent.OperationGroups, err = v.getVersionOperationGroups_deprecated(versionEnt)
		if err != nil {
			return nil, err
		}
	}

	versionContent.OperationTypes = versionOperationTypes

	return versionContent, nil
}
func (v versionServiceImpl) GetPackageVersionContent(packageId string, version string, includeSummary bool, includeOperations bool, includeGroups bool) (*view.VersionContent, error) {
	versionEnt, err := v.publishedRepo.GetReadonlyVersion(packageId, version)
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

	latestRevision, err := v.publishedRepo.GetLatestRevision(versionEnt.PackageId, versionEnt.Version)
	if err != nil {
		return nil, err
	}
	if latestRevision == 0 {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	versionContent := &view.VersionContent{
		PublishedAt:              versionEnt.PublishedAt,
		PublishedBy:              *entity.MakePrincipalView(&versionEnt.PrincipalEntity),
		PreviousVersion:          view.MakeVersionRefKey(versionEnt.PreviousVersion, versionEnt.PreviousVersionRevision),
		PreviousVersionPackageId: versionEnt.PreviousVersionPackageId,
		VersionLabels:            versionEnt.Labels,
		Status:                   versionEnt.Status,
		NotLatestRevision:        versionEnt.Revision != latestRevision,
		PackageId:                versionEnt.PackageId,
		Version:                  view.MakeVersionRefKey(versionEnt.Version, versionEnt.Revision),
		RevisionsCount:           latestRevision,
		ApiProcessorVersion:      versionEnt.Metadata.GetBuilderVersion(),
	}

	versionOperationTypes, err := v.getVersionOperationTypes(versionEnt, includeSummary, includeOperations)
	if err != nil {
		return nil, err
	}
	if includeGroups {
		versionContent.OperationGroups, err = v.getVersionOperationGroups(versionEnt)
		if err != nil {
			return nil, err
		}
	}

	versionContent.OperationTypes = versionOperationTypes

	return versionContent, nil
}

func (v versionServiceImpl) getVersionOperationTypes_deprecated(versionEnt *entity.ReadonlyPublishedVersionEntity_deprecated, includeSummary bool, includeOperations bool) ([]view.VersionOperationType, error) {
	if !includeSummary && !includeOperations {
		return nil, nil
	}
	versionSummaryMap := make(map[string]*view.VersionOperationType, 0)
	if includeSummary {
		operationsCountEnts, err := v.operationRepo.GetOperationsTypeCount(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
		if err != nil {
			return nil, err
		}
		for _, opCount := range operationsCountEnts {
			apiType, _ := view.ParseApiType(opCount.ApiType)
			if apiType == "" {
				continue
			}
			operationCount := opCount.OperationsCount
			deprecatedCount := opCount.DeprecatedCount
			noBwcOperationsCount := opCount.NoBwcOperationsCount
			if versionApiTypeSummary, exists := versionSummaryMap[opCount.ApiType]; exists {
				versionApiTypeSummary.OperationsCount = &operationCount
				versionApiTypeSummary.DeprecatedCount = &deprecatedCount
				versionApiTypeSummary.NoBwcOperationsCount = &noBwcOperationsCount
			} else {
				versionSummaryMap[opCount.ApiType] = &view.VersionOperationType{
					ApiType:              opCount.ApiType,
					OperationsCount:      &operationCount,
					DeprecatedCount:      &deprecatedCount,
					NoBwcOperationsCount: &noBwcOperationsCount,
				}
			}
		}
		if versionEnt.PreviousVersion != "" {
			previousPackageId := versionEnt.PreviousVersionPackageId
			if previousPackageId == "" {
				previousPackageId = versionEnt.PackageId
			}
			previousVersionEnt, err := v.publishedRepo.GetVersion(previousPackageId, versionEnt.PreviousVersion)
			if err != nil {
				return nil, err
			}
			if previousVersionEnt != nil {
				comparisonId := view.MakeVersionComparisonId(
					versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
					previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision)
				versionComparison, err := v.publishedRepo.GetVersionComparison(comparisonId)
				if err != nil {
					return nil, err
				}
				if versionComparison != nil {
					for _, ot := range versionComparison.OperationTypes {
						apiType, _ := view.ParseApiType(ot.ApiType)
						if apiType == "" {
							continue
						}
						changeSummary := ot.ChangesSummary
						if versionApiTypeSummary, exists := versionSummaryMap[ot.ApiType]; exists {
							versionApiTypeSummary.ChangesSummary = &changeSummary
						} else {
							versionSummaryMap[ot.ApiType] = &view.VersionOperationType{
								ApiType:        ot.ApiType,
								ChangesSummary: &changeSummary,
							}
						}
					}
					if len(versionComparison.Refs) > 0 {
						refsComparisons, err := v.publishedRepo.GetVersionRefsComparisons(comparisonId)
						if err != nil {
							return nil, err
						}
						for _, comparison := range refsComparisons {
							for _, ot := range comparison.OperationTypes {
								apiType, _ := view.ParseApiType(ot.ApiType)
								if apiType == "" {
									continue
								}
								changeSummary := ot.ChangesSummary
								if versionApiTypeSummary, exists := versionSummaryMap[ot.ApiType]; exists {
									if versionApiTypeSummary.ChangesSummary != nil {
										versionApiTypeSummary.ChangesSummary.Breaking += changeSummary.Breaking
										versionApiTypeSummary.ChangesSummary.SemiBreaking += changeSummary.SemiBreaking
										versionApiTypeSummary.ChangesSummary.Deprecated += changeSummary.Deprecated
										versionApiTypeSummary.ChangesSummary.NonBreaking += changeSummary.NonBreaking
										versionApiTypeSummary.ChangesSummary.Annotation += changeSummary.Annotation
										versionApiTypeSummary.ChangesSummary.Unclassified += changeSummary.Unclassified
									} else {
										versionApiTypeSummary.ChangesSummary = &changeSummary
									}
								} else {
									versionSummaryMap[ot.ApiType] = &view.VersionOperationType{
										ApiType:        ot.ApiType,
										ChangesSummary: &changeSummary,
									}
								}
							}
						}
					}

				}
			}
		}
	}
	if includeOperations {
		operationTypeHashes, err := v.operationRepo.GetOperationsTypeDataHashes(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
		if err != nil {
			return nil, err
		}
		for _, ot := range operationTypeHashes {
			apiType, _ := view.ParseApiType(ot.ApiType)
			if apiType == "" {
				continue
			}
			if versionApiTypeSummary, exists := versionSummaryMap[ot.ApiType]; exists {
				versionApiTypeSummary.Operations = ot.OperationsHash
			} else {
				versionSummaryMap[ot.ApiType] = &view.VersionOperationType{
					ApiType:    ot.ApiType,
					Operations: ot.OperationsHash,
				}
			}
		}
	}
	versionOperationTypes := make([]view.VersionOperationType, 0)
	for _, v := range versionSummaryMap {
		versionOperationTypes = append(versionOperationTypes, *v)
	}
	return versionOperationTypes, nil
}

func (v versionServiceImpl) getVersionOperationTypes(versionEnt *entity.PackageVersionRevisionEntity, includeSummary bool, includeOperations bool) ([]view.VersionOperationType, error) {
	if !includeSummary && !includeOperations {
		return nil, nil
	}
	zeroInt := 0
	versionSummaryMap := make(map[string]*view.VersionOperationType, 0)
	if includeSummary {
		operationsCountEnts, err := v.operationRepo.GetOperationsTypeCount(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
		if err != nil {
			return nil, err
		}
		for _, opCount := range operationsCountEnts {
			apiType, _ := view.ParseApiType(opCount.ApiType)
			if apiType == "" {
				continue
			}
			operationCount := opCount.OperationsCount
			deprecatedCount := opCount.DeprecatedCount
			noBwcOperationsCount := opCount.NoBwcOperationsCount
			internalAudienceOperationsCount := opCount.InternalAudienceOperationsCount
			unknownAudienceOperationsCount := opCount.UnknownAudienceOperationsCount
			if versionApiTypeSummary, exists := versionSummaryMap[opCount.ApiType]; exists {
				versionApiTypeSummary.OperationsCount = &operationCount
				versionApiTypeSummary.DeprecatedCount = &deprecatedCount
				versionApiTypeSummary.NoBwcOperationsCount = &noBwcOperationsCount
				versionApiTypeSummary.InternalAudienceOperationsCount = &internalAudienceOperationsCount
				versionApiTypeSummary.UnknownAudienceOperationsCount = &unknownAudienceOperationsCount

			} else {
				versionSummaryMap[opCount.ApiType] = &view.VersionOperationType{
					ApiType:                         opCount.ApiType,
					OperationsCount:                 &operationCount,
					DeprecatedCount:                 &deprecatedCount,
					NoBwcOperationsCount:            &noBwcOperationsCount,
					InternalAudienceOperationsCount: &internalAudienceOperationsCount,
					UnknownAudienceOperationsCount:  &unknownAudienceOperationsCount,
				}
			}
		}
		if versionEnt.PreviousVersion != "" {
			previousPackageId := versionEnt.PreviousVersionPackageId
			if previousPackageId == "" {
				previousPackageId = versionEnt.PackageId
			}
			previousVersionEnt, err := v.publishedRepo.GetVersion(previousPackageId, versionEnt.PreviousVersion)
			if err != nil {
				return nil, err
			}
			if previousVersionEnt != nil {
				comparisonId := view.MakeVersionComparisonId(
					versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
					previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision)
				versionComparison, err := v.publishedRepo.GetVersionComparison(comparisonId)
				if err != nil {
					return nil, err
				}
				if versionComparison != nil {
					for _, ot := range versionComparison.OperationTypes {
						apiType, _ := view.ParseApiType(ot.ApiType)
						if apiType == "" {
							continue
						}
						changeSummary := ot.ChangesSummary
						numberOfImpactedOperations := ot.NumberOfImpactedOperations
						if versionApiTypeSummary, exists := versionSummaryMap[ot.ApiType]; exists {
							versionApiTypeSummary.ChangesSummary = &changeSummary
							versionApiTypeSummary.NumberOfImpactedOperations = &numberOfImpactedOperations
							versionApiTypeSummary.ApiAudienceTransitions = ot.ApiAudienceTransitions

						} else {
							versionSummaryMap[ot.ApiType] = &view.VersionOperationType{
								ApiType:                    ot.ApiType,
								ChangesSummary:             &changeSummary,
								NumberOfImpactedOperations: &numberOfImpactedOperations,
								ApiAudienceTransitions:     ot.ApiAudienceTransitions,
								//in this case version doesn't have any operations of ot.ApiType type, but there are some changes
								//but we still need to fill count fields with zero value because its a pointer
								OperationsCount:                 &zeroInt,
								DeprecatedCount:                 &zeroInt,
								NoBwcOperationsCount:            &zeroInt,
								InternalAudienceOperationsCount: &zeroInt,
								UnknownAudienceOperationsCount:  &zeroInt,
							}
						}
					}
					if len(versionComparison.Refs) > 0 {
						refsComparisons, err := v.publishedRepo.GetVersionRefsComparisons(comparisonId)
						if err != nil {
							return nil, err
						}
						for _, comparison := range refsComparisons {
							for _, ot := range comparison.OperationTypes {
								apiType, _ := view.ParseApiType(ot.ApiType)
								if apiType == "" {
									continue
								}
								changeSummary := ot.ChangesSummary
								numberOfImpactedOperations := ot.NumberOfImpactedOperations
								if versionApiTypeSummary, exists := versionSummaryMap[ot.ApiType]; exists {
									if versionApiTypeSummary.ChangesSummary != nil {
										versionApiTypeSummary.ChangesSummary.Breaking += changeSummary.Breaking
										versionApiTypeSummary.ChangesSummary.SemiBreaking += changeSummary.SemiBreaking
										versionApiTypeSummary.ChangesSummary.Deprecated += changeSummary.Deprecated
										versionApiTypeSummary.ChangesSummary.NonBreaking += changeSummary.NonBreaking
										versionApiTypeSummary.ChangesSummary.Annotation += changeSummary.Annotation
										versionApiTypeSummary.ChangesSummary.Unclassified += changeSummary.Unclassified
									} else {
										versionApiTypeSummary.ChangesSummary = &changeSummary
									}
									if versionApiTypeSummary.NumberOfImpactedOperations != nil {
										versionApiTypeSummary.NumberOfImpactedOperations.Breaking += numberOfImpactedOperations.Breaking
										versionApiTypeSummary.NumberOfImpactedOperations.SemiBreaking += numberOfImpactedOperations.SemiBreaking
										versionApiTypeSummary.NumberOfImpactedOperations.Deprecated += numberOfImpactedOperations.Deprecated
										versionApiTypeSummary.NumberOfImpactedOperations.NonBreaking += numberOfImpactedOperations.NonBreaking
										versionApiTypeSummary.NumberOfImpactedOperations.Annotation += numberOfImpactedOperations.Annotation
										versionApiTypeSummary.NumberOfImpactedOperations.Unclassified += numberOfImpactedOperations.Unclassified
									} else {
										versionApiTypeSummary.NumberOfImpactedOperations = &numberOfImpactedOperations
									}
									if len(ot.ApiAudienceTransitions) > 0 {
										if len(versionApiTypeSummary.ApiAudienceTransitions) > 0 {
											//merge ApiAudienceTransitions for all referenced packages by unique Current and Previous audience fields
											transitions := make([]view.ApiAudienceTransition, 0)
											for _, audienceTransition := range versionApiTypeSummary.ApiAudienceTransitions {
												audienceTransition := audienceTransition
												for _, otAudienceTransition := range ot.ApiAudienceTransitions {
													if audienceTransition.CurrentAudience == otAudienceTransition.CurrentAudience &&
														audienceTransition.PreviousAudience == otAudienceTransition.PreviousAudience {
														audienceTransition.OperationsCount += otAudienceTransition.OperationsCount
														break
													}
												}
												transitions = append(transitions, audienceTransition)
											}
											for _, otAudienceTransition := range ot.ApiAudienceTransitions {
												otAudienceTransition := otAudienceTransition
												exists := false
												for _, audienceTransition := range transitions {
													if audienceTransition.CurrentAudience == otAudienceTransition.CurrentAudience &&
														audienceTransition.PreviousAudience == otAudienceTransition.PreviousAudience {
														exists = true
														break
													}
												}
												if !exists {
													transitions = append(transitions, otAudienceTransition)
												}
											}
											versionApiTypeSummary.ApiAudienceTransitions = transitions
										} else {
											versionApiTypeSummary.ApiAudienceTransitions = ot.ApiAudienceTransitions
										}

									}
								} else {
									versionSummaryMap[ot.ApiType] = &view.VersionOperationType{
										ApiType:                    ot.ApiType,
										ChangesSummary:             &changeSummary,
										NumberOfImpactedOperations: &numberOfImpactedOperations,
										ApiAudienceTransitions:     ot.ApiAudienceTransitions,
										//in this case version doesn't have any operations of ot.ApiType type, but there are some changes
										//but we still need to fill count fields with zero value because its a pointer
										OperationsCount:                 &zeroInt,
										DeprecatedCount:                 &zeroInt,
										NoBwcOperationsCount:            &zeroInt,
										InternalAudienceOperationsCount: &zeroInt,
										UnknownAudienceOperationsCount:  &zeroInt,
									}
								}
							}
						}
					}

				}
			}
		}
	}
	if includeOperations {
		operationTypeHashes, err := v.operationRepo.GetOperationsTypeDataHashes(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
		if err != nil {
			return nil, err
		}
		for _, ot := range operationTypeHashes {
			apiType, _ := view.ParseApiType(ot.ApiType)
			if apiType == "" {
				continue
			}
			if versionApiTypeSummary, exists := versionSummaryMap[ot.ApiType]; exists {
				versionApiTypeSummary.Operations = ot.OperationsHash
			} else {
				versionSummaryMap[ot.ApiType] = &view.VersionOperationType{
					ApiType:    ot.ApiType,
					Operations: ot.OperationsHash,
				}
			}
		}
	}
	versionOperationTypes := make([]view.VersionOperationType, 0)
	for _, v := range versionSummaryMap {
		versionOperationTypes = append(versionOperationTypes, *v)
	}
	return versionOperationTypes, nil
}

func (v versionServiceImpl) getVersionOperationGroups_deprecated(versionEnt *entity.ReadonlyPublishedVersionEntity_deprecated) ([]view.VersionOperationGroup, error) {
	operationGroupEntities, err := v.operationRepo.GetVersionOperationGroups(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}
	versionOperationGroups := make([]view.VersionOperationGroup, 0)
	for _, operationGroupEnt := range operationGroupEntities {
		versionOperationGroups = append(versionOperationGroups, entity.MakeVersionOperationGroupView(operationGroupEnt))
	}
	return versionOperationGroups, nil
}

func (v versionServiceImpl) getVersionOperationGroups(versionEnt *entity.PackageVersionRevisionEntity) ([]view.VersionOperationGroup, error) {
	operationGroupEntities, err := v.operationRepo.GetVersionOperationGroups(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}
	versionOperationGroups := make([]view.VersionOperationGroup, 0)
	for _, operationGroupEnt := range operationGroupEntities {
		versionOperationGroups = append(versionOperationGroups, entity.MakeVersionOperationGroupView(operationGroupEnt))
	}
	return versionOperationGroups, nil
}

func (v versionServiceImpl) getVersionChangeSummary(packageId string, versionName string, revision int) (*view.ChangeSummary, error) {
	versionEnt, err := v.publishedRepo.GetVersionByRevision(packageId, versionName, revision)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, nil
	}
	previousPackageId := versionEnt.PreviousVersionPackageId
	if previousPackageId == "" {
		previousPackageId = versionEnt.PackageId
	}
	if versionEnt.PreviousVersion == "" {
		return nil, nil
	}
	previousVersionEnt, err := v.publishedRepo.GetVersion(previousPackageId, versionEnt.PreviousVersion)
	if err != nil {
		return nil, err
	}
	if previousVersionEnt == nil {
		return nil, nil
	}
	comparisonId := view.MakeVersionComparisonId(
		versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
		previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision,
	)
	versionComparison, err := v.publishedRepo.GetVersionComparison(comparisonId)
	if err != nil {
		return nil, err
	}
	if versionComparison == nil {
		return nil, nil
	}
	changeSummary := &view.ChangeSummary{}
	versionOperationTypes := make([]view.OperationType, 0)

	if len(versionComparison.Refs) > 0 {
		versionComparisons, err := v.publishedRepo.GetVersionRefsComparisons(comparisonId)
		if err != nil {
			return nil, err
		}
		for _, comparison := range versionComparisons {
			versionOperationTypes = append(versionOperationTypes, comparison.OperationTypes...)
		}
	} else {
		versionOperationTypes = append(versionOperationTypes, versionComparison.OperationTypes...)
	}

	for _, opType := range versionOperationTypes {
		changeSummary.Breaking += opType.ChangesSummary.Breaking
		changeSummary.SemiBreaking += opType.ChangesSummary.SemiBreaking
		changeSummary.Deprecated += opType.ChangesSummary.Deprecated
		changeSummary.NonBreaking += opType.ChangesSummary.NonBreaking
		changeSummary.Annotation += opType.ChangesSummary.Annotation
		changeSummary.Unclassified += opType.ChangesSummary.Unclassified
	}
	return changeSummary, nil
}

func (p versionServiceImpl) GetVersionValidationChanges(packageId string, versionName string) (*view.VersionValidationChanges, error) {
	version, err := p.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return nil, err
	}
	if version == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName, "packageId": packageId},
		}
	}
	versionChanges, err := p.publishedRepo.GetVersionValidationChanges(packageId, version.Version, version.Revision)
	if err != nil {
		return nil, err
	}
	changelog := make([]view.VersionChangelogData, 0)
	bwc := make([]view.VersionBwcData, 0)
	if versionChanges != nil {
		if versionChanges.Changelog != nil && len(versionChanges.Changelog.Data) != 0 {
			changelog = versionChanges.Changelog.Data
		}
		if versionChanges.Bwc != nil && len(versionChanges.Bwc.Data) != 0 {
			bwc = versionChanges.Bwc.Data
		}
	}
	return &view.VersionValidationChanges{
		PreviousVersion:          version.PreviousVersion,
		PreviousVersionPackageId: version.PreviousVersionPackageId,
		Changes:                  changelog,
		Bwc:                      bwc,
	}, nil
}

func (p versionServiceImpl) GetVersionValidationProblems(packageId string, versionName string) (*view.VersionValidationProblems, error) {
	version, err := p.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return nil, err
	}
	if version == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName, "packageId": packageId},
		}
	}
	versionProblems, err := p.publishedRepo.GetVersionValidationProblems(packageId, version.Version, version.Revision)
	if err != nil {
		return nil, err
	}
	spectral := make([]view.VersionSpectralData, 0)
	if versionProblems != nil {
		if len(versionProblems.Spectral.Data) != 0 {
			spectral = versionProblems.Spectral.Data
		}
	}
	return &view.VersionValidationProblems{
		Spectral: spectral,
	}, nil
}

func (v versionServiceImpl) GetDefaultVersion(packageId string) (string, error) {
	defaultVersion, err := v.publishedRepo.GetDefaultVersion(packageId, string(view.Release))
	if err != nil {
		return "", err
	}
	if defaultVersion == nil {
		defaultVersion, err = v.publishedRepo.GetDefaultVersion(packageId, string(view.Draft))
		if err != nil {
			return "", err
		}
	}
	if defaultVersion == nil {
		return "", nil
	}
	return defaultVersion.Version, nil
}

func (v versionServiceImpl) GetLatestRevision(packageId string, versionName string) (int, error) {
	version, err := v.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return 0, err
	}
	if version == nil {
		return 0, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName, "packageId": packageId},
		}
	}
	return version.Revision, nil
}

func (v versionServiceImpl) GetVersionDetails(packageId string, versionName string) (*view.VersionDetails, error) {
	versionEnt, err := v.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}
	changeSummary, err := v.getVersionChangeSummary(packageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}

	latestRevision, err := v.GetLatestRevision(packageId, versionName)
	if err != nil {
		return nil, err
	}

	versionDetails := view.VersionDetails{
		Version: view.MakeVersionRefKey(versionEnt.Version, latestRevision),
		Summary: changeSummary,
	}
	return &versionDetails, nil
}

func ReleaseVersionMatchesPattern(versionName string, pattern string) error {
	versionNameRegexp := regexp.MustCompile(pattern)
	if !versionNameRegexp.MatchString(versionName) {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ReleaseVersionDoesntMatchPattern,
			Message: exception.ReleaseVersionDoesntMatchPatternMsg,
			Params:  map[string]interface{}{"version": versionName, "pattern": pattern},
		}
	}
	return nil
}

func (v versionServiceImpl) SearchForPackages(searchReq view.SearchQueryReq) (*view.SearchResult, error) {
	searchQuery, err := entity.MakePackageSearchQueryEntity(&searchReq)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidSearchParameters,
			Message: exception.InvalidSearchParametersMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		}
	}
	//todo maybe move to envs
	searchQuery.PackageSearchWeight = entity.PackageSearchWeight{
		PackageNameWeight:        5,
		PackageDescriptionWeight: 1,
		PackageIdWeight:          1,
		PackageServiceNameWeight: 3,
		VersionWeight:            5,
		VersionLabelWeight:       3,
		DefaultVersionWeight:     5,
		OpenCountWeight:          0.2,
	}
	searchQuery.VersionStatusSearchWeight = entity.VersionStatusSearchWeight{
		VersionReleaseStatus:        string(view.Release),
		VersionReleaseStatusWeight:  4,
		VersionDraftStatus:          string(view.Draft),
		VersionDraftStatusWeight:    0.6,
		VersionArchivedStatus:       string(view.Archived),
		VersionArchivedStatusWeight: 0.1,
	}
	versionEntities, err := v.publishedRepo.SearchForVersions(searchQuery)
	if err != nil {
		return nil, err
	}
	packages := make([]view.PackageSearchResult, 0)
	for _, ent := range versionEntities {
		packages = append(packages, *entity.MakePackageSearchResultView(ent))
	}

	return &view.SearchResult{Packages: &packages}, nil
}

func (v versionServiceImpl) SearchForDocuments(searchReq view.SearchQueryReq) (*view.SearchResult, error) {
	unknownTypes := make(map[string]bool, 0)
	unknownTypes[string(view.Unknown)] = true

	unknownTypesList := make([]string, 0)
	for unknownType := range unknownTypes {
		unknownTypesList = append(unknownTypesList, unknownType)
	}

	searchQuery, err := entity.MakeDocumentSearchQueryEntity(&searchReq, unknownTypesList)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidSearchParameters,
			Message: exception.InvalidSearchParametersMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		}
	}
	//todo maybe move to envs
	searchQuery.DocumentSearchWeight = entity.DocumentSearchWeight{
		TitleWeight:     5,
		LabelsWeight:    3,
		ContentWeight:   1,
		OpenCountWeight: 0.2,
	}
	searchQuery.VersionStatusSearchWeight = entity.VersionStatusSearchWeight{
		VersionReleaseStatus:        string(view.Release),
		VersionReleaseStatusWeight:  4,
		VersionDraftStatus:          string(view.Draft),
		VersionDraftStatusWeight:    0.6,
		VersionArchivedStatus:       string(view.Archived),
		VersionArchivedStatusWeight: 0.1,
	}
	documentEntities, err := v.publishedRepo.SearchForDocuments(searchQuery)
	if err != nil {
		return nil, err
	}
	documents := make([]view.DocumentSearchResult, 0)
	maxContentLength := 70 //maybe move to envs or input params?
	for _, ent := range documentEntities {
		var contentSlice string
		if unknownTypes[ent.Type] {
			contentSlice = "Unsupported content"
		} else {
			contentSlice = stripContentByFilter(searchReq.SearchString, ent.Metadata.GetDescription(), maxContentLength)
		}
		documents = append(documents, *entity.MakeDocumentSearchResultView(ent, contentSlice))
	}

	return &view.SearchResult{Documents: &documents}, nil
}

func stripContentByFilter(filter string, content string, maxLen int) string {
	contentLength := len(content)
	filterLength := len(filter)
	if maxLen < filterLength {
		maxLen = filterLength
	}
	if maxLen >= contentLength {
		return content
	}
	index := strings.Index(strings.ToLower(content), strings.ToLower(filter))
	if index == -1 {
		return content[:maxLen]
	}
	contentOffset := (maxLen - filterLength) / 2
	startPos := index - contentOffset
	endPos := index + filterLength + contentOffset
	if startPos > 0 &&
		endPos < contentLength {
		return content[startPos:endPos]
	}
	if startPos == 0 || endPos == contentLength {
		return content[startPos:endPos]
	}
	if startPos < 0 {
		endPos = endPos + (0 - startPos)
		startPos = 0
		return content[startPos:endPos]
	}
	if endPos > contentLength {
		startPos = startPos - (endPos - contentLength)
		endPos = contentLength
		return content[startPos:endPos]
	}
	return content[startPos:endPos]
}

func ValidateVersionName(versionName string) error {
	if strings.Contains(versionName, "@") {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.VersionNameNotAllowed,
			Message: exception.VersionNameNotAllowedMsg,
			Params:  map[string]interface{}{"version": versionName, "character": "@"},
		}
	}
	return nil
}

func (v versionServiceImpl) GetVersionStatus(packageId string, version string) (string, error) {
	versionEnt, err := v.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return "", err
	}
	if versionEnt == nil {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}

	return versionEnt.Status, nil
}

func (v versionServiceImpl) GetVersionChanges(packageId, version, apiType string, severities []string, versionChangesReq view.VersionChangesReq) (*view.VersionChangesView, error) {
	versionEnt, err := v.publishedRepo.GetVersion(packageId, version)
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

	if versionChangesReq.PreviousVersion == "" || versionChangesReq.PreviousVersionPackageId == "" {
		if versionEnt.PreviousVersion == "" {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.NoPreviousVersion,
				Message: exception.NoPreviousVersionMsg,
				Params:  map[string]interface{}{"version": version},
			}
		}
		versionChangesReq.PreviousVersion = versionEnt.PreviousVersion
		if versionEnt.PreviousVersionPackageId != "" {
			versionChangesReq.PreviousVersionPackageId = versionEnt.PreviousVersionPackageId
		} else {
			versionChangesReq.PreviousVersionPackageId = packageId
		}
	}
	previousVersionEnt, err := v.publishedRepo.GetVersion(versionChangesReq.PreviousVersionPackageId, versionChangesReq.PreviousVersion)
	if err != nil {
		return nil, err
	}
	if previousVersionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionChangesReq.PreviousVersion, "packageId": versionChangesReq.PreviousVersionPackageId},
		}
	}

	comparisonId := view.MakeVersionComparisonId(
		versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
		previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision,
	)

	versionComparison, err := v.publishedRepo.GetVersionComparison(comparisonId)
	if err != nil {
		return nil, err
	}
	if versionComparison == nil || versionComparison.NoContent {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ComparisonNotFound,
			Message: exception.ComparisonNotFoundMsg,
			Params: map[string]interface{}{
				"comparisonId":      comparisonId,
				"packageId":         versionEnt.PackageId,
				"version":           versionEnt.Version,
				"revision":          versionEnt.Revision,
				"previousPackageId": previousVersionEnt.PackageId,
				"previousVersion":   previousVersionEnt.Version,
				"previousRevision":  previousVersionEnt.Revision,
			},
		}
	}
	searchQuery := entity.ChangelogSearchQueryEntity{
		ComparisonId:   comparisonId,
		ApiType:        apiType,
		ApiKind:        versionChangesReq.ApiKind,
		ApiAudience:    versionChangesReq.ApiAudience,
		TextFilter:     versionChangesReq.TextFilter,
		Tags:           versionChangesReq.Tags,
		EmptyTag:       versionChangesReq.EmptyTag,
		RefPackageId:   versionChangesReq.RefPackageId,
		EmptyGroup:     versionChangesReq.EmptyGroup,
		Group:          versionChangesReq.Group,
		GroupPackageId: versionEnt.PackageId,
		GroupVersion:   versionEnt.Version,
		GroupRevision:  versionEnt.Revision,
		Severities:     severities,
	}
	operationComparisons := make([]interface{}, 0)
	changelogOperationEnts, err := v.operationRepo.GetChangelog_deprecated(searchQuery)
	if err != nil {
		return nil, err
	}

	packageVersions := make(map[string][]string)
	for _, changelogOperationEnt := range changelogOperationEnts {
		operationComparisons = append(operationComparisons, entity.MakeOperationComparisonChangesView(changelogOperationEnt))
		if packageRefKey := view.MakePackageRefKey(changelogOperationEnt.PackageId, changelogOperationEnt.Version, changelogOperationEnt.Revision); packageRefKey != "" {
			packageVersions[changelogOperationEnt.PackageId] = append(packageVersions[changelogOperationEnt.PackageId], view.MakeVersionRefKey(changelogOperationEnt.Version, changelogOperationEnt.Revision))
		}
		if previousPackageRefKey := view.MakePackageRefKey(changelogOperationEnt.PreviousPackageId, changelogOperationEnt.PreviousVersion, changelogOperationEnt.PreviousRevision); previousPackageRefKey != "" {
			packageVersions[changelogOperationEnt.PreviousPackageId] = append(packageVersions[changelogOperationEnt.PreviousPackageId], view.MakeVersionRefKey(changelogOperationEnt.PreviousVersion, changelogOperationEnt.PreviousRevision))
		}
	}
	packagesRefs, err := v.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
	if err != nil {
		return nil, err
	}
	versionChanges := &view.VersionChangesView{
		PreviousVersion:          previousVersionEnt.Version,
		PreviousVersionPackageId: previousVersionEnt.PackageId,
		Operations:               operationComparisons,
		Packages:                 packagesRefs,
	}
	return versionChanges, nil
}

func (v versionServiceImpl) GetVersionRevisionsList_deprecated(packageId, versionName string, filterReq view.PagingFilterReq) (*view.PackageVersionRevisions_deprecated, error) {
	ent, err := v.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}
	searchQueryReq := entity.PackageVersionSearchQueryEntity{
		PackageId:  packageId,
		Version:    ent.Version,
		TextFilter: filterReq.TextFilter,
		Limit:      filterReq.Limit,
		Offset:     filterReq.Offset,
	}
	versionRevisionsEnts, err := v.publishedRepo.GetVersionRevisionsList_deprecated(searchQueryReq)
	if err != nil {
		return nil, err
	}
	revisions := make([]view.PackageVersionRevision_deprecated, 0)

	for _, ent := range versionRevisionsEnts {
		revisions = append(revisions, *entity.MakePackageVersionRevisionView_deprecated(&ent))
	}
	return &view.PackageVersionRevisions_deprecated{Revisions: revisions}, nil
}
func (v versionServiceImpl) GetVersionRevisionsList(packageId, versionName string, filterReq view.PagingFilterReq) (*view.PackageVersionRevisions, error) {
	ent, err := v.publishedRepo.GetVersion(packageId, versionName)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}
	searchQueryReq := entity.PackageVersionSearchQueryEntity{
		PackageId:  packageId,
		Version:    ent.Version,
		TextFilter: filterReq.TextFilter,
		Limit:      filterReq.Limit,
		Offset:     filterReq.Offset,
	}
	versionRevisionsEnts, err := v.publishedRepo.GetVersionRevisionsList(searchQueryReq)
	if err != nil {
		return nil, err
	}
	revisions := make([]view.PackageVersionRevision, 0)

	for _, ent := range versionRevisionsEnts {
		revisions = append(revisions, *entity.MakePackageVersionRevisionView(&ent))
	}
	return &view.PackageVersionRevisions{Revisions: revisions}, nil
}

func (v versionServiceImpl) GetTransformedDocuments_deprecated(packageId, version, apiType, groupName, format string) ([]byte, error) {
	if format == "" {
		format = string(view.HtmlDocumentFormat)
	}
	if !view.ValidTransformedDocumentsFormat_deprecated(format) {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UnknownResponseFormat,
			Message: exception.UnknownResponseFormatMsg,
			Params:  map[string]interface{}{"format": format},
		}
	}
	versionEnt, err := v.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version},
		}
	}
	groupId := view.MakeOperationGroupId(packageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
	ent, err := v.exportRepository.GetTransformedDocuments(packageId, version, apiType, groupId, view.DocumentGroupType_deprecated, string(view.JsonDocumentFormat))
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, nil
	}
	if format == string(view.JsonDocumentFormat) {
		return ent.Data, nil
	} else {
		return v.portalService.GenerateInteractivePageForTransformedDocuments(packageId, versionEnt.Version, *ent)
	}
}

func (v versionServiceImpl) GetTransformedDocuments(packageId string, version string, apiType string, groupName string, buildType string, format string) ([]byte, error) {
	err := view.ValidateFormatForBuildType(buildType, format)
	if err != nil {
		return nil, err
	}
	versionEnt, err := v.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version},
		}
	}
	groupId := view.MakeOperationGroupId(packageId, versionEnt.Version, versionEnt.Revision, apiType, groupName)
	ent, err := v.exportRepository.GetTransformedDocuments(packageId, version, apiType, groupId, view.BuildType(buildType), format)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, nil
	}
	if format == string(view.HtmlDocumentFormat) {
		return v.portalService.GenerateInteractivePageForTransformedDocuments(packageId, versionEnt.Version, *ent)
	}
	return ent.Data, nil
}

func (v versionServiceImpl) DeleteVersionsRecursively(ctx context.SecurityContext, packageId string, deleteBefore time.Time) (string, error) {
	rootPackage, err := v.publishedRepo.GetPackage(packageId)
	if err != nil {
		return "", err
	}
	if rootPackage == nil {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}

	jobId := uuid.New().String()
	ent := entity.VersionCleanupEntity{
		RunId:        jobId,
		PackageId:    packageId,
		DeleteBefore: deleteBefore,
		Status:       string(view.StatusRunning),
	}
	err = v.versionCleanupRepository.StoreVersionCleanupRun(ent)
	if err != nil {
		return jobId, err
	}

	utils.SafeAsync(func() {
		log.Infof("Starting old draft versions cleanup process %s for package %s", jobId, packageId)
		page, limit, deletedItems := 0, 100, 0
		for {
			getPackageListReq := view.PackageListReq{
				Kind:               []string{entity.KIND_PACKAGE, entity.KIND_DASHBOARD},
				Limit:              limit,
				OnlyFavorite:       false,
				OnlyShared:         false,
				Offset:             page * limit,
				ParentId:           packageId,
				ShowAllDescendants: true,
			}
			packages, err := v.publishedRepo.GetFilteredPackagesWithOffset(getPackageListReq, ctx.GetUserId())
			if err != nil {
				log.Errorf("failed to get child packages for versions cleanup %s: %s", jobId, err.Error())
				err = v.versionCleanupRepository.UpdateVersionCleanupRun(jobId, string(view.StatusError), err.Error(), deletedItems)
				if err != nil {
					log.Errorf("failed to set '%s' status for cleanup job id %s: %s", "error", jobId, err.Error())
					return
				}
				return
			}
			if len(packages) == 0 {
				if rootPackage.Kind == entity.KIND_PACKAGE || rootPackage.Kind == entity.KIND_DASHBOARD {
					deleted, err := v.publishedRepo.DeleteDraftVersionsBeforeDate(rootPackage.Id, deleteBefore, "cleanup_job_"+jobId)
					if err != nil {
						log.Errorf("failed to delete versions of package %s during versions cleanup %s: %s", rootPackage.Id, jobId, err.Error())
						err = v.versionCleanupRepository.UpdateVersionCleanupRun(jobId, string(view.StatusError), err.Error(), deletedItems)
						if err != nil {
							log.Errorf("failed to set '%s' status for cleanup job id %s: %s", "error", jobId, err.Error())
							return
						}
						return
					}
					deletedItems += deleted
				}
				err = v.versionCleanupRepository.UpdateVersionCleanupRun(jobId, string(view.StatusComplete), "", deletedItems)
				if err != nil {
					log.Errorf("failed to set '%s' status for cleanup job id %s: %s", "complete", jobId, err.Error())
					return
				}
				log.Infof("version cleanup job %s has deleted %d versions", jobId, deletedItems)
				return
			}
			for _, pkg := range packages {
				deleted, err := v.publishedRepo.DeleteDraftVersionsBeforeDate(pkg.Id, deleteBefore, "cleanup_job_"+jobId)
				if err != nil {
					log.Errorf("failed to delete versions of package %s during versions cleanup %s: %s", pkg.Id, jobId, err.Error())
					err = v.versionCleanupRepository.UpdateVersionCleanupRun(jobId, string(view.StatusError), err.Error(), deletedItems)
					if err != nil {
						log.Errorf("failed to set '%s' status for cleanup job id %s: %s", "error", jobId, err.Error())
						return
					}
					return
				}
				deletedItems += deleted
			}
			page++
		}
	})
	return jobId, nil
}

func (v versionServiceImpl) CopyVersion(ctx context.SecurityContext, packageId string, version string, req view.CopyVersionReq) (string, error) {
	versionEnt, err := v.publishedRepo.GetVersion(packageId, version)
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
	targetPackage, err := v.publishedRepo.GetPackage(req.TargetPackageId)
	if err != nil {
		return "", err
	}
	if targetPackage == nil {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": req.TargetPackageId},
		}
	}
	currentPackage, err := v.publishedRepo.GetPackage(packageId)
	if err != nil {
		return "", err
	}
	if currentPackage == nil {
		return "", &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	if targetPackage.Kind != currentPackage.Kind {
		return "", &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PackageVersionCannotBeCopied,
			Message: exception.PackageVersionCannotBeCopiedMsg,
			Params: map[string]interface{}{
				"packageId":       packageId,
				"targetPackageId": req.TargetPackageId,
				"version":         version,
				"error":           fmt.Sprintf("target package kind doesn't match current package kind (target='%v', current='%v')", targetPackage.Kind, currentPackage.Kind),
			},
		}
	}
	buildConfig, err := v.publishedService.GetPublishedVersionBuildConfig(packageId, version)
	if err != nil {
		return "", err
	}
	var versionSources []byte
	if currentPackage.Kind == entity.KIND_PACKAGE {
		versionSources, err = v.publishedService.GetVersionSources(packageId, version)
		if err != nil {
			return "", err
		}
	}
	targetBuildConfig := view.BuildConfig{
		PackageId:                req.TargetPackageId,
		Version:                  req.TargetVersion,
		PreviousVersion:          req.TargetPreviousVersion,
		PreviousVersionPackageId: req.TargetPreviousVersionPackageId,
		Status:                   req.TargetStatus,
		Refs:                     buildConfig.Refs,
		Files:                    buildConfig.Files,
		Metadata:                 buildConfig.Metadata,
		BuildType:                view.PublishType,
		CreatedBy:                ctx.GetUserId(),
		ComparisonRevision:       buildConfig.ComparisonRevision,
		ComparisonPrevRevision:   buildConfig.ComparisonPrevRevision,
		UnresolvedRefs:           buildConfig.UnresolvedRefs,
		ResolveRefs:              buildConfig.ResolveRefs,
		ResolveConflicts:         buildConfig.ResolveConflicts,
		ServiceName:              buildConfig.ServiceName,
		ApiType:                  buildConfig.ApiType,
		GroupName:                buildConfig.GroupName,
	}
	if targetBuildConfig.PreviousVersionPackageId == targetBuildConfig.PackageId {
		targetBuildConfig.PreviousVersionPackageId = ""
	}
	targetBuildConfig.Metadata.VersionLabels = req.TargetVersionLabels

	buildTask, err := v.buildService.PublishVersion(ctx, targetBuildConfig, versionSources, false, "", nil, false, false)
	if err != nil {
		return "", err
	}
	return buildTask.PublishId, nil
}

func (v versionServiceImpl) GetPublishedVersionsHistory(filter view.PublishedVersionHistoryFilter) ([]view.PublishedVersionHistoryView, error) {
	result := make([]view.PublishedVersionHistoryView, 0)
	historyEnts, err := v.publishedRepo.GetPublishedVersionsHistory(filter)
	if err != nil {
		return nil, err
	}
	for _, ent := range historyEnts {
		result = append(result, entity.MakePublishedVersionHistoryView(ent))
	}

	return result, nil
}

func (v versionServiceImpl) StartPublishFromCSV(ctx context.SecurityContext, req view.PublishFromCSVReq) (string, error) {
	if len(req.CSVData) == 0 {
		return "", &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.EmptyCSVFile,
			Message: exception.EmptyCSVFileMsg,
		}
	}
	csvOriginal, err := parseCSV(req.CSVData)
	if err != nil {
		return "", &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.InvalidCSVFile,
			Message: exception.InvalidCSVFileMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		}
	}
	if len(csvOriginal) == 0 || len(csvOriginal[0]) == 0 {
		return "", &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.EmptyCSVFile,
			Message: exception.EmptyCSVFileMsg,
		}
	}
	pkg, err := v.publishedRepo.GetPackage(req.PackageId)
	if err != nil {
		return "", err
	}
	if pkg == nil {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": req.PackageId},
		}
	}
	if pkg.Kind != entity.KIND_DASHBOARD {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.InvalidPackageKind,
			Message: exception.InvalidPackageKindMsg,
			Params:  map[string]interface{}{"kind": pkg.Kind, "allowedKind": entity.KIND_DASHBOARD},
		}
	}
	workspace, err := v.publishedRepo.GetPackage(req.ServicesWorkspaceId)
	if err != nil {
		return "", err
	}
	if workspace == nil {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": req.ServicesWorkspaceId},
		}
	}
	if workspace.Kind != entity.KIND_WORKSPACE {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.InvalidPackageKind,
			Message: exception.InvalidPackageKindMsg,
			Params:  map[string]interface{}{"kind": workspace.Kind, "allowedKind": entity.KIND_WORKSPACE},
		}
	}
	if req.PreviousVersion != "" {
		previousVersionPackageId := req.PreviousVersionPackageId
		if req.PreviousVersionPackageId == "" {
			previousVersionPackageId = req.PackageId
		}
		prevVersion, err := v.publishedRepo.GetVersion(previousVersionPackageId, req.PreviousVersion)
		if err != nil {
			return "", err
		}
		if prevVersion == nil {
			return "", &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PublishedPackageVersionNotFound,
				Message: exception.PublishedPackageVersionNotFoundMsg,
				Params:  map[string]interface{}{"packageId": previousVersionPackageId, "version": req.PreviousVersion},
			}
		}
		if prevVersion.Status != string(view.Release) {
			return "", &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PreviousPackageVersionNotRelease,
				Message: exception.PreviousPackageVersionNotReleaseMsg,
				Params:  map[string]interface{}{"packageId": previousVersionPackageId, "version": req.PreviousVersion},
			}
		}
	}

	publishEntity := &entity.CSVDashboardPublishEntity{
		PublishId: uuid.NewString(),
		Status:    string(view.StatusRunning),
		Message:   "",
		Report:    []byte{},
	}

	err = v.publishedRepo.StoreCSVDashboardPublishProcess(publishEntity)
	if err != nil {
		return "", err
	}

	utils.SafeAsync(func() {
		v.publishFromCSV(ctx, pkg.Name, req, csvOriginal, publishEntity)
	})
	return publishEntity.PublishId, nil
}

func (v versionServiceImpl) publishFromCSV(ctx context.SecurityContext, dashboardName string, req view.PublishFromCSVReq, csvOriginal [][]string, publishEntity *entity.CSVDashboardPublishEntity) {
	type ServiceInfo struct {
		PackageId    string
		Version      string
		Revision     int
		OperationIds []string
	}
	columns := 4
	serviceNameCol := 0
	serviceVersionCol := 1
	methodCol := 2
	pathCol := 3

	separator := ','
	customSeparator := getCSVSeparator(csvOriginal[0][0])
	if customSeparator != nil {
		separator = *customSeparator
	}

	servicesMap := make(map[string]*ServiceInfo)
	allServices := make(map[string]struct{})
	includedServices := make(map[string]struct{})
	notIncludedServices := make(map[string]struct{})
	notIncludedVersions := make(map[string]struct{})
	notIncludedOperationsCount := 0

	report := make([][]string, len(csvOriginal))
	for i := range csvOriginal {
		report[i] = make([]string, len(csvOriginal[i]))
		copy(report[i], csvOriginal[i])
	}

	firstRow := 0
	//skip first row if its just a separator
	if customSeparator != nil {
		firstRow = 1
	}
	pathParamsRegex := regexp.MustCompile(`\{.+?\}`)
	for i := firstRow; i < len(csvOriginal); i++ {
		row := csvOriginal[i]
		if len(row) != columns {
			report[i] = append(report[i], "incorrect number of columns")
			continue
		}
		serviceName := row[serviceNameCol]
		if serviceName == "" {
			report[i] = append(report[i], "empty service name")
			continue
		}
		allServices[serviceName] = struct{}{}
		serviceVersion := row[serviceVersionCol]
		if serviceVersion == "" {
			report[i] = append(report[i], "empty service version")
			continue
		}
		method := row[methodCol]
		if method == "" {
			report[i] = append(report[i], "empty method")
			continue
		}
		path := row[pathCol]
		if path == "" {
			report[i] = append(report[i], "empty path")
			continue
		}
		path = pathParamsRegex.ReplaceAllString(path, "*") //replace all path parameters with '*'
		serviceInfo := servicesMap[serviceName]
		if serviceInfo == nil {
			if _, exists := notIncludedServices[serviceName]; exists {
				report[i] = append(report[i], "service package doesn't exist")
				continue
			}
			servicePackageId, err := v.publishedRepo.GetServiceOwner(req.ServicesWorkspaceId, serviceName)
			if err != nil {
				report[i] = append(report[i], fmt.Sprintf("failed to look up service package: %v", err.Error()))
				continue
			}
			if servicePackageId == "" {
				report[i] = append(report[i], "service package doesn't exist")
				notIncludedServices[serviceName] = struct{}{}
				continue
			}
			svcInfo := ServiceInfo{
				PackageId: servicePackageId,
			}
			serviceInfo = &svcInfo
			servicesMap[serviceName] = serviceInfo
		}
		if serviceInfo.Version == "" {
			if _, exists := notIncludedVersions[fmt.Sprintf("%v%v%v", serviceInfo.PackageId, keySeparator, serviceVersion)]; exists {
				report[i] = append(report[i], "service version doesn't exist")
				continue
			}
			versionEnt, err := v.publishedRepo.GetVersion(serviceInfo.PackageId, serviceVersion)
			if err != nil {
				report[i] = append(report[i], fmt.Sprintf("failed to look up service version: %v", err.Error()))
				continue
			}
			if versionEnt == nil {
				report[i] = append(report[i], "service version doesn't exist")
				continue
			}
			if versionEnt.Status != string(view.Release) {
				report[i] = append(report[i], fmt.Sprintf("service version not in '%v' status", view.Release))
				continue
			}
			serviceInfo.Version = versionEnt.Version
			serviceInfo.Revision = versionEnt.Revision
		} else {
			if serviceInfo.Version != serviceVersion {
				report[i] = append(report[i], fmt.Sprintf("service already matched with '%v' version", serviceInfo.Version))
				continue
			}
		}
		serviceOperationIds, err := v.operationRepo.GetOperationsByPathAndMethod(serviceInfo.PackageId, serviceInfo.Version, serviceInfo.Revision, string(view.RestApiType), path, method)
		if err != nil {
			report[i] = append(report[i], fmt.Sprintf("failed to look up operation by path and method: %v", err.Error()))
			notIncludedOperationsCount++
			continue
		}
		if len(serviceOperationIds) == 0 {
			report[i] = append(report[i], "endpoint not found")
			notIncludedOperationsCount++
			continue
		}
		if len(serviceOperationIds) > 1 {
			report[i] = append(report[i], "more than 1 endpoint matched")
			notIncludedOperationsCount++
			continue
		}
		serviceInfo.OperationIds = append(serviceInfo.OperationIds, serviceOperationIds[0])
		report[i] = append(report[i], "ok")
		includedServices[serviceName] = struct{}{}
	}
	dashboardRefs := make([]view.BCRef, 0)
	for _, info := range servicesMap {
		if info.Version != "" {
			dashboardRefs = append(dashboardRefs, view.BCRef{
				RefId:   info.PackageId,
				Version: view.MakeVersionRefKey(info.Version, info.Revision),
			})
		}
	}

	var err error
	publishEntity.Report, err = csvToBytes(report, separator)
	if err != nil {
		v.updateDashboardPublishProcess(publishEntity, string(view.StatusError), fmt.Sprintf("internal server error: failed to generate csv report: %v", err.Error()))
		return
	}
	if len(dashboardRefs) == 0 {
		v.updateDashboardPublishProcess(publishEntity, string(view.StatusError), "no versions matched")
		return
	}

	dashboardPublishBuildConfig := view.BuildConfig{
		PackageId:                req.PackageId,
		Version:                  req.Version,
		BuildType:                view.PublishType,
		PreviousVersion:          req.PreviousVersion,
		PreviousVersionPackageId: req.PreviousVersionPackageId,
		Status:                   req.Status,
		Refs:                     dashboardRefs,
		CreatedBy:                ctx.GetUserId(),
		Metadata: view.BuildConfigMetadata{
			VersionLabels: req.VersionLabels,
		},
	}
	build, err := v.buildService.PublishVersion(ctx, dashboardPublishBuildConfig, nil, false, "", nil, false, false)
	if err != nil {
		v.updateDashboardPublishProcess(publishEntity, string(view.StatusError), fmt.Sprintf("failed to start csv dashboard publish: %v", err.Error()))
		return
	}
	err = v.buildService.AwaitBuildCompletion(build.PublishId)
	if err != nil {
		v.updateDashboardPublishProcess(publishEntity, string(view.StatusError), fmt.Sprintf("failed to publish dashboard from csv: %v", err.Error()))
		return
	}
	err = v.operationGroupService.CreateOperationGroup(ctx, req.PackageId, req.Version, string(view.RestApiType), view.CreateOperationGroupReq{
		GroupName: dashboardName,
	})
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			if customError.Code != exception.OperationGroupAlreadyExists {
				v.updateDashboardPublishProcess(publishEntity, string(view.StatusError), fmt.Sprintf("failed to create operation group: %v", err.Error()))
				return
			}
		} else {
			v.updateDashboardPublishProcess(publishEntity, string(view.StatusError), fmt.Sprintf("failed to create operation group: %v", err.Error()))
			return
		}
	}
	groupOperations := make([]view.GroupOperations, 0)
	uniqueOperations := make(map[view.GroupOperations]struct{})
	for _, info := range servicesMap {
		if info.Version != "" && len(info.OperationIds) > 0 {
			for _, operationId := range info.OperationIds {
				op := view.GroupOperations{
					PackageId:   info.PackageId,
					Version:     view.MakeVersionRefKey(info.Version, info.Revision),
					OperationId: operationId,
				}
				if _, exists := uniqueOperations[op]; exists {
					continue
				}
				groupOperations = append(groupOperations, op)
				uniqueOperations[op] = struct{}{}
			}
		}
	}
	err = v.operationGroupService.UpdateOperationGroup(ctx, req.PackageId, req.Version, string(view.RestApiType), dashboardName, view.UpdateOperationGroupReq{
		Operations: &groupOperations,
	})
	if err != nil {
		v.updateDashboardPublishProcess(publishEntity, string(view.StatusError), fmt.Sprintf("failed to add operations to operation group: %v", err.Error()))
		return
	}

	notIncludedServicesCount := 0
	for service := range allServices {
		if svc, exists := servicesMap[service]; exists {
			if svc.Version == "" {
				notIncludedServicesCount++
			}
		} else {
			notIncludedServicesCount++
		}
	}
	summary := ""
	if notIncludedServicesCount > 0 {
		summary = fmt.Sprintf(`%v services were not included into dashboard version`, notIncludedServicesCount)
	}
	if notIncludedOperationsCount > 0 {
		if summary != "" {
			summary = fmt.Sprintf(`%v; %v operations were not included into %v operation group`, summary, notIncludedOperationsCount, dashboardName)
		} else {
			summary = fmt.Sprintf(`%v operations were not included into %v operation group`, notIncludedOperationsCount, dashboardName)
		}
	}

	v.updateDashboardPublishProcess(publishEntity, string(view.StatusComplete), summary)
}

func (v versionServiceImpl) updateDashboardPublishProcess(publishEntity *entity.CSVDashboardPublishEntity, status string, message string) {
	publishEntity.Status = status
	publishEntity.Message = message
	err := v.publishedRepo.UpdateCSVDashboardPublishProcess(publishEntity)
	if err != nil {
		log.Errorf("failed to update dashboard publish process: %v", err.Error())
	}
}

func (v versionServiceImpl) GetCSVDashboardPublishStatus(publishId string) (*view.CSVDashboardPublishStatusResponse, error) {
	publishEnt, err := v.publishedRepo.GetCSVDashboardPublishProcess(publishId)
	if err != nil {
		return nil, err
	}
	if publishEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishProcessNotFound,
			Message: exception.PublishProcessNotFoundMsg,
			Params:  map[string]interface{}{"publishId": publishId},
		}
	}
	return &view.CSVDashboardPublishStatusResponse{
		Status:  publishEnt.Status,
		Message: publishEnt.Message,
	}, nil
}

func (v versionServiceImpl) GetCSVDashboardPublishReport(publishId string) ([]byte, error) {
	publishEnt, err := v.publishedRepo.GetCSVDashboardPublishReport(publishId)
	if err != nil {
		return nil, err
	}
	if publishEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishProcessNotFound,
			Message: exception.PublishProcessNotFoundMsg,
			Params:  map[string]interface{}{"publishId": publishId},
		}
	}
	return publishEnt.Report, nil
}

func parseCSV(csvData []byte) ([][]string, error) {
	csvReader := csv.NewReader(bytes.NewReader(csvData))
	csvReader.FieldsPerRecord = -1
	firstRow, err := csvReader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read first csv record: %w", err)
	}
	//check first row for custom separator
	if len(firstRow) == 1 {
		sep := getCSVSeparator(firstRow[0])
		if sep != nil {
			csvReader.Comma = *sep
		}
	}
	records, err := csvReader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("failed to parse csv records: %w", err)
	}

	return append([][]string{firstRow}, records...), nil
}

func csvToBytes(csvReport [][]string, separator rune) ([]byte, error) {
	var b bytes.Buffer
	writer := bufio.NewWriter(&b)
	csvWriter := csv.NewWriter(writer)
	csvWriter.Comma = separator
	if err := csvWriter.WriteAll(csvReport); err != nil {
		return nil, err
	}
	csvWriter.Flush()
	return b.Bytes(), nil
}

func getCSVSeparator(record string) *rune {
	if len(strings.Split(strings.ToLower(record), "sep=")) == 2 {
		sep := []rune(strings.Split(strings.ToLower(record), "sep=")[1])
		if len(sep) == 1 {
			return &sep[0]
		}
	}
	return nil
}
