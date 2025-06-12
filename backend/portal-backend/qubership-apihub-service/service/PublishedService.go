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
	"archive/zip"
	"bytes"
	ctx "context"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/archive"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/validation"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type PublishedService interface {
	GetPackageVersions(packageId string) (*view.PublishedVersions, error)
	GetVersion(packageId string, versionName string, importFiles bool, dependFiles bool) (*view.PublishedVersion, error)
	GetVersionSources(packageId string, versionName string) ([]byte, error)
	GetPublishedVersionSourceDataConfig(packageId string, versionName string) (*view.PublishedVersionSourceDataConfig, error)
	GetPublishedVersionBuildConfig(packageId string, versionName string) (*view.BuildConfig, error)
	GetLatestContentData_to_delete(packageId string, versionName string, contentId string) (*view.PublishedContent, *view.ContentData, error)
	GetLatestContentBySlug(packageId string, versionName string, slug string) (*view.PublishedContent, error)
	GetLatestContentDataBySlug(packageId string, versionName string, slug string) (*view.PublishedContent, *view.ContentData, error)
	PackagePublished(packageId string) (bool, error)
	VersionPublished(packageId string, versionName string) (bool, error)
	DeleteVersion(ctx context.SecurityContext, packageId string, versionName string) error

	GetSharedFile(shareId string) ([]byte, error)
	SharePublishedFile(packageId string, versionName string, slug string) (*view.SharedUrlResult_deprecated, error)
	GetFilteredPackages(ctx context.SecurityContext, filter string, groupId string, onlyFavorite bool) ([]view.Package, error)
	GetPackagesByServiceName(ctx context.SecurityContext, serviceName string) ([]view.Package, error)
	GetPackageById(ctx context.SecurityContext, id string) (*view.Package, error)

	PublishPackage(buildArc *archive.BuildResultArchive, buildSrcEnt *entity.BuildSourceEntity,
		buildConfig *view.BuildConfig, existingPackage *entity.PackageEntity) error
	PublishChanges(buildArc *archive.BuildResultArchive, publishId string) error
}

func NewPublishedService(branchService BranchService,
	versionRepo repository.PublishedRepository,
	projectsRepo repository.PrjGrpIntRepository,
	buildRepository repository.BuildRepository,
	gitClientProvider GitClientProvider,
	websocketService WsBranchService,
	favoritesRepo repository.FavoritesRepository,
	operationRepo repository.OperationRepository,
	atService ActivityTrackingService,
	monitoringService MonitoringService,
	minioStorageService MinioStorageService,
	systemInfoService SystemInfoService) PublishedService {
	return &publishedServiceImpl{
		branchService:       branchService,
		publishedRepo:       versionRepo,
		projectsRepo:        projectsRepo,
		buildRepository:     buildRepository,
		gitClientProvider:   gitClientProvider,
		websocketService:    websocketService,
		favoritesRepo:       favoritesRepo,
		operationRepo:       operationRepo,
		atService:           atService,
		monitoringService:   monitoringService,
		minioStorageService: minioStorageService,
		systemInfoService:   systemInfoService,
		publishedValidator:  validation.NewPublishedValidator(versionRepo),
	}
}

type publishedServiceImpl struct {
	branchService       BranchService
	publishedRepo       repository.PublishedRepository
	projectsRepo        repository.PrjGrpIntRepository
	buildRepository     repository.BuildRepository
	gitClientProvider   GitClientProvider
	websocketService    WsBranchService
	favoritesRepo       repository.FavoritesRepository
	operationRepo       repository.OperationRepository
	atService           ActivityTrackingService
	monitoringService   MonitoringService
	minioStorageService MinioStorageService
	systemInfoService   SystemInfoService
	publishedValidator  validation.PublishedValidator
}

func (p publishedServiceImpl) GetPackageVersions(packageId string) (*view.PublishedVersions, error) {
	versions := make([]view.PublishedVersion, 0)
	ents, err := p.publishedRepo.GetPackageVersions(packageId, "")
	if err != nil {
		return nil, err
	}
	for _, ent := range ents {
		contentEnts, err := p.publishedRepo.GetRevisionContent(packageId, ent.Version, ent.Revision)
		if err != nil {
			return nil, err
		}
		refEnts, err := p.publishedRepo.GetRevisionRefs(packageId, ent.Version, ent.Revision)
		if err != nil {
			return nil, err
		}
		refViews, err := p.makeRefsView(refEnts)
		if err != nil {
			return nil, err
		}
		version := entity.MakePublishedVersionView(&ent, contentEnts, refViews)
		versions = append(versions, *version)
	}
	return &view.PublishedVersions{Versions: versions}, nil
}

func (p publishedServiceImpl) GetVersion(packageId string, versionName string, importFiles bool, dependFiles bool) (*view.PublishedVersion, error) {
	ent, err := p.getLatestRevision(packageId, versionName)
	if err != nil {
		return nil, err
	}

	filesEntsMap := make(map[string]entity.PublishedContentEntity)
	packageFiles, err := p.publishedRepo.GetRevisionContent(packageId, versionName, ent.Revision)
	if err != nil {
		return nil, err
	}

	for _, file := range packageFiles {
		tmp := file
		filesEntsMap[p.createRefFileId(file)] = tmp
	}

	refEntsInRefBlock, refEntsForFileBlock, err := p.evaluateRefsTree(packageId, versionName, ent.Revision)
	if err != nil {
		return nil, err
	}

	resultRefsViews, err := p.makeRefsView(refEntsInRefBlock)
	if err != nil {
		return nil, err
	}

	sort.Slice(resultRefsViews, func(aIndex, bIndex int) bool {
		a := resultRefsViews[aIndex]
		b := resultRefsViews[bIndex]
		aKey := fmt.Sprintf("%s@@%s@@%s", a.Kind, a.PackageId, a.Version)
		bKey := fmt.Sprintf("%s@@%s@@%s", b.Kind, b.PackageId, b.Version)
		return aKey < bKey
	})

	for _, ref := range refEntsForFileBlock {
		refEnt, err := p.getLatestRevision(ref.RefPackageId, ref.RefVersion)
		if err != nil {
			return nil, err
		}

		filesFromRefPackage, err := p.publishedRepo.GetRevisionContent(ref.RefPackageId, ref.RefVersion, refEnt.Revision)
		if err != nil {
			return nil, err
		}

		for _, file := range filesFromRefPackage {
			tmp := file
			tmp.ReferenceId = ref.RefPackageId
			filesEntsMap[p.createRefFileId(file)] = tmp
		}
	}

	resultFilesEnts := make([]entity.PublishedContentEntity, 0)
	for _, file := range filesEntsMap {
		tmp := file
		resultFilesEnts = append(resultFilesEnts, tmp)
	}

	sort.Slice(resultFilesEnts, func(aIndex, bIndex int) bool {
		a := resultFilesEnts[aIndex]
		b := resultFilesEnts[bIndex]
		aKey := fmt.Sprintf("%s@@%v@@%s", a.ReferenceId, a.Index, a.Name)
		bKey := fmt.Sprintf("%s@@%v@@%s", b.ReferenceId, b.Index, b.Name)
		return aKey < bKey
	})

	version := entity.MakePublishedVersionView(ent, resultFilesEnts, resultRefsViews)
	return version, nil
}

func (p publishedServiceImpl) getLatestRevision(packageId string, versionName string) (*entity.PublishedVersionEntity, error) {
	ent, err := p.publishedRepo.GetVersion(packageId, versionName)
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
	return ent, nil
}

func (p publishedServiceImpl) evaluateRefsTree(packageId string, versionName string, revision int) ([]entity.PublishedReferenceEntity, []entity.PublishedReferenceEntity, error) {
	refEnts, err := p.publishedRepo.GetRevisionRefs(packageId, versionName, revision)
	if err != nil {
		return nil, nil, err
	}
	allExpandedReferences := make(map[string]entity.PublishedReferenceContainer)
	for _, val := range refEnts {
		if err = p.expandRefNode(val, allExpandedReferences); err != nil {
			return nil, nil, err
		}
	}

	refsBlock := make([]entity.PublishedReferenceEntity, 0)
	filesBlock := make([]entity.PublishedReferenceEntity, 0)

	for _, container := range allExpandedReferences {
		for _, ref := range container.References {
			tmp := ref
			filesBlock = append(filesBlock, tmp)
			refsBlock = append(refsBlock, tmp)
		}
	}
	return refsBlock, filesBlock, nil
}

func (p publishedServiceImpl) expandRefNode(refNode entity.PublishedReferenceEntity, allReferences map[string]entity.PublishedReferenceContainer) error {
	if p.addReferenceContainer(refNode, allReferences) {
		ent, err := p.getLatestRevision(refNode.RefPackageId, refNode.RefVersion)
		if err != nil {
			return err
		}
		subReferences, err := p.publishedRepo.GetRevisionRefs(refNode.RefPackageId, refNode.RefVersion, ent.Revision)
		if err != nil || subReferences == nil {
			return err
		}

		for _, subRef := range subReferences {
			if err := p.expandRefNode(subRef, allReferences); err != nil {
				return err
			}
		}
	}
	return nil
}

func (p publishedServiceImpl) addReferenceContainer(ref entity.PublishedReferenceEntity, refMap map[string]entity.PublishedReferenceContainer) bool {
	key := p.createRefId(ref)
	if c, containerExists := refMap[key]; containerExists {
		if _, refExists := c.References[ref.RefVersion]; refExists {
			return false
		} else {
			c.References[ref.RefVersion] = ref
			return true
		}
	} else {
		container := entity.PublishedReferenceContainer{References: make(map[string]entity.PublishedReferenceEntity)}
		container.References[ref.RefVersion] = ref
		refMap[key] = container
		return true
	}
}

func (p publishedServiceImpl) createRefId(ref entity.PublishedReferenceEntity) string {
	return fmt.Sprintf("%s@@%s@@%s@@%s", ref.PackageId, ref.Version, ref.RefPackageId, ref.RefVersion)
}
func (p publishedServiceImpl) createRefFileId(refFile entity.PublishedContentEntity) string {
	return fmt.Sprintf("%s@@%s@@%s@@%s", refFile.PackageId, refFile.Version, refFile.FileId, refFile.ReferenceId)
}

func (p publishedServiceImpl) GetVersionSources(packageId string, versionName string) ([]byte, error) {
	version, err := p.publishedRepo.GetVersion(packageId, versionName)
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
	var srcArchive []byte
	if p.systemInfoService.IsMinioStorageActive() && !p.systemInfoService.IsMinioStoreOnlyBuildResult() {
		publishedSrc, err := p.publishedRepo.GetPublishedSources(packageId, version.Version, version.Revision)
		if err != nil {
			return nil, err
		}
		if publishedSrc == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PublishedSourcesDataNotFound,
				Message: exception.PublishedSourcesDataNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId, "versionName": versionName},
			}
		}
		if publishedSrc.ArchiveChecksum != "" {
			file, err := p.minioStorageService.GetFile(ctx.Background(), view.PUBLISHED_SOURCES_ARCHIVES_TABLE, publishedSrc.ArchiveChecksum)
			if err != nil {
				return nil, err
			}
			srcArchive = file
		}
	} else {
		srcData, err := p.publishedRepo.GetVersionSources(packageId, version.Version, version.Revision)
		if err != nil {
			return nil, err
		}
		if srcData == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PublishedSourcesDataNotFound,
				Message: exception.PublishedSourcesDataNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId, "versionName": versionName},
			}
		}
		if len(srcData.Data) <= 0 {
			return nil, fmt.Errorf("failed to read sources archive for version: %v", version.Version)
		}
		srcArchive = srcData.Data
	}
	if srcArchive == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.SourcesNotFound,
			Message: exception.SourcesNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId, "versionName": versionName},
		}
	}
	return srcArchive, nil
}

func (p publishedServiceImpl) GetPublishedVersionSourceDataConfig(packageId string, versionName string) (*view.PublishedVersionSourceDataConfig, error) {
	version, err := p.publishedRepo.GetVersion(packageId, versionName)
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
	srcData := new(entity.PublishedSrcDataConfigEntity)
	if p.systemInfoService.IsMinioStorageActive() && !p.systemInfoService.IsMinioStoreOnlyBuildResult() {
		publishedSrc, err := p.publishedRepo.GetPublishedSources(packageId, version.Version, version.Revision)
		if err != nil {
			return nil, err
		}
		if publishedSrc == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PublishedSourcesDataNotFound,
				Message: exception.PublishedSourcesDataNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId, "versionName": versionName},
			}
		}
		srcData = &entity.PublishedSrcDataConfigEntity{
			PackageId:       packageId,
			ArchiveChecksum: publishedSrc.ArchiveChecksum,
			Config:          publishedSrc.Config,
		}
		if publishedSrc.ArchiveChecksum != "" {
			src, err := p.minioStorageService.GetFile(ctx.Background(), view.PUBLISHED_SOURCES_ARCHIVES_TABLE, publishedSrc.ArchiveChecksum)
			if err != nil {
				return nil, err
			}
			srcData.Data = src
		}
	} else {
		srcData, err = p.publishedRepo.GetPublishedVersionSourceDataConfig(packageId, version.Version, version.Revision)
		if err != nil {
			return nil, err
		}
		if srcData == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PublishedSourcesDataNotFound,
				Message: exception.PublishedSourcesDataNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId, "versionName": versionName},
			}
		}
	}
	if srcData.Data == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.SourcesNotFound,
			Message: exception.SourcesNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId, "versionName": versionName},
		}
	}

	var buildConfig view.BuildConfig
	err = json.Unmarshal(srcData.Config, &buildConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal build config from sources: %v", err.Error())
	}
	if len(buildConfig.Files)+len(buildConfig.Refs) == 0 {
		return nil, fmt.Errorf("empty build config")
	}
	if len(srcData.Data) <= 0 {
		return nil, fmt.Errorf("failed to read sources archive for version: %v", version.Version)
	}
	return &view.PublishedVersionSourceDataConfig{Config: buildConfig, Sources: srcData.Data}, nil
}

func (p publishedServiceImpl) GetPublishedVersionBuildConfig(packageId string, versionName string) (*view.BuildConfig, error) {
	version, err := p.publishedRepo.GetVersion(packageId, versionName)
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
	publishedSrc, err := p.publishedRepo.GetPublishedSources(packageId, version.Version, version.Revision)
	if err != nil {
		return nil, err
	}
	if publishedSrc == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedSourcesDataNotFound,
			Message: exception.PublishedSourcesDataNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId, "versionName": versionName},
		}
	}

	var buildConfig view.BuildConfig
	err = json.Unmarshal(publishedSrc.Config, &buildConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal build config from sources: %v", err.Error())
	}
	return &buildConfig, nil
}

func (p publishedServiceImpl) makeRefsView(ents []entity.PublishedReferenceEntity) ([]view.PublishedRef, error) {
	result := make([]view.PublishedRef, 0)
	for _, ent := range ents {
		packageEnt, err := p.publishedRepo.GetPackage(ent.RefPackageId)
		if err != nil {
			return nil, err
		}
		if packageEnt == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.ReferencedPackageNotFound,
				Message: exception.ReferencedPackageNotFoundMsg,
				Params:  map[string]interface{}{"package": ent.RefPackageId},
			}
		}

		version, err := p.publishedRepo.GetVersion(ent.PackageId, ent.Version)
		if err != nil {
			return nil, err
		}
		if version == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.ReferencedPackageVersionNotFound,
				Message: exception.ReferencedPackageVersionNotFoundMsg,
				Params:  map[string]interface{}{"package": ent.PackageId, "version": ent.Version},
			}
		}
		result = append(result, view.PublishedRef{
			PackageId:     ent.RefPackageId,
			Version:       ent.RefVersion,
			Name:          packageEnt.Name,
			Alias:         packageEnt.Alias,
			VersionStatus: version.Status,
			Kind:          packageEnt.Kind,
		})
	}
	return result, nil
}

func (p publishedServiceImpl) GetLatestContentData_to_delete(packageId string, versionName string, contentId string) (*view.PublishedContent, *view.ContentData, error) {
	ent, err := p.publishedRepo.GetVersion(packageId, versionName)
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

	content, err := p.publishedRepo.GetLatestContent(packageId, versionName, contentId)
	if err != nil {
		return nil, nil, err
	}
	if content == nil {
		return nil, nil, &exception.ContentNotFoundError{ContentId: contentId}
	}

	pce, err := p.publishedRepo.GetContentData(packageId, content.Checksum)
	if err != nil {
		return nil, nil, err
	}
	if pce == nil {
		return nil, nil, &exception.ContentNotFoundError{ContentId: contentId}
	}
	return entity.MakePublishedContentView(content), entity.MakeContentDataViewPub(content, pce), nil
}

func (p publishedServiceImpl) GetLatestContentBySlug(packageId string, versionName string, slug string) (*view.PublishedContent, error) {
	ent, err := p.publishedRepo.GetVersion(packageId, versionName)
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

	content, err := p.publishedRepo.GetLatestContentBySlug(packageId, versionName, slug)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ContentSlugNotFound,
			Message: exception.ContentSlugNotFoundMsg,
			Params:  map[string]interface{}{"contentSlug": slug},
		}
	}
	return entity.MakePublishedContentView(content), nil
}

func (p publishedServiceImpl) GetLatestContentDataBySlug(packageId string, versionName string, slug string) (*view.PublishedContent, *view.ContentData, error) {
	ent, err := p.publishedRepo.GetVersion(packageId, versionName)
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

	content, err := p.publishedRepo.GetLatestContentBySlug(packageId, versionName, slug)
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

	pce, err := p.publishedRepo.GetContentData(packageId, content.Checksum)
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

func (p publishedServiceImpl) PackagePublished(packageId string) (bool, error) {
	ents, err := p.publishedRepo.GetPackageVersions(packageId, "")
	if err != nil {
		return false, err
	}
	return len(ents) > 0, nil
}

func (p publishedServiceImpl) VersionPublished(packageId string, versionName string) (bool, error) {
	ent, err := p.publishedRepo.GetVersionIncludingDeleted(packageId, versionName)
	if err != nil {
		return false, err
	}
	return ent != nil, nil
}

func readZipFile(zf *zip.File) ([]byte, error) {
	f, err := zf.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return ioutil.ReadAll(f)
}

func (p publishedServiceImpl) DeleteVersion(ctx context.SecurityContext, packageId string, versionName string) error {
	return p.publishedRepo.MarkVersionDeleted(packageId, versionName, ctx.GetUserId())
}

func (p publishedServiceImpl) SharePublishedFile(packageId string, versionName string, slug string) (*view.SharedUrlResult_deprecated, error) {
	version, err := p.publishedRepo.GetVersion(packageId, versionName)
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

	content, err := p.publishedRepo.GetLatestContentBySlug(packageId, versionName, slug)
	if err != nil {
		return nil, err
	}

	if content == nil {
		return nil, &exception.ContentNotFoundError{ContentId: slug}
	}

	for attempts := 0; attempts < 100; attempts++ {
		sharedIdInfoEntity, err := p.publishedRepo.GetFileSharedInfo(packageId, slug, versionName)
		if err != nil {
			return nil, err
		}
		if sharedIdInfoEntity != nil {
			return entity.MakeSharedUrlInfo(sharedIdInfoEntity), nil
		}

		newSharedUrlInfoEntity := &entity.SharedUrlInfoEntity{
			SharedId:  generateSharedId(8),
			PackageId: packageId,
			Version:   versionName,
			FileId:    slug, // TODO: Slug!
		}
		if err := p.publishedRepo.CreateFileSharedInfo(newSharedUrlInfoEntity); err != nil {
			if customError, ok := err.(*exception.CustomError); ok {
				if customError.Code == exception.GeneratedSharedIdIsNotUnique {
					continue
				} else {
					return nil, err
				}
			}
		} else {
			return entity.MakeSharedUrlInfo(newSharedUrlInfoEntity), nil
		}
	}
	return nil, fmt.Errorf("failed to generate unique shared id")
}

func (p publishedServiceImpl) GetSharedFile(sharedId string) ([]byte, error) {
	sharedIdInfo, err := p.publishedRepo.GetFileSharedInfoById(sharedId)
	if err != nil {
		return nil, err
	}
	if sharedIdInfo == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.SharedIdIsIncorrect,
			Message: exception.SharedIdIsIncorrectMsg,
			Params:  map[string]interface{}{"sharedId": sharedId},
		}
	}
	version, err := p.publishedRepo.GetVersionIncludingDeleted(sharedIdInfo.PackageId, sharedIdInfo.Version)
	if err != nil {
		return nil, err
	}
	if version == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": sharedIdInfo.Version},
		}
	}
	if version.DeletedAt != nil && !version.DeletedAt.IsZero() {
		return nil, &exception.CustomError{
			Status:  http.StatusGone,
			Code:    exception.SharedContentUnavailable,
			Message: exception.SharedContentUnavailableMsg,
			Params:  map[string]interface{}{"sharedId": sharedId},
		}
	}

	content, err := p.publishedRepo.GetLatestContentBySlug(sharedIdInfo.PackageId, sharedIdInfo.Version, sharedIdInfo.FileId)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.NoContentFoundForSharedId,
			Message: exception.NoContentFoundForSharedIdMsg,
			Params:  map[string]interface{}{"sharedId": sharedId},
		}
	}

	pce, err := p.publishedRepo.GetContentData(content.PackageId, content.Checksum)
	if err != nil {
		return nil, err
	}
	if pce == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.NoContentFoundForSharedId,
			Message: exception.NoContentFoundForSharedIdMsg,
			Params:  map[string]interface{}{"sharedId": sharedId},
		}
	}
	return pce.Data, nil
}

func (p publishedServiceImpl) GetFilteredPackages(ctx context.SecurityContext, filter string, groupId string, onlyFavorite bool) ([]view.Package, error) {
	result := make([]view.Package, 0)
	entities, err := p.publishedRepo.GetFilteredPackages(filter, groupId)
	if err != nil {
		return nil, err
	}
	var groups []view.Group
	if groupId != "" {
		groups, err = p.getParentGroups(groupId)
		if err != nil {
			return nil, err
		}
	}
	for _, ent := range entities {
		if groupId == "" {
			groups, err = p.getParentGroups(ent.ParentId)
			if err != nil {
				return nil, err
			}
		}
		isFavorite, err := p.favoritesRepo.IsFavoritePackage(ctx.GetUserId(), ent.Id)
		if err != nil {
			return nil, err
		}
		versionEntity, err := p.publishedRepo.GetLastVersion(ent.Id)
		if err != nil {
			return nil, err
		}
		if versionEntity != nil {
			ent.LastVersion = versionEntity.Version
		}

		packageView := *entity.MakePackageView(&ent, isFavorite, groups)

		if !onlyFavorite || (onlyFavorite && isFavorite) { // TODO: need to handle via repository
			result = append(result, packageView)
		}
	}
	//todo paging
	return result, nil
}

func (p publishedServiceImpl) GetPackagesByServiceName(ctx context.SecurityContext, serviceName string) ([]view.Package, error) {
	result := make([]view.Package, 0)
	packageEnt, err := p.publishedRepo.GetPackageForServiceName(serviceName)
	if err != nil {
		return nil, err
	}
	if packageEnt != nil {
		groups, err := p.getParentGroups(packageEnt.ParentId)
		if err != nil {
			return nil, err
		}
		isFavorite, err := p.favoritesRepo.IsFavoritePackage(ctx.GetUserId(), packageEnt.Id)
		if err != nil {
			return nil, err
		}
		versionEntity, err := p.publishedRepo.GetLastVersion(packageEnt.Id)
		if err != nil {
			return nil, err
		}
		if versionEntity != nil {
			packageEnt.LastVersion = versionEntity.Version
		}

		packageView := *entity.MakePackageView(packageEnt, isFavorite, groups)

		result = append(result, packageView)
	}
	return result, nil
}

func (p publishedServiceImpl) GetPackageById(ctx context.SecurityContext, id string) (*view.Package, error) {
	packageEnt, err := p.publishedRepo.GetPackage(id)
	if err != nil {
		return nil, err
	}
	if packageEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": id},
		}
	}
	groups, err := p.getParentGroups(packageEnt.Id)
	if err != nil {
		return nil, err
	}
	isFavorite, err := p.favoritesRepo.IsFavoritePackage(ctx.GetUserId(), packageEnt.Id)
	if err != nil {
		return nil, err
	}
	versionEntity, err := p.publishedRepo.GetLastVersion(packageEnt.Id)
	if err != nil {
		return nil, err
	}
	if versionEntity != nil {
		packageEnt.LastVersion = versionEntity.Version
	}

	packageView := entity.MakePackageView(packageEnt, isFavorite, groups)
	return packageView, nil
}

func (p publishedServiceImpl) getParentGroups(groupId string) ([]view.Group, error) {
	groups, err := p.publishedRepo.GetParentPackageGroups(groupId)
	if err != nil {
		return nil, err
	}
	var result []view.Group
	for _, grp := range groups {
		result = append(result, *entity.MakePackageGroupView(&grp))
	}
	return result, err
}

func validatePublishSources(filesFromSourcesArchive map[string]struct{}, filesFromConfig []view.BCFile) error {
	for _, fileFromConfig := range filesFromConfig {
		if _, exists := filesFromSourcesArchive[fileFromConfig.FileId]; !exists {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.FileMissingFromSources,
				Message: exception.FileMissingFromSourcesMsg,
				Params:  map[string]interface{}{"fileId": fileFromConfig.FileId},
			}
		}
	}
	return nil
}

func (p publishedServiceImpl) PublishPackage(buildArc *archive.BuildResultArchive, buildSrcEnt *entity.BuildSourceEntity,
	buildConfig *view.BuildConfig, existingPackage *entity.PackageEntity) error {

	publishStart := time.Now()
	start := time.Now()
	err := buildArc.ReadPackageDocuments(false)
	if err != nil {
		return err
	}
	err = buildArc.ReadPackageComparisons(false)
	if err != nil {
		return err
	}
	err = buildArc.ReadPackageOperations(false)
	if err != nil {
		return err
	}
	err = buildArc.ReadBuilderNotifications(false)
	if err != nil {
		return err
	}
	utils.PerfLog(time.Since(start).Milliseconds(), 400, "publishPackage: zip files read")

	start = time.Now()
	if err = p.publishedValidator.ValidatePackage(buildArc, buildConfig); err != nil {
		return err
	}
	log.Debugf("Publishing package with packageId: %v; version: %v", buildArc.PackageInfo.PackageId, buildArc.PackageInfo.Version)
	if err = validation.ValidatePublishBuildResult(buildArc); err != nil {
		return err
	}

	checksumMap := make(map[string]struct{}, 0)
	if len(buildSrcEnt.Source) > 0 {
		origReader, err := zip.NewReader(bytes.NewReader(buildSrcEnt.Source), int64(len(buildSrcEnt.Source)))
		if err != nil {
			return fmt.Errorf("failed to read src zip, err: %w", err)
		}
		for _, fl := range origReader.File {
			checksumMap[fl.Name] = struct{}{}
		}
	}
	err = validatePublishSources(checksumMap, buildConfig.Files)
	if err != nil {
		return err
	}

	utils.PerfLog(time.Since(start).Milliseconds(), 200, "publishPackage: validate publishing package")

	start = time.Now()
	buildArc.PackageInfo.Version, buildArc.PackageInfo.Revision, err = SplitVersionRevision(buildArc.PackageInfo.Version)
	if err != nil {
		return err
	}
	if buildArc.PackageInfo.Revision == 0 {
		buildArc.PackageInfo.Revision = 1
		storedVersion, err := p.publishedRepo.GetVersionIncludingDeleted(buildArc.PackageInfo.PackageId, buildArc.PackageInfo.Version)
		if err != nil {
			return err
		}
		if storedVersion != nil {
			buildArc.PackageInfo.Revision = storedVersion.Revision + 1
		}
	}

	buildArc.PackageInfo.PreviousVersion, buildArc.PackageInfo.PreviousVersionRevision, err = SplitVersionRevision(buildArc.PackageInfo.PreviousVersion)
	if err != nil {
		return err
	}
	previousVersionRevision := buildArc.PackageInfo.PreviousVersionRevision
	if previousVersionRevision == 0 {
		if buildArc.PackageInfo.PreviousVersion != "" {
			previousVersionPackageId := buildArc.PackageInfo.PackageId
			if buildArc.PackageInfo.PreviousVersionPackageId != "" {
				previousVersionPackageId = buildArc.PackageInfo.PreviousVersionPackageId
			}
			previousVersionEnt, err := p.publishedRepo.GetVersionIncludingDeleted(previousVersionPackageId, buildArc.PackageInfo.PreviousVersion)
			if err != nil {
				return err
			}
			if previousVersionEnt == nil {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.PublishedPackageVersionNotFound,
					Message: exception.PublishedPackageVersionNotFoundMsg,
					Params:  map[string]interface{}{"version": buildArc.PackageInfo.PreviousVersion, "packageId": previousVersionPackageId},
				}
			}
			previousVersionRevision = previousVersionEnt.Revision
		}
	}

	refEntities, err := p.makePublishedReferencesEntities(buildArc.PackageInfo, buildArc.PackageInfo.Refs)
	if err != nil {
		return err
	}

	buildArcEntitiesReader := archive.NewBuildResultToEntitiesReader(buildArc)

	fileEntities, fileDataEntities, err := buildArcEntitiesReader.ReadDocumentsToEntities()
	if err != nil {
		return err
	}

	operationEntities, operationDataEntities, err := buildArcEntitiesReader.ReadOperationsToEntities()
	if err != nil {
		return err
	}

	operationsComparisonEntities, changedOperationEntities, versionComparisonsFromCache, err := buildArcEntitiesReader.ReadOperationComparisonsToEntities()
	if err != nil {
		return err
	}

	builderNotificationsEntities := buildArcEntitiesReader.ReadBuilderNotificationsToEntities(buildSrcEnt.BuildId)

	var publishedSrcEntity *entity.PublishedSrcEntity
	var publishedSrcArchiveEntity *entity.PublishedSrcArchiveEntity

	cfgBytes, err := json.Marshal(buildSrcEnt.Config)
	if err != nil {
		return err
	}

	metadataByFile := map[string]interface{}{}
	for _, fileEnt := range fileEntities {
		merged := entity.Metadata{}
		merged.MergeMetadata(fileEnt.Metadata)
		metadataByFile[fileEnt.FileId] = merged
	}
	mdBytes, err := json.Marshal(metadataByFile)
	if err != nil {
		return err
	}

	archiveCS := sha512.Sum512(buildSrcEnt.Source)
	archiveCSStr := hex.EncodeToString(archiveCS[:])

	// create sources entities
	publishedSrcEntity = &entity.PublishedSrcEntity{
		PackageId:       buildArc.PackageInfo.PackageId,
		Version:         buildArc.PackageInfo.Version,
		Revision:        buildArc.PackageInfo.Revision,
		Metadata:        mdBytes,
		Config:          cfgBytes,
		ArchiveChecksum: archiveCSStr,
	}
	if p.systemInfoService.IsMinioStorageActive() && !p.systemInfoService.IsMinioStoreOnlyBuildResult() {
		minioUploadStart := time.Now()
		err = p.minioStorageService.UploadFile(ctx.Background(), view.PUBLISHED_SOURCES_ARCHIVES_TABLE, archiveCSStr, buildSrcEnt.Source)
		if err != nil {
			return err
		}
		utils.PerfLog(time.Since(minioUploadStart).Milliseconds(), 100, "publishPackage: upload sources to minio")
	} else {
		publishedSrcArchiveEntity = &entity.PublishedSrcArchiveEntity{
			Checksum: archiveCSStr,
			Data:     buildSrcEnt.Source,
		}
	}

	versionLabels := make([]string, 0)
	versionMetadata := entity.Metadata{}
	var packageMetadata entity.Metadata
	packageMetadata = buildArc.PackageInfo.Metadata
	if len(packageMetadata) > 0 {
		versionLabels = packageMetadata.GetStringArray("versionLabels")
		branchName := packageMetadata.GetStringValue("branchName")
		if branchName != "" {
			versionMetadata.SetBranchName(branchName)
		}
		commitId := packageMetadata.GetStringValue("commitId")
		if commitId != "" {
			versionMetadata.SetCommitId(commitId)
		}
		repositoryUrl := packageMetadata.GetStringValue("repositoryUrl")
		if repositoryUrl != "" {
			versionMetadata.SetRepositoryUrl(repositoryUrl)
		}
		namespace := packageMetadata.GetStringValue("namespace")
		if namespace != "" {
			versionMetadata.SetNamespace(namespace)
		}
		cloudUrl := packageMetadata.GetStringValue("cloudUrl")
		if cloudUrl != "" {
			versionMetadata.SetCloudUrl(cloudUrl)
		}
		cloudName := packageMetadata.GetStringValue("cloudName")
		if cloudName != "" {
			versionMetadata.SetCloudName(cloudName)
		}
	}

	if buildArc.PackageInfo.BuilderVersion != "" {
		versionMetadata.SetBuilderVersion(buildArc.PackageInfo.BuilderVersion)
	}

	publishedAt := time.Now()
	if buildArc.PackageInfo.MigrationBuild && buildArc.PackageInfo.PublishedAt != nil &&
		!buildArc.PackageInfo.PublishedAt.IsZero() {
		publishedAt = *buildArc.PackageInfo.PublishedAt
	}
	versionEnt := &entity.PublishedVersionEntity{
		PackageId:                buildArc.PackageInfo.PackageId,
		Version:                  buildArc.PackageInfo.Version,
		PreviousVersion:          buildArc.PackageInfo.PreviousVersion,
		PreviousVersionPackageId: buildArc.PackageInfo.PreviousVersionPackageId,
		Revision:                 buildArc.PackageInfo.Revision,
		Status:                   buildArc.PackageInfo.Status,
		PublishedAt:              publishedAt,
		DeletedAt:                nil,
		Metadata:                 versionMetadata,
		Labels:                   versionLabels,
		CreatedBy:                buildArc.PackageInfo.CreatedBy,
	}

	newServiceName := ""
	if buildConfig.ServiceName != "" && (existingPackage.Kind == entity.KIND_PACKAGE || existingPackage.Kind == entity.KIND_DASHBOARD) {
		if existingPackage.ServiceName == "" {
			serviceOwner, err := p.publishedRepo.GetServiceOwner(utils.GetPackageWorkspaceId(existingPackage.Id), buildConfig.ServiceName)
			if err != nil {
				return fmt.Errorf("failed to check service owner: %v", err.Error())
			}
			if serviceOwner == "" {
				newServiceName = buildConfig.ServiceName
			}
		} else if buildConfig.ServiceName == existingPackage.ServiceName {
			newServiceName = ""
		} else {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.ServiceNameCantBeModified,
				Message: exception.ServiceNameCantBeModifiedMsg,
			}
		}
	}

	utils.PerfLog(time.Since(start).Milliseconds(), 200, "publishPackage: make all version entities")

	start = time.Now()
	versionCreationStart := time.Now()
	err = p.publishedRepo.CreateVersionWithData(
		buildArc.PackageInfo,
		buildSrcEnt.BuildId,
		versionEnt,
		fileEntities,
		fileDataEntities,
		refEntities,
		publishedSrcEntity,
		publishedSrcArchiveEntity,
		operationEntities,
		operationDataEntities,
		changedOperationEntities,
		builderNotificationsEntities,
		operationsComparisonEntities,
		newServiceName,
		existingPackage,
		versionComparisonsFromCache,
	)
	utils.PerfLog(time.Since(start).Milliseconds(), 15000, "publishPackage: CreateVersionWithData")
	if err != nil {
		return err
	}

	log.Debugf("Version creation time: %v", time.Since(versionCreationStart).Milliseconds())

	start = time.Now()
	//todo move this recalculation inside publish method to run in the same transaction (after publish method redesign)
	err = p.publishedRepo.RecalculateOperationGroups(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, view.MakePackageGroupingPrefixRegex(existingPackage.RestGroupingPrefix), "", versionEnt.CreatedBy)
	if err != nil {
		log.Errorf("failed to calculate operations groups for version: %+v: %v", versionEnt, err.Error())
	}
	utils.PerfLog(time.Since(start).Milliseconds(), 50, "publishPackage: operations groups calculation")

	if !buildArc.PackageInfo.MigrationBuild {
		if versionEnt.Status == string(view.Release) {
			p.monitoringService.IncreaseBusinessMetricCounter(buildArc.PackageInfo.CreatedBy, metrics.ReleaseVersionsPublished, versionEnt.PackageId)
		}
		err = p.reCalculateChangelogs(buildArc.PackageInfo)
		if err != nil {
			return err
		}
		dataMap := map[string]interface{}{}
		dataMap["version"] = versionEnt.Version
		dataMap["status"] = versionEnt.Status

		var eventType view.ATEventType
		if buildArc.PackageInfo.Revision > 1 {
			eventType = view.ATETPublishNewRevision
		} else {
			eventType = view.ATETPublishNewVersion
		}
		dataMap["revision"] = buildArc.PackageInfo.Revision

		p.atService.TrackEvent(view.ActivityTrackingEvent{
			Type:      eventType,
			Data:      dataMap,
			PackageId: versionEnt.PackageId,
			Date:      time.Now(),
			UserId:    versionEnt.CreatedBy,
		})
	}

	utils.PerfLog(time.Since(publishStart).Milliseconds(), 10000, "publishPackage: total package publishing")
	return nil
}

func (p publishedServiceImpl) makePublishedReferencesEntities(packageInfo view.PackageInfoFile, packageRefs []view.BCRef) ([]*entity.PublishedReferenceEntity, error) {
	uniqueRefs := make(map[string]struct{}, 0)
	publishedReferences := make([]*entity.PublishedReferenceEntity, 0)
	for _, ref := range packageRefs {
		refVersion, err := p.publishedRepo.GetVersionIncludingDeleted(ref.RefId, ref.Version)
		if err != nil {
			return nil, err
		}
		if refVersion == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.ReferencedPackageVersionNotFound,
				Message: exception.ReferencedPackageVersionNotFoundMsg,
				Params:  map[string]interface{}{"package": ref.RefId, "version": ref.Version},
			}
		}
		refEntity := &entity.PublishedReferenceEntity{
			PackageId:    packageInfo.PackageId,
			Version:      packageInfo.Version,
			Revision:     packageInfo.Revision,
			RefPackageId: refVersion.PackageId,
			RefVersion:   refVersion.Version,
			RefRevision:  refVersion.Revision,
			Excluded:     ref.Excluded,
		}
		if ref.ParentRefId != "" {
			parentRefVersion, err := p.publishedRepo.GetVersionIncludingDeleted(ref.ParentRefId, ref.ParentVersion)
			if err != nil {
				return nil, err
			}
			if parentRefVersion == nil {
				return nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.ReferencedPackageVersionNotFound,
					Message: exception.ReferencedPackageVersionNotFoundMsg,
					Params:  map[string]interface{}{"package": ref.ParentRefId, "version": ref.ParentVersion},
				}
			}
			refEntity.ParentRefPackageId = parentRefVersion.PackageId
			refEntity.ParentRefVersion = parentRefVersion.Version
			refEntity.ParentRefRevision = parentRefVersion.Revision
		}

		refEntityKey := makePublishedReferenceUniqueKey(refEntity)
		if _, exists := uniqueRefs[refEntityKey]; exists {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.DuplicateReference,
				Message: exception.DuplicateReferenceMsg,
				Params:  map[string]interface{}{"refId": ref.RefId, "refVersion": ref.Version},
			}
		}
		uniqueRefs[refEntityKey] = struct{}{}
		publishedReferences = append(publishedReferences, refEntity)
	}
	return publishedReferences, nil
}

func makePublishedReferenceUniqueKey(entity *entity.PublishedReferenceEntity) string {
	return fmt.Sprintf(`%v|@@|%v|@@|%v|@@|%v|@@|%v|@@|%v`, entity.RefPackageId, entity.RefVersion, entity.RefRevision, entity.ParentRefPackageId, entity.ParentRefVersion, entity.ParentRefRevision)
}

func (p publishedServiceImpl) reCalculateChangelogs(packageInfo view.PackageInfoFile) error {
	versions, err := p.publishedRepo.GetVersionsByPreviousVersion(packageInfo.PackageId, packageInfo.Version)
	if err != nil {
		return err
	}
	var buildConfig view.BuildConfig
	for _, version := range versions {
		buildConfig = view.BuildConfig{
			PackageId:                version.PackageId,
			Version:                  version.Version,
			PreviousVersion:          version.PreviousVersion,
			PreviousVersionPackageId: version.PreviousVersionPackageId,
			BuildType:                view.ChangelogType,
			CreatedBy:                packageInfo.CreatedBy,
			PublishedAt:              time.Now(),
		}
		err := p.createChangelogBuild(buildConfig)
		if err != nil {
			return err
		}
	}
	return nil
}

func (p publishedServiceImpl) PublishChanges(buildArc *archive.BuildResultArchive, publishId string) error {
	var err error
	if err = buildArc.ReadPackageComparisons(false); err != nil {
		return err
	}

	if err = validation.ValidatePublishBuildResult(buildArc); err != nil {
		return err
	}

	operationChangesCreationStart := time.Now()
	buildArc.PackageInfo.Version, buildArc.PackageInfo.Revision, err = SplitVersionRevision(buildArc.PackageInfo.Version)
	if err != nil {
		return err
	}
	buildArc.PackageInfo.PreviousVersion, buildArc.PackageInfo.PreviousVersionRevision, err = SplitVersionRevision(buildArc.PackageInfo.PreviousVersion)
	if err != nil {
		return err
	}
	if err := p.publishedValidator.ValidateChanges(buildArc); err != nil {
		return err
	}
	if len(buildArc.PackageComparisons.Comparisons) == 0 {
		return nil
	}

	buildArcEntitiesReader := archive.NewBuildResultToEntitiesReader(buildArc)
	versionComparisonEntities, operationComparisonEntities, versionComparisonsFromCache, err := buildArcEntitiesReader.ReadOperationComparisonsToEntities()
	if err != nil {
		return err
	}

	err = p.publishedRepo.SaveVersionChanges(buildArc.PackageInfo, publishId, operationComparisonEntities, versionComparisonEntities, versionComparisonsFromCache)
	if err != nil {
		return err
	}
	log.Debugf("Operation changes creation time: %v", time.Since(operationChangesCreationStart).Milliseconds())
	return nil
}

func SplitVersionRevision(version string) (string, int, error) {
	if !strings.Contains(version, "@") {
		return version, 0, nil
	}
	versionSplit := strings.Split(version, "@")
	if len(versionSplit) != 2 {
		return "", -1, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidRevisionFormat,
			Message: exception.InvalidRevisionFormatMsg,
			Params:  map[string]interface{}{"version": version},
		}
	}
	versionName := versionSplit[0]
	versionRevisionStr := versionSplit[1]
	versionRevision, err := strconv.Atoi(versionRevisionStr)
	if err != nil {
		return "", -1, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidRevisionFormat,
			Message: exception.InvalidRevisionFormatMsg,
			Params:  map[string]interface{}{"version": version},
			Debug:   err.Error(),
		}
	}
	if versionRevision <= 0 {
		return "", -1, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidRevisionFormat,
			Message: exception.InvalidRevisionFormatMsg,
			Params:  map[string]interface{}{"version": version},
		}
	}
	return versionName, versionRevision, nil
}

func (p publishedServiceImpl) createChangelogBuild(config view.BuildConfig) error { //todo folder refactoring is needed. Use buildService.CreateChangelogBuild() after it
	status := view.StatusNotStarted

	buildId := config.PublishId
	if buildId == "" {
		buildId = uuid.New().String()
	}

	buildEnt := entity.BuildEntity{
		BuildId: buildId,
		Status:  string(status),
		Details: "",

		PackageId: config.PackageId,
		Version:   config.Version,

		CreatedBy:    config.CreatedBy,
		RestartCount: 0,
		Priority:     -1,
	}

	confAsMap, err := view.BuildConfigToMap(config)
	if err != nil {
		return err
	}

	sourceEnt := entity.BuildSourceEntity{
		BuildId: buildEnt.BuildId,
		Config:  *confAsMap,
	}

	err = p.buildRepository.StoreBuild(buildEnt, sourceEnt, nil)
	if err != nil {
		return err
	}
	return nil
}
