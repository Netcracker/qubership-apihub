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
	GetVersionSources(packageId string, versionName string) ([]byte, error)
	GetPublishedVersionSourceDataConfig(packageId string, versionName string) (*view.PublishedVersionSourceDataConfig, error)
	GetPublishedVersionBuildConfig(packageId string, versionName string) (*view.BuildConfig, error)
	GetLatestContentDataBySlug(packageId string, versionName string, slug string) (*view.PublishedContent, *view.ContentData, error)
	VersionPublished(packageId string, versionName string) (bool, error)
	DeleteVersion(ctx context.SecurityContext, packageId string, versionName string) error

	PublishPackage(buildArc *archive.BuildResultArchive, buildSrcEnt *entity.BuildSourceEntity,
		buildConfig *view.BuildConfig, existingPackage *entity.PackageEntity) error
	PublishChanges(buildArc *archive.BuildResultArchive, publishId string) error

	GetVersionInternalDocuments(packageId string, version string) ([]view.InternalDocument, error)
	GetVersionInternalDocumentData(hash string) ([]byte, string, error)
	GetComparisonInternalDocuments(packageId string, version string, previousPackageId string, previousVersion string, refPackageId string) ([]view.InternalDocument, error)
	GetComparisonInternalDocumentData(hash string) ([]byte, string, error)
}

func NewPublishedService(versionRepo repository.PublishedRepository,
	buildRepository repository.BuildRepository,
	favoritesRepo repository.FavoritesRepository,
	operationRepo repository.OperationRepository,
	atService ActivityTrackingService,
	monitoringService MonitoringService,
	minioStorageService MinioStorageService,
	systemInfoService SystemInfoService,
	publishNotificationService PublishNotificationService) PublishedService {
	return &publishedServiceImpl{
		publishedRepo:              versionRepo,
		buildRepository:            buildRepository,
		favoritesRepo:              favoritesRepo,
		operationRepo:              operationRepo,
		atService:                  atService,
		monitoringService:          monitoringService,
		minioStorageService:        minioStorageService,
		systemInfoService:          systemInfoService,
		publishedValidator:         validation.NewPublishedValidator(versionRepo),
		publishNotificationService: publishNotificationService,
	}
}

type publishedServiceImpl struct {
	publishedRepo              repository.PublishedRepository
	buildRepository            repository.BuildRepository
	favoritesRepo              repository.FavoritesRepository
	operationRepo              repository.OperationRepository
	atService                  ActivityTrackingService
	monitoringService          MonitoringService
	minioStorageService        MinioStorageService
	systemInfoService          SystemInfoService
	publishedValidator         validation.PublishedValidator
	publishNotificationService PublishNotificationService
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
	releasedRevisionsDeleted, err := p.publishedRepo.MarkVersionDeleted(packageId, versionName, ctx.GetUserId())
	if err != nil {
		return err
	}
	if releasedRevisionsDeleted > 0 {
		for i := 0; i < releasedRevisionsDeleted; i++ {
			p.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.ReleaseVersionsDeleted, packageId)
		}
	}
	return nil
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
	err = buildArc.ReadVersionInternalDocuments(false)
	if err != nil {
		return err
	}
	err = buildArc.ReadComparisonInternalDocuments(false)
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

	operationEntities, operationDataEntities, operationSearchTexts, operationsInfo, err := buildArcEntitiesReader.ReadOperationsToEntities()
	if err != nil {
		return err
	}

	operationsComparisonEntities, changedOperationEntities, versionComparisonsFromCache, comparisonFileIdToKeyMap, err := buildArcEntitiesReader.ReadOperationComparisonsToEntities(operationsInfo, p.operationRepo)
	if err != nil {
		return err
	}

	builderNotificationsEntities := buildArcEntitiesReader.ReadBuilderNotificationsToEntities(buildSrcEnt.BuildId)

	versionInternalDocEntities, versionInternalDocDataEntities, err := buildArcEntitiesReader.ReadVersionInternalDocumentsToEntities()
	if err != nil {
		return err
	}

	comparisonInternalDocEntities, comparisonInternalDocDataEntities, err := buildArcEntitiesReader.ReadComparisonInternalDocumentsToEntities(comparisonFileIdToKeyMap)
	if err != nil {
		return err
	}

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
	if buildArc.PackageInfo.MigrationBuild {
		versionMetadata.SetMigrationId(buildArc.PackageInfo.MigrationId)
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
		versionInternalDocEntities,
		versionInternalDocDataEntities,
		comparisonInternalDocEntities,
		comparisonInternalDocDataEntities,
		operationSearchTexts,
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

		err = p.publishNotificationService.SendNotification(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
		if err != nil {
			log.Errorf("failed to send published version notification: %v", err)
		}
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
		previousVersionPackageId := version.PreviousVersionPackageId
		if previousVersionPackageId == "" {
			previousVersionPackageId = version.PackageId
		}
		buildConfig = view.BuildConfig{
			PackageId:                version.PackageId,
			Version:                  fmt.Sprintf("%v@%v", version.Version, version.Revision),
			PreviousVersion:          fmt.Sprintf("%v@%v", packageInfo.Version, packageInfo.Revision),
			PreviousVersionPackageId: previousVersionPackageId,
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
	err = buildArc.ReadComparisonInternalDocuments(false)
	if err != nil {
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
	versionComparisonEntities, operationComparisonEntities, versionComparisonsFromCache, comparisonFileIdToKeyMap, err := buildArcEntitiesReader.ReadOperationComparisonsToEntities(nil, p.operationRepo)
	if err != nil {
		return err
	}
	comparisonInternalDocEntities, comparisonInternalDocDataEntities, err := buildArcEntitiesReader.ReadComparisonInternalDocumentsToEntities(comparisonFileIdToKeyMap)
	if err != nil {
		return err
	}

	err = p.publishedRepo.SaveVersionChanges(buildArc.PackageInfo, publishId, operationComparisonEntities, versionComparisonEntities, versionComparisonsFromCache, comparisonInternalDocEntities, comparisonInternalDocDataEntities)
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

func (p publishedServiceImpl) GetVersionInternalDocuments(packageId string, versionName string) ([]view.InternalDocument, error) {
	versionEnt, err := p.publishedRepo.GetVersion(packageId, versionName)
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

	docs, err := p.publishedRepo.GetVersionInternalDocuments(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}

	result := make([]view.InternalDocument, 0, len(docs))
	for _, doc := range docs {
		result = append(result, *entity.MakeVersionInternalDocumentView(&doc))
	}

	return result, nil
}

func (p publishedServiceImpl) GetVersionInternalDocumentData(hash string) ([]byte, string, error) {
	docData, err := p.publishedRepo.GetVersionInternalDocumentData(hash)
	if err != nil {
		return nil, "", err
	}

	//when the filename is empty, it means we did not find a record in the version_internal_document table using the specified hash,
	//i.e., we are dealing with unref data, and we should not return such data
	if docData == nil || docData.Filename == "" {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.VersionInternalDocumentNotFound,
			Message: exception.VersionInternalDocumentNotFoundMsg,
			Params:  map[string]interface{}{"hash": hash},
		}
	}

	return docData.Data, docData.Filename, nil
}

func (p publishedServiceImpl) GetComparisonInternalDocuments(packageId string, version string, previousPackageId string, previousVersion string, refPackageId string) ([]view.InternalDocument, error) {
	versionEnt, err := p.publishedRepo.GetVersion(packageId, version)
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

	if previousVersion == "" || previousPackageId == "" {
		if versionEnt.PreviousVersion == "" {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.NoPreviousVersion,
				Message: exception.NoPreviousVersionMsg,
				Params:  map[string]interface{}{"version": version},
			}
		}
		previousVersion = versionEnt.PreviousVersion
		if versionEnt.PreviousVersionPackageId != "" {
			previousPackageId = versionEnt.PreviousVersionPackageId
		} else {
			previousPackageId = packageId
		}
	}
	previousVersionEnt, err := p.publishedRepo.GetVersion(previousPackageId, previousVersion)
	if err != nil {
		return nil, err
	}
	if previousVersionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": previousVersion, "packageId": previousPackageId},
		}
	}

	comparisonId := view.MakeVersionComparisonId(
		versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
		previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision,
	)

	versionComparison, err := p.publishedRepo.GetVersionComparison(comparisonId)
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

	var comparisons []entity.VersionComparisonEntity
	if len(versionComparison.Refs) > 0 {
		refsComparisons, err := p.publishedRepo.GetVersionRefsComparisons(comparisonId)
		if err != nil {
			return nil, err
		}
		if refPackageId != "" {
			for _, comparison := range refsComparisons {
				if refPackageId == comparison.PackageId || refPackageId == comparison.PreviousPackageId {
					comparisons = append(comparisons, comparison)
				}
			}
		} else {
			comparisons = append(comparisons, refsComparisons...)
		}
	} else {
		comparisons = append(comparisons, *versionComparison)
	}

	docs, err := p.publishedRepo.GetComparisonInternalDocumentsByComparisons(comparisons)
	if err != nil {
		return nil, err
	}

	result := make([]view.InternalDocument, 0, len(docs))
	for _, doc := range docs {
		result = append(result, *entity.MakeComparisonInternalDocumentView(&doc))
	}

	return result, nil
}

func (p publishedServiceImpl) GetComparisonInternalDocumentData(hash string) ([]byte, string, error) {
	docData, err := p.publishedRepo.GetComparisonInternalDocumentData(hash)
	if err != nil {
		return nil, "", err
	}

	//when the filename is empty, it means we did not find a record in the comparison_internal_document table using the specified hash,
	//i.e., we are dealing with unref data, and we should not return such data
	if docData == nil || docData.Filename == "" {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ComparisonInternalDocumentNotFound,
			Message: exception.ComparisonInternalDocumentNotFoundMsg,
			Params:  map[string]interface{}{"hash": hash},
		}
	}

	return docData.Data, docData.Filename, nil
}
