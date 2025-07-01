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
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/archive"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/validation"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

type BuildService interface {
	PublishVersion(ctx context.SecurityContext, config view.BuildConfig, src []byte, clientBuild bool, builderId string, dependencies []string, resolveRefs bool, resolveConflicts bool) (*view.PublishV2Response, error)
	GetStatus(buildId string) (string, string, error)
	GetStatuses(buildIds []string) ([]view.PublishStatusResponse, error)
	UpdateBuildStatus(buildId string, status view.BuildStatusEnum, details string) error
	GetFreeBuild(builderId string) ([]byte, error)
	CreateChangelogBuild(config view.BuildConfig, isExternal bool, builderId string) (string, view.BuildConfig, error) //deprecated
	GetBuildViewByChangelogSearchQuery(searchRequest view.ChangelogBuildSearchRequest) (*view.BuildView, error)
	GetBuildViewByDocumentGroupSearchQuery(searchRequest view.DocumentGroupBuildSearchRequest) (*view.BuildView, error)
	ValidateBuildOwnership(buildId string, builderId string) error

	CreateBuildWithoutDependencies(config view.BuildConfig, isExternal bool, builderId string) (string, view.BuildConfig, error)
	AwaitBuildCompletion(buildId string) error

	GetBuild(buildId string) (*view.BuildView, error)
}

func NewBuildService(
	buildRepository repository.BuildRepository,
	buildProcessor BuildProcessorService,
	publishService PublishedService,
	systemInfoService SystemInfoService,
	packageService PackageService,
	refResolverService RefResolverService) BuildService {
	return &buildServiceImpl{
		buildRepository:    buildRepository,
		buildProcessor:     buildProcessor,
		publishService:     publishService,
		systemInfoService:  systemInfoService,
		packageService:     packageService,
		refResolverService: refResolverService,
	}
}

type buildServiceImpl struct {
	buildRepository    repository.BuildRepository
	buildProcessor     BuildProcessorService
	publishService     PublishedService
	systemInfoService  SystemInfoService
	packageService     PackageService
	refResolverService RefResolverService
}

func (b *buildServiceImpl) PublishVersion(ctx context.SecurityContext, config view.BuildConfig, src []byte, clientBuild bool, builderId string, dependencies []string, resolveRefs bool, resolveConflicts bool) (*view.PublishV2Response, error) {
	exists, err := b.packageService.PackageExists(config.PackageId)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": config.PackageId},
		}
	}

	versionNameValidationError := ValidateVersionName(config.Version)
	if versionNameValidationError != nil {
		return nil, versionNameValidationError
	}

	if config.MigrationBuild == true || config.NoChangelog == true || !config.PublishedAt.IsZero() {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ForbiddenDefaultMigrationBuildParameters,
			Message: exception.ForbiddenDefaultMigrationBuildParametersMsg,
			Params:  map[string]interface{}{"parameters": "migrationBuild,noChangeLog,publishedAt"},
		}
	}

	if config.BuildType != view.ChangelogType {
		if strings.Contains(config.PreviousVersion, "@") {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.PreviousVersionNameNotAllowed,
				Message: exception.PreviousVersionNameNotAllowedMsg,
				Params:  map[string]interface{}{"version": config.PreviousVersion},
			}
		}
	}

	if config.Status == string(view.Release) {
		packEnt, err := b.packageService.GetPackage(ctx, config.PackageId, false)
		if err != nil {
			return nil, err
		}
		var pattern string
		if packEnt.ReleaseVersionPattern != "" {
			pattern = packEnt.ReleaseVersionPattern
		} else {
			pattern = ".*"
		}
		err = ReleaseVersionMatchesPattern(config.Version, pattern)
		if err != nil {
			return nil, err
		}
	}

	if config.PreviousVersionPackageId == config.PackageId {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPreviousVersionPackage,
			Message: exception.InvalidPreviousVersionPackageMsg,
			Params:  map[string]interface{}{"previousVersionPackageId": config.PreviousVersionPackageId, "packageId": config.PackageId},
		}
	}

	if config.Version == config.PreviousVersion {
		if config.PreviousVersionPackageId == "" {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.VersionIsEqualToPreviousVersion,
				Message: exception.VersionIsEqualToPreviousVersionMsg,
				Params:  map[string]interface{}{"version": config.Version, "previousVersion": config.PreviousVersion},
			}
		}
	}

	if config.PreviousVersion != "" {
		previousVersionPackageId := config.PackageId
		if config.PreviousVersionPackageId != "" {
			previousVersionPackageId = config.PreviousVersionPackageId
		}
		previousVersionExists, err := b.publishService.VersionPublished(previousVersionPackageId, config.PreviousVersion)
		if err != nil {
			return nil, err
		}
		if !previousVersionExists {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.PublishedPackageVersionNotFound,
				Message: exception.PublishedPackageVersionNotFoundMsg,
				Params:  map[string]interface{}{"version": config.PreviousVersion, "packageId": previousVersionPackageId},
			}
		}
	}

	if len(src) > 0 {
		zipReader, err := zip.NewReader(bytes.NewReader(src), int64(len(src)))
		if err != nil {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidPackageArchive,
				Message: exception.InvalidPackageArchiveMsg,
				Params:  map[string]interface{}{"error": err.Error()},
			}
		}
		if err = validation.ValidatePublishSources(archive.NewSourcesArchive(zipReader, &config)); err != nil {
			return nil, err
		}
	}

	if config.Metadata.RepositoryUrl != "" && !utils.IsUrl(config.Metadata.RepositoryUrl) {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectMetadataField,
			Message: exception.IncorrectMetadataFieldMsg,
			Params:  map[string]interface{}{"field": "repositoryUrl", "description": "not valid URL"},
		}
	}

	//defer refs calculation if build has dependencies
	if len(dependencies) > 0 {
		config.UnresolvedRefs = true
		config.ResolveConflicts = resolveConflicts
		config.ResolveRefs = resolveRefs
	} else {
		config.Refs, err = b.refResolverService.CalculateBuildConfigRefs(config.Refs, resolveRefs, resolveConflicts)
		if err != nil {
			return nil, err
		}
	}

	publishId, config, err := b.addBuild(ctx, config, src, clientBuild, builderId, dependencies)
	if err != nil {
		return nil, err
	}

	if clientBuild && len(dependencies) == 0 {
		return &view.PublishV2Response{PublishId: publishId, Config: &config}, nil
	} else {
		return &view.PublishV2Response{PublishId: publishId}, nil
	}
}

func (b *buildServiceImpl) setValidationRulesSeverity(config view.BuildConfig) view.BuildConfig {
	var severity string
	if b.systemInfoService.FailBuildOnBrokenRefs() {
		severity = view.BrokenRefsSeverityError
	} else {
		severity = view.BrokenRefsSeverityWarning
	}
	config.ValidationRulesSeverity = view.ValidationRulesSeverity{
		BrokenRefs: severity,
	}
	return config
}

// CreateChangelogBuild deprecated. use to CreateBuildWithoutDependencies
func (b *buildServiceImpl) CreateChangelogBuild(config view.BuildConfig, isExternal bool, builderId string) (string, view.BuildConfig, error) {
	config = b.setValidationRulesSeverity(config)

	status := view.StatusNotStarted
	if isExternal {
		status = view.StatusRunning
	}
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

		BuilderId: builderId,
		Priority:  0,
	}

	confAsMap, err := view.BuildConfigToMap(config)
	if err != nil {
		return "", config, err
	}

	sourceEnt := entity.BuildSourceEntity{
		BuildId: buildEnt.BuildId,
		Config:  *confAsMap,
	}

	err = b.buildRepository.StoreBuild(buildEnt, sourceEnt, nil)
	if err != nil {
		return "", config, err
	}
	return buildEnt.BuildId, config, nil
}

func (b *buildServiceImpl) CreateBuildWithoutDependencies(config view.BuildConfig, clientBuild bool, builderId string) (string, view.BuildConfig, error) {
	config = b.setValidationRulesSeverity(config)

	status := view.StatusNotStarted
	if clientBuild {
		status = view.StatusRunning
	}
	buildId := config.PublishId
	if buildId == "" {
		buildId = uuid.New().String()
	}

	timeNow := time.Now()
	buildEnt := entity.BuildEntity{
		BuildId:     buildId,
		Status:      string(status),
		Details:     "",
		ClientBuild: clientBuild,

		PackageId: config.PackageId,
		Version:   config.Version,

		StartedAt: &timeNow,

		CreatedBy:    config.CreatedBy,
		RestartCount: 0,

		BuilderId: builderId,
		Priority:  0,
	}

	confAsMap, err := view.BuildConfigToMap(config)
	if err != nil {
		return "", config, err
	}

	sourceEnt := entity.BuildSourceEntity{
		BuildId: buildEnt.BuildId,
		Config:  *confAsMap,
	}

	err = b.buildRepository.StoreBuild(buildEnt, sourceEnt, nil)
	if err != nil {
		return "", config, err
	}
	return buildEnt.BuildId, config, nil
}

func (b *buildServiceImpl) addBuild(ctx context.SecurityContext, config view.BuildConfig, src []byte, clientBuild bool, builderId string, dependencies []string) (string, view.BuildConfig, error) {
	config = b.setValidationRulesSeverity(config)

	status := view.StatusNotStarted
	if clientBuild {
		status = view.StatusRunning
	}

	buildId := config.PublishId
	if buildId == "" {
		buildId = uuid.New().String()
	}

	timeNow := time.Now()
	buildEnt := entity.BuildEntity{
		BuildId:     buildId,
		Status:      string(status),
		Details:     "",
		ClientBuild: clientBuild,

		PackageId: config.PackageId,
		Version:   config.Version,

		StartedAt: &timeNow,

		CreatedBy:    ctx.GetUserId(),
		RestartCount: 0,

		BuilderId: builderId,
		Priority:  1,
	}

	confAsMap, err := view.BuildConfigToMap(config)
	if err != nil {
		return "", config, err
	}

	sourceEnt := entity.BuildSourceEntity{
		BuildId: buildEnt.BuildId,
		Source:  src,
		Config:  *confAsMap,
	}

	var depends []entity.BuildDependencyEntity
	for _, dep := range dependencies {
		depends = append(depends, entity.BuildDependencyEntity{BuildId: buildEnt.BuildId, DependId: dep})
	}

	err = b.buildRepository.StoreBuild(buildEnt, sourceEnt, depends)
	if err != nil {
		return "", config, err
	}

	if !clientBuild {
		log.Infof("Build %s added as internal", buildEnt.BuildId)
	} else {
		log.Infof("Build %s added as external", buildEnt.BuildId)
	}

	return buildEnt.BuildId, config, nil
}

func (b *buildServiceImpl) GetStatus(buildId string) (string, string, error) {
	ent, err := b.buildRepository.GetBuild(buildId)
	if err != nil {
		return "", "", err
	}
	if ent == nil {
		return "", "", nil
	}
	return ent.Status, ent.Details, nil
}

func (b *buildServiceImpl) GetStatuses(buildIds []string) ([]view.PublishStatusResponse, error) {
	ents, err := b.buildRepository.GetBuilds(buildIds)
	if err != nil {
		return nil, err
	}
	var result []view.PublishStatusResponse
	for _, ent := range ents {
		result = append(result, view.PublishStatusResponse{
			PublishId: ent.BuildId,
			Status:    ent.Status,
			Message:   ent.Details,
		})
	}
	return result, nil
}

func (b *buildServiceImpl) UpdateBuildStatus(buildId string, status view.BuildStatusEnum, details string) error {
	err := b.buildRepository.UpdateBuildStatus(buildId, status, details)
	if err != nil {
		return err
	}

	return nil
}

func (b *buildServiceImpl) GetFreeBuild(builderId string) ([]byte, error) {
	config, src, err := b.buildProcessor.GetFreeBuild(builderId)
	if err != nil {
		return nil, err
	}
	if config == nil && src == nil {
		return nil, nil
	}
	result := bytes.Buffer{}
	zw := zip.NewWriter(&result)
	if src != nil {
		srcZipReader, err := zip.NewReader(bytes.NewReader(src), int64(len(src)))
		if err != nil {
			return nil, err
		}
		for _, srcFile := range srcZipReader.File {
			srcFileReader, err := srcFile.Open()
			if err != nil {
				return nil, err
			}
			header, err := zip.FileInfoHeader(srcFile.FileInfo())
			if err != nil {
				return nil, err
			}
			header.Name = "sources/" + srcFile.Name
			newHeader, err := zw.CreateHeader(header)
			if err != nil {
				return nil, err
			}
			_, err = io.Copy(newHeader, srcFileReader)
			if err != nil {
				return nil, err
			}
			srcFileReader.Close()
		}
	}
	fw, err := zw.Create("config.json")
	if err != nil {
		return nil, err
	}
	configBytes, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}
	_, err = fw.Write(configBytes)
	if err != nil {
		return nil, err
	}
	zw.Close()
	return result.Bytes(), nil
}

func (b *buildServiceImpl) GetBuildViewByChangelogSearchQuery(searchRequest view.ChangelogBuildSearchRequest) (*view.BuildView, error) {
	searchQuery := entity.ChangelogBuildSearchQueryEntity{
		PackageId:                searchRequest.PackageId,
		Version:                  searchRequest.Version,
		PreviousVersionPackageId: searchRequest.PreviousVersionPackageId,
		PreviousVersion:          searchRequest.PreviousVersion,
		BuildType:                searchRequest.BuildType,
		ComparisonRevision:       searchRequest.ComparisonRevision,
		ComparisonPrevRevision:   searchRequest.ComparisonPrevRevision,
	}

	buildEnt, err := b.buildRepository.GetBuildByChangelogSearchQuery(searchQuery)
	if err != nil {
		return nil, err
	}
	if buildEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.BuildNotFoundByQuery,
			Message: exception.BuildNotFoundByQueryMsg,
			Params:  map[string]interface{}{"query": searchRequest},
		}
	}
	result := entity.MakeBuildView(buildEnt)
	return result, nil
}

func (b *buildServiceImpl) GetBuildViewByDocumentGroupSearchQuery(searchRequest view.DocumentGroupBuildSearchRequest) (*view.BuildView, error) {
	searchQuery := entity.DocumentGroupBuildSearchQueryEntity{
		PackageId: searchRequest.PackageId,
		Version:   searchRequest.Version,
		BuildType: searchRequest.BuildType,
		Format:    searchRequest.Format,
		ApiType:   searchRequest.ApiType,
		GroupName: searchRequest.GroupName,
	}

	buildEnt, err := b.buildRepository.GetBuildByDocumentGroupSearchQuery(searchQuery)
	if err != nil {
		return nil, err
	}
	if buildEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.BuildNotFoundByQuery,
			Message: exception.BuildNotFoundByQueryMsg,
			Params:  map[string]interface{}{"query": searchRequest},
		}
	}
	result := entity.MakeBuildView(buildEnt)
	return result, nil
}

func (b *buildServiceImpl) ValidateBuildOwnership(buildId string, builderId string) error {
	buildEnt, err := b.buildRepository.GetBuild(buildId)
	if err != nil {
		return err
	}
	if buildEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.BuildNotFoundById,
			Message: exception.BuildNotFoundByIdMsg,
			Params:  map[string]interface{}{"id": buildId},
		}
	}

	if buildEnt.BuilderId != builderId {
		return &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.BuildNotOwned,
			Message: exception.BuildNotOwnedMsg,
			Params:  map[string]interface{}{"buildId": buildId},
		}
	}
	return nil
}

func (b *buildServiceImpl) AwaitBuildCompletion(buildId string) error {
	start := time.Now()
	for {
		build, err := b.buildRepository.GetBuild(buildId)
		if err != nil {
			return fmt.Errorf("failed to get build status: %v", err.Error())
		}
		if build.Status == string(view.StatusError) {
			return fmt.Errorf("build failed with error: %v", build.Details)
		}
		if build.Status == string(view.StatusComplete) {
			return nil
		}
		if time.Since(start) > time.Minute*10 {
			return fmt.Errorf("deadline exceeded")
		}
		time.Sleep(time.Second * 5)
	}
}

func (b *buildServiceImpl) GetBuild(buildId string) (*view.BuildView, error) {
	build, err := b.buildRepository.GetBuild(buildId)
	if err != nil {
		return nil, err
	}
	if build == nil {
		return nil, nil
	}
	result := entity.MakeBuildView(build)
	return result, nil
}
