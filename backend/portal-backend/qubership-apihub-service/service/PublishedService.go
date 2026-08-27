package service

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/google/uuid"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/archive"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/validation"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type PublishedService interface {
	GetVersionSources(ctx context.Context, packageId string, versionName string) ([]byte, error)
	GetPublishedVersionSourceDataConfig(ctx context.Context, packageId string, versionName string) (*view.PublishedVersionSourceDataConfig, error)
	GetPublishedVersionBuildConfig(ctx context.Context, packageId string, versionName string) (*view.BuildConfig, error)
	GetLatestContentDataBySlug(ctx context.Context, packageId string, versionName string, slug string) (*view.PublishedContent, *view.ContentData, error)
	VersionPublished(ctx context.Context, packageId string, versionName string) (bool, error)
	DeleteVersion(ctx context.Context, packageId string, versionName string) error
	GetVersionStatus(ctx context.Context, packageId string, versionName string) (status string, found bool, err error)
	CheckNoReleaseDependentVersions(ctx context.Context, packageId string, version string) error

	PublishPackage(ctx context.Context, buildArc *archive.BuildResultArchive, buildSrcEnt *entity.BuildSourceEntity,
		buildConfig *view.BuildConfig, existingPackage *entity.PackageEntity) error
	PublishChanges(ctx context.Context, buildArc *archive.BuildResultArchive, publishId string) error

	GetVersionInternalDocuments(ctx context.Context, packageId string, version string) ([]view.InternalDocument, error)
	GetVersionInternalDocumentData(ctx context.Context, hash string) ([]byte, string, error)
	GetComparisonInternalDocuments(ctx context.Context, packageId string, version string, previousPackageId string, previousVersion string, refPackageId string) ([]view.InternalDocument, error)
	GetComparisonInternalDocumentData(ctx context.Context, hash string) ([]byte, string, error)

	ReplaceVersionSources(ctx context.Context, packageId string, versionName string, zipData []byte) error

	CheckPreviousVersionDependencyCycle(ctx context.Context, packageID string, version string, previousVersionPackageID string, prevVersion string, revision int) (bool, error)
}

func NewPublishedService(versionRepo repository.PublishedRepository,
	buildRepository repository.BuildRepository,
	favoritesRepo repository.FavoritesRepository,
	operationRepo repository.OperationRepository,
	ddlContractRepo repository.DDLContractRepository,
	atService ActivityTrackingService,
	monitoringService MonitoringService,
	minioStorageService MinioStorageService,
	systemInfoService SystemInfoService,
	publishNotificationService PublishNotificationService,
	roleService RoleService) PublishedService {
	return &publishedServiceImpl{
		publishedRepo:              versionRepo,
		buildRepository:            buildRepository,
		favoritesRepo:              favoritesRepo,
		operationRepo:              operationRepo,
		ddlContractRepo:            ddlContractRepo,
		atService:                  atService,
		monitoringService:          monitoringService,
		minioStorageService:        minioStorageService,
		systemInfoService:          systemInfoService,
		publishedValidator:         validation.NewPublishedValidator(versionRepo),
		publishNotificationService: publishNotificationService,
		roleService:                roleService,
	}
}

type publishedServiceImpl struct {
	publishedRepo              repository.PublishedRepository
	buildRepository            repository.BuildRepository
	favoritesRepo              repository.FavoritesRepository
	operationRepo              repository.OperationRepository
	ddlContractRepo            repository.DDLContractRepository
	atService                  ActivityTrackingService
	monitoringService          MonitoringService
	minioStorageService        MinioStorageService
	systemInfoService          SystemInfoService
	publishedValidator         validation.PublishedValidator
	publishNotificationService PublishNotificationService
	roleService                RoleService
}

func (p publishedServiceImpl) GetVersionSources(ctx context.Context, packageId string, versionName string) ([]byte, error) {
	version, err := p.publishedRepo.GetVersion(ctx, packageId, versionName)
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
		publishedSrc, err := p.publishedRepo.GetPublishedSources(ctx, packageId, version.Version, version.Revision)
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
			file, err := p.minioStorageService.GetFile(ctx, view.PUBLISHED_SOURCES_ARCHIVES_TABLE, publishedSrc.ArchiveChecksum)
			if err != nil {
				return nil, err
			}
			srcArchive = file
		}
	} else {
		srcData, err := p.publishedRepo.GetVersionSources(ctx, packageId, version.Version, version.Revision)
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

func (p publishedServiceImpl) GetPublishedVersionSourceDataConfig(ctx context.Context, packageId string, versionName string) (*view.PublishedVersionSourceDataConfig, error) {
	version, err := p.publishedRepo.GetVersion(ctx, packageId, versionName)
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
		publishedSrc, err := p.publishedRepo.GetPublishedSources(ctx, packageId, version.Version, version.Revision)
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
			src, err := p.minioStorageService.GetFile(ctx, view.PUBLISHED_SOURCES_ARCHIVES_TABLE, publishedSrc.ArchiveChecksum)
			if err != nil {
				return nil, err
			}
			srcData.Data = src
		}
	} else {
		srcData, err = p.publishedRepo.GetPublishedVersionSourceDataConfig(ctx, packageId, version.Version, version.Revision)
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

func (p publishedServiceImpl) GetPublishedVersionBuildConfig(ctx context.Context, packageId string, versionName string) (*view.BuildConfig, error) {
	version, err := p.publishedRepo.GetVersion(ctx, packageId, versionName)
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
	publishedSrc, err := p.publishedRepo.GetPublishedSources(ctx, packageId, version.Version, version.Revision)
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

func (p publishedServiceImpl) GetLatestContentDataBySlug(ctx context.Context, packageId string, versionName string, slug string) (*view.PublishedContent, *view.ContentData, error) {
	ent, err := p.publishedRepo.GetVersion(ctx, packageId, versionName)
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

	content, err := p.publishedRepo.GetLatestContentBySlug(ctx, packageId, versionName, slug)
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

	pce, err := p.publishedRepo.GetContentData(ctx, packageId, content.Checksum)
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

func (p publishedServiceImpl) VersionPublished(ctx context.Context, packageId string, versionName string) (bool, error) {
	ent, err := p.publishedRepo.GetVersionIncludingDeleted(ctx, packageId, versionName)
	if err != nil {
		return false, err
	}
	return ent != nil, nil
}

func (p publishedServiceImpl) GetVersionStatus(ctx context.Context, packageId string, versionName string) (string, bool, error) {
	version, _, err := SplitVersionRevision(versionName)
	if err != nil {
		return "", false, err
	}

	latestEnt, err := p.publishedRepo.GetVersion(ctx, packageId, version)
	if err != nil {
		return "", false, err
	}
	if latestEnt == nil {
		return "", false, nil
	}
	return latestEnt.Status, true, nil
}

func (p publishedServiceImpl) CheckNoReleaseDependentVersions(ctx context.Context, packageId string, version string) error {
	dependents, err := p.publishedRepo.GetVersionsByPreviousVersion(ctx, packageId, version)
	if err != nil {
		return err
	}
	releaseDependents := make([]entity.PublishedVersionKeyEntity, 0)
	for _, dependent := range dependents {
		if dependent.Status == string(view.Release) {
			releaseDependents = append(releaseDependents, entity.PublishedVersionKeyEntity{
				PackageId: dependent.PackageId,
				Version:   dependent.Version,
				Revision:  dependent.Revision,
			})
		}
	}
	if len(releaseDependents) > 0 {
		accessible, hiddenCount, err := p.roleService.FilterVersionsByPackageReadAccess(ctx, releaseDependents)
		if err != nil {
			return err
		}
		log.Warnf("Blocked changing version %s of package %s to 'draft' status by user %s: referenced as a previous version by release versions %s",
			version, packageId, secctx.GetUserId(ctx), entity.FormatVersionKeys(releaseDependents))
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidReleaseVersionChain,
			Message: exception.VersionReferencedAsPreviousByReleaseMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId, "releaseVersions": entity.FormatVersionKeysWithHidden(accessible, hiddenCount, "'release' package version")},
		}
	}
	return nil
}

func readZipFile(zf *zip.File) ([]byte, error) {
	f, err := zf.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return ioutil.ReadAll(f)
}

func (p publishedServiceImpl) DeleteVersion(ctx context.Context, packageId string, versionName string) error {
	releasedRevisionsDeleted, err := p.publishedRepo.MarkVersionDeleted(ctx, packageId, versionName, secctx.GetUserId(ctx))
	if err != nil {
		return err
	}
	if releasedRevisionsDeleted > 0 {
		for i := 0; i < releasedRevisionsDeleted; i++ {
			p.monitoringService.IncreaseBusinessMetricCounter(secctx.GetUserId(ctx), metrics.ReleaseVersionsDeleted, packageId)
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

func (p publishedServiceImpl) PublishPackage(ctx context.Context, buildArc *archive.BuildResultArchive, buildSrcEnt *entity.BuildSourceEntity,
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
	err = buildArc.ReadPackageDdlContracts(false)
	if err != nil {
		return err
	}
	err = buildArc.ReadPackageDdlContractComparisons(false)
	if err != nil {
		return err
	}
	err = buildArc.ReadPackageMcpContracts(false)
	if err != nil {
		return err
	}
	utils.PerfLog(time.Since(start).Milliseconds(), 400, "publishPackage: zip files read")

	start = time.Now()
	if err = p.publishedValidator.ValidatePackage(ctx, buildArc, buildConfig); err != nil {
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
		storedVersion, err := p.publishedRepo.GetVersionIncludingDeleted(ctx, buildArc.PackageInfo.PackageId, buildArc.PackageInfo.Version)
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
			previousVersionEnt, err := p.publishedRepo.GetVersionIncludingDeleted(ctx, previousVersionPackageId, buildArc.PackageInfo.PreviousVersion)
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

	refEntities, err := p.makePublishedReferencesEntities(ctx, buildArc.PackageInfo, buildArc.PackageInfo.Refs)
	if err != nil {
		return err
	}

	buildArcEntitiesReader := archive.NewBuildResultToEntitiesReader(buildArc)

	fileEntities, fileDataEntities, err := buildArcEntitiesReader.ReadDocumentsToEntities()
	if err != nil {
		return err
	}

	if !buildArc.PackageInfo.MigrationBuild {
		isFirstRevision := buildArc.PackageInfo.Revision == 1

		if isFirstRevision {
			if buildArc.PackageInfo.PreviousVersion != "" {
				prevPkgId := buildArc.PackageInfo.PackageId
				if buildArc.PackageInfo.PreviousVersionPackageId != "" {
					prevPkgId = buildArc.PackageInfo.PreviousVersionPackageId
				}
				prevContent, prevErr := p.publishedRepo.GetRevisionContent(ctx, prevPkgId, buildArc.PackageInfo.PreviousVersion, previousVersionRevision)
				if prevErr != nil {
					return prevErr
				}
				propagateShareability(fileEntities, prevContent)
			}
		} else {
			prevRevisionContent, prevRevErr := p.publishedRepo.GetRevisionContent(ctx,
				buildArc.PackageInfo.PackageId,
				buildArc.PackageInfo.Version,
				buildArc.PackageInfo.Revision-1,
			)
			if prevRevErr != nil {
				return prevRevErr
			}

			if hasNonUnknownShareability(prevRevisionContent) {
				propagateShareability(fileEntities, prevRevisionContent)
			} else if buildArc.PackageInfo.PreviousVersion != "" {
				prevPkgId := buildArc.PackageInfo.PackageId
				if buildArc.PackageInfo.PreviousVersionPackageId != "" {
					prevPkgId = buildArc.PackageInfo.PreviousVersionPackageId
				}
				prevContent, prevErr := p.publishedRepo.GetRevisionContent(ctx, prevPkgId, buildArc.PackageInfo.PreviousVersion, previousVersionRevision)
				if prevErr != nil {
					return prevErr
				}
				propagateShareability(fileEntities, prevContent)
			}
		}
	}

	operationEntities, operationDataEntities, operationSearchTexts, operationsInfo, err := buildArcEntitiesReader.ReadOperationsToEntities()
	if err != nil {
		return err
	}

	operationsComparisonEntities, changedOperationEntities, versionComparisonsFromCache, comparisonFileIdToKeyMap, err := buildArcEntitiesReader.ReadOperationComparisonsToEntities(ctx, operationsInfo, p.operationRepo)
	if err != nil {
		return err
	}

	ddlContractEntities, ddlContractDataEntities, ddlContractSearchTexts, err := buildArcEntitiesReader.ReadDdlContractsToEntities()
	if err != nil {
		return err
	}

	// The build result's DDL comparison entries do not carry data hashes, so provide the data hashes
	// of the version being published. ddl_comparison rows for other versions are resolved from the DB.
	publishingDdlDataHashes := make(map[string]string, len(ddlContractEntities))
	for _, ddlContractEntity := range ddlContractEntities {
		if ddlContractEntity.DataHash != nil {
			publishingDdlDataHashes[ddlContractEntity.DdlEntityId] = *ddlContractEntity.DataHash
		}
	}

	// DDL comparisons share version_comparison with REST. Read the DDL index/per-pair files, then
	// merge the version-comparison rows by comparison_id (REST + DDL contractTypes on the same row;
	// DDL-only pairs are appended so the ddl_comparison FK is satisfied for pure DDL changelogs).
	ddlVersionComparisonEntities, ddlContractComparisonEntities, ddlComparisonsFromCache, ddlComparisonFileIdToKeyMap, err := buildArcEntitiesReader.ReadDdlContractComparisonsToEntities(ctx, publishingDdlDataHashes, p.ddlContractRepo)
	if err != nil {
		return err
	}
	// A comparison id only ever appears in these lists when it was actually rebuilt (not served from
	// cache) on that side, so they double as the rebuild sets saveVersionChangesTx/saveDdlComparisonsTx
	// scope their operation_types/contract_types writes to.
	operationComparisonIdsToRebuild := comparisonIds(operationsComparisonEntities)
	ddlComparisonIdsToRebuild := comparisonIds(ddlVersionComparisonEntities)
	operationsComparisonEntities = mergeVersionComparisons(operationsComparisonEntities, ddlVersionComparisonEntities)
	// migration re-validation treats a comparison id as legitimately absent from the build archive
	// only if it appears here, so the DDL-side cache hits must be included, not just the operation side.
	versionComparisonsFromCache = mergeUniqueStrings(versionComparisonsFromCache, ddlComparisonsFromCache)
	for fileId, key := range ddlComparisonFileIdToKeyMap {
		if _, ok := comparisonFileIdToKeyMap[fileId]; !ok {
			comparisonFileIdToKeyMap[fileId] = key
		}
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

	mcpContractEntities, mcpContractDataEntities, mcpContractSearchTexts, err := buildArcEntitiesReader.ReadMcpContractsToEntities()
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
		err = p.minioStorageService.UploadFile(ctx, view.PUBLISHED_SOURCES_ARCHIVES_TABLE, archiveCSStr, buildSrcEnt.Source)
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
	if buildArc.PackageInfo.PreviousVersionBuilderVersion != "" {
		versionMetadata.SetPreviousVersionBuilderVersion(buildArc.PackageInfo.PreviousVersionBuilderVersion)
	}
	if buildArc.PackageInfo.CurrentVersionBuilderVersion != "" {
		versionMetadata.SetCurrentVersionBuilderVersion(buildArc.PackageInfo.CurrentVersionBuilderVersion)
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
			serviceOwner, err := p.publishedRepo.GetServiceOwner(ctx, utils.GetPackageWorkspaceId(existingPackage.Id), buildConfig.ServiceName)
			if err != nil {
				return fmt.Errorf("failed to check service owner: %w", err)
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
		ctx,
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
		operationComparisonIdsToRebuild,
		ddlComparisonIdsToRebuild,
		versionInternalDocEntities,
		versionInternalDocDataEntities,
		comparisonInternalDocEntities,
		comparisonInternalDocDataEntities,
		operationSearchTexts,
		ddlContractEntities,
		ddlContractDataEntities,
		ddlContractSearchTexts,
		ddlContractComparisonEntities,
		mcpContractEntities,
		mcpContractDataEntities,
		mcpContractSearchTexts,
	)
	utils.PerfLog(time.Since(start).Milliseconds(), 15000, "publishPackage: CreateVersionWithData")
	if err != nil {
		return err
	}

	log.Debugf("Version creation time: %v", time.Since(versionCreationStart).Milliseconds())

	start = time.Now()
	//todo move this recalculation inside publish method to run in the same transaction (after publish method redesign)
	err = p.publishedRepo.RecalculateOperationGroups(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, view.MakePackageGroupingPrefixRegex(existingPackage.RestGroupingPrefix), versionEnt.CreatedBy)
	if err != nil {
		log.Errorf("failed to calculate operations groups for version: %+v: %v", versionEnt, err.Error())
	}
	utils.PerfLog(time.Since(start).Milliseconds(), 50, "publishPackage: operations groups calculation")

	if !buildArc.PackageInfo.MigrationBuild {
		if versionEnt.Status == string(view.Release) {
			p.monitoringService.IncreaseBusinessMetricCounter(buildArc.PackageInfo.CreatedBy, metrics.ReleaseVersionsPublished, versionEnt.PackageId)
		}
		err = p.reCalculateChangelogs(ctx, buildArc.PackageInfo)
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

		p.atService.TrackEvent(ctx, view.ActivityTrackingEvent{
			Type:      eventType,
			Data:      dataMap,
			PackageId: versionEnt.PackageId,
			Date:      time.Now(),
			UserId:    versionEnt.CreatedBy,
		})

		err = p.publishNotificationService.SendNotification(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
		if err != nil {
			log.Errorf("failed to send published version notification: %v", err)
		}
	}

	utils.PerfLog(time.Since(publishStart).Milliseconds(), 10000, "publishPackage: total package publishing")
	return nil
}

func propagateShareability(targets []*entity.PublishedContentEntity, source []entity.PublishedContentEntity) {
	sourceMap := make(map[string]string, len(source))
	for _, s := range source {
		sourceMap[s.Slug] = s.Shareability
	}
	for _, t := range targets {
		if shareability, exists := sourceMap[t.Slug]; exists {
			t.Shareability = shareability
		}
	}
}

func hasNonUnknownShareability(content []entity.PublishedContentEntity) bool {
	for _, c := range content {
		if c.Shareability != view.ShareabilityUnknown {
			return true
		}
	}
	return false
}

func (p publishedServiceImpl) makePublishedReferencesEntities(ctx context.Context, packageInfo view.PackageInfoFile, packageRefs []view.BCRef) ([]*entity.PublishedReferenceEntity, error) {
	uniqueRefs := make(map[string]struct{}, 0)
	publishedReferences := make([]*entity.PublishedReferenceEntity, 0)
	for _, ref := range packageRefs {
		refVersion, err := p.publishedRepo.GetVersionIncludingDeleted(ctx, ref.RefId, ref.Version)
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
			parentRefVersion, err := p.publishedRepo.GetVersionIncludingDeleted(ctx, ref.ParentRefId, ref.ParentVersion)
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

// mergeVersionComparisons combines the operation and DDL version_comparison rows of one build by
// comparison_id so a single row carries both operation and contract types. DDL-only pairs are
// appended so the ddl_comparison FK is satisfied for pure DDL changelogs.
func mergeVersionComparisons(operationComparisons []*entity.VersionComparisonEntity, ddlComparisons []*entity.VersionComparisonEntity) []*entity.VersionComparisonEntity {
	versionComparisonByComparisonId := make(map[string]*entity.VersionComparisonEntity, len(operationComparisons))
	for _, comparison := range operationComparisons {
		versionComparisonByComparisonId[comparison.ComparisonId] = comparison
	}
	for _, ddlComparison := range ddlComparisons {
		if existing, exists := versionComparisonByComparisonId[ddlComparison.ComparisonId]; exists {
			existing.ContractTypes = ddlComparison.ContractTypes
			// A dashboard can reference a package with only operation changes and another with only
			// DDL changes; each side's reader only records refs for the comparisons it produced, so
			// the merged row must carry both, or the DDL-only referenced comparison is never fetched.
			existing.Refs = mergeUniqueStrings(existing.Refs, ddlComparison.Refs)
		} else {
			operationComparisons = append(operationComparisons, ddlComparison)
			versionComparisonByComparisonId[ddlComparison.ComparisonId] = ddlComparison
		}
	}
	return operationComparisons
}

// mergeUniqueStrings unions two string lists, preserving order and dropping duplicates.
func mergeUniqueStrings(a []string, b []string) []string {
	seen := make(map[string]struct{}, len(a)+len(b))
	merged := make([]string, 0, len(a)+len(b))
	for _, list := range [][]string{a, b} {
		for _, s := range list {
			if _, ok := seen[s]; ok {
				continue
			}
			seen[s] = struct{}{}
			merged = append(merged, s)
		}
	}
	return merged
}

// comparisonIds returns the ComparisonId of every entity in the list. A comparison id only appears
// in a Read*ComparisonsToEntities result when it was not served from cache, so this list doubles as
// "which comparison ids were rebuilt on this side this publish".
func comparisonIds(comparisons []*entity.VersionComparisonEntity) []string {
	ids := make([]string, 0, len(comparisons))
	for _, comparison := range comparisons {
		ids = append(ids, comparison.ComparisonId)
	}
	return ids
}

func (p publishedServiceImpl) reCalculateChangelogs(ctx context.Context, packageInfo view.PackageInfoFile) error {
	versions, err := p.publishedRepo.GetVersionsByPreviousVersion(ctx, packageInfo.PackageId, packageInfo.Version)
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
		err := p.createChangelogBuild(ctx, buildConfig)
		if err != nil {
			return err
		}
	}
	return nil
}

func (p publishedServiceImpl) PublishChanges(ctx context.Context, buildArc *archive.BuildResultArchive, publishId string) error {
	var err error
	if err = buildArc.ReadPackageComparisons(false); err != nil {
		return err
	}
	err = buildArc.ReadComparisonInternalDocuments(false)
	if err != nil {
		return err
	}
	if err = buildArc.ReadPackageDdlContractComparisons(false); err != nil {
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
	if err := p.publishedValidator.ValidateChanges(ctx, buildArc); err != nil {
		return err
	}
	if len(buildArc.PackageComparisons.Comparisons) == 0 && len(buildArc.PackageDdlComparisons.Comparisons) == 0 {
		return nil
	}

	buildArcEntitiesReader := archive.NewBuildResultToEntitiesReader(buildArc)
	versionComparisonEntities, operationComparisonEntities, versionComparisonsFromCache, comparisonFileIdToKeyMap, err := buildArcEntitiesReader.ReadOperationComparisonsToEntities(ctx, nil, p.operationRepo)
	if err != nil {
		return err
	}

	// DDL comparisons share version_comparison with REST but are read from a separate index. A changelog
	// build compares two already published versions, so the current version's DDL data hashes come from
	// the DB (the build result carries no version DDL entities for a changelog build). Merge the DDL
	// version-comparison rows into the REST rows by comparison_id so a single version_comparison row
	// carries both contract types; DDL-only pairs are appended so the ddl_comparison FK is satisfied.
	var ddlVersionComparisonEntities []*entity.VersionComparisonEntity
	var ddlContractComparisonEntities []*entity.DDLContractComparisonEntity
	if len(buildArc.PackageDdlComparisons.Comparisons) > 0 {
		currentDdlDataHashes, ddlErr := p.ddlContractRepo.GetDdlEntitiesInfo(ctx, buildArc.PackageInfo.PackageId, buildArc.PackageInfo.Version, buildArc.PackageInfo.Revision)
		if ddlErr != nil {
			return ddlErr
		}
		var ddlComparisonsFromCache []string
		var ddlComparisonFileIdToKeyMap map[string]view.ComparisonKey
		ddlVersionComparisonEntities, ddlContractComparisonEntities, ddlComparisonsFromCache, ddlComparisonFileIdToKeyMap, err = buildArcEntitiesReader.ReadDdlContractComparisonsToEntities(ctx, currentDdlDataHashes, p.ddlContractRepo)
		if err != nil {
			return err
		}
		// migration re-validation treats a comparison id as legitimately absent from the build archive
		// only if it appears here, so the DDL-side cache hits must be included, not just the operation side.
		versionComparisonsFromCache = mergeUniqueStrings(versionComparisonsFromCache, ddlComparisonsFromCache)
		for fileId, key := range ddlComparisonFileIdToKeyMap {
			if _, ok := comparisonFileIdToKeyMap[fileId]; !ok {
				comparisonFileIdToKeyMap[fileId] = key
			}
		}
	}
	operationComparisonIdsToRebuild := comparisonIds(versionComparisonEntities)
	ddlComparisonIdsToRebuild := comparisonIds(ddlVersionComparisonEntities)
	versionComparisonEntities = mergeVersionComparisons(versionComparisonEntities, ddlVersionComparisonEntities)

	comparisonInternalDocEntities, comparisonInternalDocDataEntities, err := buildArcEntitiesReader.ReadComparisonInternalDocumentsToEntities(comparisonFileIdToKeyMap)
	if err != nil {
		return err
	}

	err = p.publishedRepo.SaveVersionChanges(ctx, buildArc.PackageInfo, publishId, operationComparisonEntities, versionComparisonEntities, versionComparisonsFromCache, operationComparisonIdsToRebuild, ddlComparisonIdsToRebuild, comparisonInternalDocEntities, comparisonInternalDocDataEntities, ddlContractComparisonEntities)
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

func (p publishedServiceImpl) createChangelogBuild(ctx context.Context, config view.BuildConfig) error { //todo folder refactoring is needed. Use buildService.CreateChangelogBuild() after it
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

	err = p.buildRepository.StoreBuild(ctx, buildEnt, sourceEnt, nil)
	if err != nil {
		return err
	}
	return nil
}

func (p publishedServiceImpl) GetVersionInternalDocuments(ctx context.Context, packageId string, versionName string) ([]view.InternalDocument, error) {
	versionEnt, err := p.publishedRepo.GetVersion(ctx, packageId, versionName)
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

	docs, err := p.publishedRepo.GetVersionInternalDocuments(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}

	result := make([]view.InternalDocument, 0, len(docs))
	for _, doc := range docs {
		result = append(result, *entity.MakeVersionInternalDocumentView(&doc))
	}

	return result, nil
}

func (p publishedServiceImpl) GetVersionInternalDocumentData(ctx context.Context, hash string) ([]byte, string, error) {
	docData, err := p.publishedRepo.GetVersionInternalDocumentData(ctx, hash)
	if err != nil {
		return nil, "", err
	}

	if docData == nil {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.VersionInternalDocumentNotFound,
			Message: exception.VersionInternalDocumentNotFoundMsg,
			Params:  map[string]interface{}{"hash": hash},
		}
	}

	filename := fmt.Sprintf("version_internal_document_%s.json", hash)

	return docData.Data, filename, nil
}

func (p publishedServiceImpl) GetComparisonInternalDocuments(ctx context.Context, packageId string, version string, previousPackageId string, previousVersion string, refPackageId string) ([]view.InternalDocument, error) {
	versionEnt, err := p.publishedRepo.GetVersion(ctx, packageId, version)
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
	previousVersionEnt, err := p.publishedRepo.GetVersion(ctx, previousPackageId, previousVersion)
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

	versionComparison, err := p.publishedRepo.GetVersionComparison(ctx, comparisonId)
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
		refsComparisons, err := p.publishedRepo.GetVersionRefsComparisons(ctx, comparisonId)
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

	docs, err := p.publishedRepo.GetComparisonInternalDocumentsByComparisons(ctx, comparisons)
	if err != nil {
		return nil, err
	}

	result := make([]view.InternalDocument, 0, len(docs))
	for _, doc := range docs {
		result = append(result, *entity.MakeComparisonInternalDocumentView(&doc))
	}

	return result, nil
}

func (p publishedServiceImpl) GetComparisonInternalDocumentData(ctx context.Context, hash string) ([]byte, string, error) {
	docData, err := p.publishedRepo.GetComparisonInternalDocumentData(ctx, hash)
	if err != nil {
		return nil, "", err
	}

	if docData == nil {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ComparisonInternalDocumentNotFound,
			Message: exception.ComparisonInternalDocumentNotFoundMsg,
			Params:  map[string]interface{}{"hash": hash},
		}
	}

	filename := fmt.Sprintf("comparison_internal_document_%s.json", hash)

	return docData.Data, filename, nil
}

func (p publishedServiceImpl) CheckPreviousVersionDependencyCycle(ctx context.Context, packageID string, version string, previousVersionPackageID string, prevVersion string, revision int) (bool, error) {
	versionSearchQuery := entity.PublishedVersionSearchQueryEntity{
		PackageId: packageID,
		Limit:     100,
		Offset:    0,
	}
	var packageVersions []entity.PackageVersionRevisionEntity
	for {
		versionEnts, err := p.publishedRepo.GetReadonlyPackageVersionsWithLimit(ctx, versionSearchQuery, false, false)
		if err != nil {
			return false, err
		}
		packageVersions = append(packageVersions, versionEnts...)
		if len(versionEnts) < 100 {
			break
		}
		versionSearchQuery.Offset += 100
	}

	return detectPreviousVersionDependencyCycleWithCurrVersion(packageVersions, version, prevVersion, revision), nil
}

func detectPreviousVersionDependencyCycleWithCurrVersion(versionNodes []entity.PackageVersionRevisionEntity, version, prevVersion string, revision int) bool {
	if prevVersion == "" {
		return false
	}

	type versionNodeKey struct {
		version  string
		revision int
	}

	versionNodeMap := make(map[versionNodeKey]string, len(versionNodes))
	for _, n := range versionNodes {
		if n.PreviousVersion != "" {
			versionNodeMap[versionNodeKey{n.Version, n.Revision}] = n.PreviousVersion
		}
	}

	latestRevision := make(map[string]int)
	for _, n := range versionNodes {
		latestRevision[n.Version] = n.Revision
	}

	latestRevision[version] = revision
	visited := make(map[string]bool)
	stack := []string{prevVersion}

	for len(stack) > 0 {
		current := stack[len(stack)-1]
		stack = stack[:len(stack)-1]

		if current == version {
			return true
		}

		if visited[current] {
			continue
		}
		visited[current] = true

		latestRev, exists := latestRevision[current]
		if !exists {
			continue
		}

		prev, exists := versionNodeMap[versionNodeKey{current, latestRev}]
		if !exists {
			continue
		}

		stack = append(stack, prev)
	}

	return false
}

func (p publishedServiceImpl) ReplaceVersionSources(ctx context.Context, packageId string, versionName string, zipData []byte) error {
	versionEnt, err := p.publishedRepo.GetVersion(ctx, packageId, versionName)
	if err != nil {
		return err
	}
	if versionEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}
	version := versionEnt.Version
	revision := versionEnt.Revision

	existingSrc, err := p.publishedRepo.GetPublishedSources(ctx, packageId, version, revision)
	if err != nil {
		return err
	}
	if existingSrc == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedSourcesDataNotFound,
			Message: exception.PublishedSourcesDataNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId, "versionName": version},
		}
	}

	var buildConfig view.BuildConfig
	err = json.Unmarshal(existingSrc.Config, &buildConfig)
	if err != nil {
		return fmt.Errorf("failed to unmarshal build config from published sources: %v", err.Error())
	}

	zipReader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "request body (ZIP archive)"},
			Debug:   err.Error(),
		}
	}

	srcArc := archive.NewSourcesArchive(zipReader, &buildConfig)
	err = validation.ValidatePublishSources(srcArc)
	if err != nil {
		return err
	}

	archiveCS := sha512.Sum512(zipData)
	newChecksum := hex.EncodeToString(archiveCS[:])
	oldChecksum := existingSrc.ArchiveChecksum

	trackingEntity := &entity.SourcesUpdateTrackingEntity{
		Id:          uuid.New().String(),
		PackageId:   packageId,
		Version:     version,
		Revision:    revision,
		OldChecksum: oldChecksum,
		NewChecksum: newChecksum,
		PerformedBy: secctx.GetUserId(ctx),
		PerformedAt: time.Now(),
	}

	if p.systemInfoService.IsMinioStorageActive() && !p.systemInfoService.IsMinioStoreOnlyBuildResult() {
		err = p.minioStorageService.UploadFile(ctx, view.PUBLISHED_SOURCES_ARCHIVES_TABLE, newChecksum, zipData)
		if err != nil {
			return err
		}
		err = p.publishedRepo.UpdatePublishedSourcesChecksum(ctx, packageId, version, revision, newChecksum, trackingEntity)
		if err != nil {
			return err
		}
	} else {
		srcArchiveEntity := &entity.PublishedSrcArchiveEntity{
			Checksum: newChecksum,
			Data:     zipData,
		}
		err = p.publishedRepo.UpdatePublishedSourcesArchive(ctx, packageId, version, revision, newChecksum, srcArchiveEntity, trackingEntity)
		if err != nil {
			return err
		}
	}

	log.Infof("Replaced published sources for packageId=%s version=%s revision=%d oldChecksum=%s newChecksum=%s",
		packageId, version, revision, oldChecksum, newChecksum)
	return nil
}
