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
	"context"
	"fmt"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/archive"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/validation"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	log "github.com/sirupsen/logrus"
	"net/http"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type BuildResultService interface {
	StoreBuildResult(buildId string, result []byte) error
	GetBuildResult(buildId string) ([]byte, error)

	SaveBuildResult_deprecated(packageId string, archiveData []byte, publishId string, availableVersionStatuses []string) error
	SaveBuildResult(packageId string, data []byte, fileName string, publishId string, availableVersionStatuses []string) error
}

func NewBuildResultService(buildResultRepository repository.BuildResultRepository, buildRepository repository.BuildRepository,
	publishedRepository repository.PublishedRepository, systemInfoService SystemInfoService, minioStorageService MinioStorageService,
	publishService PublishedService, exportService ExportService) BuildResultService {
	return &buildResultServiceImpl{
		buildResultRepository: buildResultRepository,
		buildRepository:       buildRepository,
		publishedRepository:   publishedRepository,
		minioStorageService:   minioStorageService,
		systemInfoService:     systemInfoService,
		publishService:        publishService,
		exportService:         exportService,
		publishedValidator:    validation.NewPublishedValidator(publishedRepository),
	}
}

type buildResultServiceImpl struct {
	buildResultRepository repository.BuildResultRepository
	buildRepository       repository.BuildRepository
	publishedRepository   repository.PublishedRepository
	minioStorageService   MinioStorageService
	systemInfoService     SystemInfoService
	publishService        PublishedService
	exportService         ExportService

	publishedValidator validation.PublishedValidator
}

func (b buildResultServiceImpl) StoreBuildResult(buildId string, result []byte) error {
	if b.systemInfoService.IsMinioStorageActive() {
		ctx := context.Background()
		err := b.minioStorageService.UploadFile(ctx, view.BUILD_RESULT_TABLE, buildId, result)
		if err != nil {
			return err
		}
		return nil
	}
	return b.buildResultRepository.StoreBuildResult(entity.BuildResultEntity{
		BuildId: buildId,
		Data:    result,
	})
}

func (b buildResultServiceImpl) GetBuildResult(buildId string) ([]byte, error) {
	if b.systemInfoService.IsMinioStorageActive() {
		ctx := context.Background()
		content, err := b.minioStorageService.GetFile(ctx, view.BUILD_RESULT_TABLE, buildId)
		if err != nil {
			return nil, err
		}
		return content, nil
	}
	res, err := b.buildResultRepository.GetBuildResult(buildId)
	if err != nil {
		return nil, err
	}
	return res.Data, nil
}

func (p buildResultServiceImpl) SaveBuildResult_deprecated(packageId string, data []byte, publishId string, availableVersionStatuses []string) error {
	// Update last active time to make sure that the build won't be restarted. Assuming that publication will take < 30 seconds!
	// TODO: another option could be different status like "result_processing" for such builds
	err := p.buildRepository.UpdateBuildStatus(publishId, view.StatusRunning, "")
	if err != nil {
		log.Errorf("Failed refresh last active time before publication for build %s with err: %s", publishId, err)
	}

	start := time.Now()
	zipReader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackageArchive,
			Message: exception.InvalidPackageArchiveMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		}
	}

	buildArc := archive.NewBuildResultArchive(zipReader)
	if err := buildArc.ReadPackageInfo(); err != nil {
		return err
	}
	utils.PerfLog(time.Since(start).Milliseconds(), 50, "SaveBuildResult: archive parsing")

	if buildArc.PackageInfo.PackageId != packageId {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params: map[string]interface{}{
				"file":  "info",
				"error": fmt.Sprintf("packageId:%v provided by %v doesn't match packageId:%v requested in path", buildArc.PackageInfo.PackageId, archive.InfoFilePath, packageId),
			},
		}
	}

	start = time.Now()
	buildSrcEnt, err := p.buildRepository.GetBuildSrc(publishId)
	if err != nil {
		return fmt.Errorf("failed to get build src with err: %w", err)
	}
	if buildSrcEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BuildSourcesNotFound,
			Message: exception.BuildSourcesNotFoundMsg,
			Params:  map[string]interface{}{"publishId": publishId},
		}
	}

	buildConfig, err := view.BuildConfigFromMap(buildSrcEnt.Config, publishId)
	if err != nil {
		return err
	}
	utils.PerfLog(time.Since(start).Milliseconds(), 200, "SaveBuildResult: get build src")

	start = time.Now()
	err = p.publishedValidator.ValidateBuildResultAgainstConfig(buildArc, buildConfig)
	if err != nil {
		return err
	}
	utils.PerfLog(time.Since(start).Milliseconds(), 100, "SaveBuildResult: ValidateBuildResultAgainstConfig")

	start = time.Now()

	existingPackage, err := p.publishedRepository.GetPackage(buildArc.PackageInfo.PackageId)
	if err != nil {
		return err
	}
	utils.PerfLog(time.Since(start).Milliseconds(), 100, "SaveBuildResult: get existing package")
	if existingPackage == nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "info", "error": fmt.Sprintf("package with packageId = '%v' doesn't exist", buildArc.PackageInfo.PackageId)},
		}
	}
	buildArc.PackageInfo.Kind = existingPackage.Kind
	//todo zip check for unknown files

	switch buildArc.PackageInfo.BuildType {
	case view.PublishType:
		sufficientPrivileges := utils.SliceContains(availableVersionStatuses, buildArc.PackageInfo.Status)
		if !sufficientPrivileges && !buildArc.PackageInfo.MigrationBuild {
			return &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
			}
		}

		return p.publishService.PublishPackage(buildArc, buildSrcEnt, buildConfig, existingPackage)
		//support view.ReducedSourceSpecificationsType_deprecated type because of node-service that is not yet ready for v3 publish
		//we need view.ReducedSourceSpecificationsType_deprecated build on node-service for operation group publication
	case view.DocumentGroupType_deprecated, view.ReducedSourceSpecificationsType_deprecated:
		return p.exportService.PublishTransformedDocuments(buildArc, publishId)
	case view.ChangelogType:
		return p.publishService.PublishChanges(buildArc, publishId)
	default:
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UnknownBuildType,
			Message: exception.UnknownBuildTypeMsg,
			Params:  map[string]interface{}{"type": buildArc.PackageInfo.BuildType},
		}
	}
}

func (p buildResultServiceImpl) SaveBuildResult(packageId string, data []byte, fileName string, publishId string, availableVersionStatuses []string) error {
	utils.SafeAsync(func() {
		err := p.StoreBuildResult(publishId, data)
		if err != nil {
			log.Errorf("Failed to save build result for %s: %s", publishId, err.Error())
			return
		}
	})

	// Update last active time to make sure that the build won't be restarted. Assuming that publication will take < 30 seconds!
	// TODO: another option could be different status like "result_processing" for such builds
	err := p.buildRepository.UpdateBuildStatus(publishId, view.StatusRunning, "")
	if err != nil {
		log.Errorf("Failed refresh last active time before publication for build %s with err: %s", publishId, err)
	}

	start := time.Now()
	buildSrcEnt, err := p.buildRepository.GetBuildSrc(publishId)
	if err != nil {
		return fmt.Errorf("failed to get build src with err: %w", err)
	}
	if buildSrcEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BuildSourcesNotFound,
			Message: exception.BuildSourcesNotFoundMsg,
			Params:  map[string]interface{}{"publishId": publishId},
		}
	}

	buildConfig, err := view.BuildConfigFromMap(buildSrcEnt.Config, publishId)
	if err != nil {
		return err
	}
	utils.PerfLog(time.Since(start).Milliseconds(), 200, "SaveBuildResult: get build src")

	switch buildConfig.BuildType {
	case view.ExportVersion, view.ExportRestDocument, view.ExportRestOperationsGroup:
		return p.exportService.StoreExportResult(buildConfig.CreatedBy, publishId, data, fileName, *buildConfig)
	}

	if !strings.HasSuffix(fileName, ".zip") {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "data file name, expecting .zip archive"},
		}
	}

	start = time.Now()
	zipReader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackageArchive,
			Message: exception.InvalidPackageArchiveMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		}
	}

	buildArc := archive.NewBuildResultArchive(zipReader)
	if err := buildArc.ReadPackageInfo(); err != nil {
		return err
	}
	utils.PerfLog(time.Since(start).Milliseconds(), 50, "SaveBuildResult: archive parsing")

	if buildArc.PackageInfo.PackageId != packageId {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params: map[string]interface{}{
				"file":  "info",
				"error": fmt.Sprintf("packageId:%v provided by %v doesn't match packageId:%v requested in path", buildArc.PackageInfo.PackageId, archive.InfoFilePath, packageId),
			},
		}
	}

	start = time.Now()
	err = p.publishedValidator.ValidateBuildResultAgainstConfig(buildArc, buildConfig)
	if err != nil {
		return err
	}
	utils.PerfLog(time.Since(start).Milliseconds(), 100, "SaveBuildResult: ValidateBuildResultAgainstConfig")

	start = time.Now()
	existingPackage, err := p.publishedRepository.GetPackage(buildArc.PackageInfo.PackageId)
	if err != nil {
		return err
	}
	utils.PerfLog(time.Since(start).Milliseconds(), 100, "SaveBuildResult: get existing package")
	if existingPackage == nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "info", "error": fmt.Sprintf("package with packageId = '%v' doesn't exist", buildArc.PackageInfo.PackageId)},
		}
	}
	buildArc.PackageInfo.Kind = existingPackage.Kind
	//todo zip check for unknown files

	switch buildArc.PackageInfo.BuildType {
	case view.PublishType:
		sufficientPrivileges := utils.SliceContains(availableVersionStatuses, buildArc.PackageInfo.Status)
		if !sufficientPrivileges && !buildArc.PackageInfo.MigrationBuild {
			return &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
			}
		}
		return p.publishService.PublishPackage(buildArc, buildSrcEnt, buildConfig, existingPackage)
	case view.ChangelogType:
		return p.publishService.PublishChanges(buildArc, publishId)
	case view.ReducedSourceSpecificationsType_deprecated, view.MergedSpecificationType_deprecated:
		return p.exportService.PublishTransformedDocuments(buildArc, publishId)
	default:
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UnknownBuildType,
			Message: exception.UnknownBuildTypeMsg,
			Params:  map[string]interface{}{"type": buildArc.PackageInfo.BuildType},
		}
	}
}
