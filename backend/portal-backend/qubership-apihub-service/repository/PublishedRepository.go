package repository

import (
	"context"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type PublishedRepository interface {
	MarkVersionDeleted(ctx context.Context, packageId string, versionName string, userId string) (int, error)
	PatchVersion(ctx context.Context, packageId string, versionName string, status *string, versionLabels *[]string) (*entity.PublishedVersionEntity, error)
	GetVersion(ctx context.Context, packageId string, versionName string) (*entity.PublishedVersionEntity, error)
	GetReadonlyVersion(ctx context.Context, packageId string, versionName string, showOnlyDeleted bool) (*entity.PackageVersionRevisionEntity, error)
	GetVersionByRevision(ctx context.Context, packageId string, versionName string, revision int) (*entity.PublishedVersionEntity, error)
	GetVersionIncludingDeleted(ctx context.Context, packageId string, versionName string) (*entity.PublishedVersionEntity, error)
	GetServiceOwner(ctx context.Context, workspaceId string, serviceName string) (string, error)
	GetRichPackageVersion(ctx context.Context, packageId string, version string) (*entity.PackageVersionRichEntity, error)
	GetRevisionContent(ctx context.Context, packageId string, versionName string, revision int) ([]entity.PublishedContentEntity, error)
	GetRevisionContentWithLimit(ctx context.Context, packageId string, versionName string, revision int, skipRefs bool, searchQuery entity.PublishedContentSearchQueryEntity) ([]entity.PublishedContentEntity, error)
	GetVersionRevisionsList(ctx context.Context, searchQuery entity.PackageVersionSearchQueryEntity) ([]entity.PackageVersionRevisionEntity, error)
	GetLatestContentBySlug(ctx context.Context, packageId string, versionName string, slug string) (*entity.PublishedContentEntity, error)
	GetRevisionContentBySlug(ctx context.Context, packageId string, versionName string, slug string, revision int) (*entity.PublishedContentEntity, error)
	GetVersionDocumentErrorSummary(ctx context.Context, packageId string, versionName string, revision int, showOnlyDeleted bool) ([]entity.DocumentErrorSummaryEntity, error)
	GetVersionNotifications(ctx context.Context, packageId string, version string, revision int, filter view.NotificationsFilter) ([]entity.PublishedVersionNotificationEntity, error)
	GetComparisonNotifications(ctx context.Context, comparisonId string, filter view.NotificationsFilter) ([]entity.VersionComparisonNotificationEntity, error)
	GetVersionErrorSummary(ctx context.Context, packageId string, version string, revision int, showOnlyDeleted bool) (*entity.VersionErrorSummaryEntity, error)
	GetVersionsErrorSummary(ctx context.Context, versionKeys []entity.PublishedVersionKeyEntity, showOnlyDeleted bool) (map[entity.PublishedVersionKeyEntity]entity.VersionErrorSummaryEntity, error)

	GetVersionSources(ctx context.Context, packageId string, versionName string, revision int) (*entity.PublishedSrcArchiveEntity, error)
	GetPublishedVersionSourceDataConfig(ctx context.Context, packageId string, versionName string, revision int) (*entity.PublishedSrcDataConfigEntity, error)
	GetPublishedSources(ctx context.Context, packageId string, versionName string, revision int) (*entity.PublishedSrcEntity, error)

	CreateVersionWithData(ctx context.Context, packageInfo view.PackageInfoFile, publishId string, version *entity.PublishedVersionEntity, content []*entity.PublishedContentEntity,
		data []*entity.PublishedContentDataEntity, refs []*entity.PublishedReferenceEntity, src *entity.PublishedSrcEntity, srcArchive *entity.PublishedSrcArchiveEntity,
		operations []*entity.OperationEntity, operationsData []*entity.OperationDataEntity,
		operationComparisons []*entity.OperationComparisonEntity, versionNotifications []*entity.PublishedVersionNotificationEntity,
		comparisonNotifications []*entity.VersionComparisonNotificationEntity,
		versionComparisonEntities []*entity.VersionComparisonEntity, serviceName string, pkg *entity.PackageEntity, cachedComparisonIds map[string]struct{},
		versionInternalDocEntities []*entity.VersionInternalDocumentEntity, versionInternalDocDataEntities []*entity.VersionInternalDocumentDataEntity,
		comparisonInternalDocEntities []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocDataEntities []*entity.ComparisonInternalDocumentDataEntity,
		operationSearchTexts []*entity.OperationSearchTextEntity,
		ddlContractEntities []*entity.DDLContractEntity, ddlContractDataEntities []*entity.DDLContractDataEntity,
		ddlContractSearchTexts []*entity.DDLContractSearchTextEntity, ddlContractComparisonEntities []*entity.DDLContractComparisonEntity,
		mcpContractEntities []*entity.MCPContractEntity, mcpContractDataEntities []*entity.MCPContractDataEntity,
		mcpContractSearchTexts []*entity.MCPContractSearchTextEntity, buildErrorFlags view.BuildErrorFlags) error
	GetContentData(ctx context.Context, packageId string, checksum string) (*entity.PublishedContentDataEntity, error)

	GetVersionRefsV3(ctx context.Context, packageId string, version string, revision int) ([]entity.PublishedReferenceEntity, error)
	GetVersionsByPreviousVersion(ctx context.Context, previousPackageId string, previousVersionName string) ([]entity.PublishedVersionEntity, error)
	GetVersionRevisionsByPreviousVersion(ctx context.Context, previousPackageId string, previousVersionName string) ([]entity.PublishedVersionKeyEntity, error)
	GetReadonlyPackageVersionsWithLimit(ctx context.Context, searchQuery entity.PublishedVersionSearchQueryEntity, checkRevisions bool, showOnlyDeleted bool) ([]entity.PackageVersionRevisionEntity, error)
	GetDefaultVersion(ctx context.Context, packageId string, status string) (*entity.PublishedVersionEntity, error)
	GetVersionReferencingDashboards(ctx context.Context, packageId string, version string) ([]entity.PublishedVersionKeyEntity, error)
	GetPackageReferencingDashboards(ctx context.Context, packageId string) ([]entity.DashboardReferenceEntity, error)
	DeletePackageRevisionsBeforeDate(ctx context.Context, packageId string, beforeDate time.Time, deleteLastRevision bool, deleteReleaseRevisions bool, deletedBy string) (int, int, error)
	DeleteSoftDeletedPackageRevisionsBeforeDate(ctx context.Context, runId string, beforeDate time.Time, batchSize int) (int, error)

	GetFileSharedInfo(ctx context.Context, packageId string, fileId string, versionName string) (*entity.SharedUrlInfoEntity, error)
	GetFileSharedInfoById(ctx context.Context, sharedId string) (*entity.SharedUrlInfoEntity, error)
	CreateFileSharedInfo(ctx context.Context, newSharedIdInfo *entity.SharedUrlInfoEntity) error

	CreatePackage(ctx context.Context, packageEntity *entity.PackageEntity) error
	CreatePrivatePackageForUser(ctx context.Context, packageEntity *entity.PackageEntity, userRoleEntity *entity.PackageMemberRoleEntity) error
	GetPackage(ctx context.Context, id string) (*entity.PackageEntity, error)
	GetDeletedPackage(ctx context.Context, id string) (*entity.PackageEntity, error)
	GetPackageIncludingDeleted(ctx context.Context, id string) (*entity.PackageEntity, error)
	GetAllChildPackageIdsIncludingParent(ctx context.Context, parentId string) ([]string, error)
	GetDescendantPackages(ctx context.Context, parentId string) ([]entity.PackageEntity, error)
	GetParentsForPackage(ctx context.Context, id string, includeDeleted bool) ([]entity.PackageEntity, error)
	GetParentsForPackages(ctx context.Context, ids []string, includeDeleted bool) (map[string][]entity.PackageEntity, error)
	UpdatePackage(ctx context.Context, ent *entity.PackageEntity, excludeFromSearchChanged bool) (*entity.PackageEntity, error)
	DeletePackage(ctx context.Context, id string, userId string) (int, error)
	DeleteSoftDeletedPackagesBeforeDate(ctx context.Context, runId string, beforeDate time.Time, batchSize int) (int, error)
	GetPackages(ctx context.Context, searchReq view.PackageListReq, userId string) ([]entity.PackageEntity, error)
	GetDeletedPackages(ctx context.Context, searchReq view.PackageListReq, userId string) ([]entity.PackageEntity, error)
	GetReadablePackages(ctx context.Context, searchReq view.PackageListReq, scope view.PackageReadScope, userId string) ([]entity.ReadablePackageEntity, error)
	GetVersionValidationChanges_deprecated(ctx context.Context, packageId string, versionName string, revision int) (*entity.PublishedVersionValidationEntity_deprecated, error)
	GetVersionValidationProblems_deprecated(ctx context.Context, packageId string, versionName string, revision int) (*entity.PublishedVersionValidationEntity_deprecated, error)
	SearchForVersions(ctx context.Context, searchQuery *entity.PackageSearchQuery) ([]entity.PackageSearchResult, error)
	SearchForDocuments(ctx context.Context, searchQuery *entity.DocumentSearchQuery) ([]entity.DocumentSearchResult, error)

	RecalculatePackageOperationGroups(ctx context.Context, packageId string, restGroupingPrefixRegex string, userId string) error
	RecalculateOperationGroups(ctx context.Context, packageId string, version string, revision int, restGroupingPrefixRegex string, userId string) error

	GetVersionComparison(ctx context.Context, comparisonId string) (*entity.VersionComparisonEntity, error)
	GetVersionRefsComparisons(ctx context.Context, comparisonId string) ([]entity.VersionComparisonEntity, error)
	GetVersionComparisonsCleanupCandidates(ctx context.Context, limit int, offset int) ([]entity.VersionComparisonCleanupCandidateEntity, error)
	DeleteVersionComparison(ctx context.Context, comparisonId string) (bool, error)
	SaveVersionChanges(ctx context.Context, packageInfo view.PackageInfoFile, publishId string, operationComparisons []*entity.OperationComparisonEntity, versionComparisons []*entity.VersionComparisonEntity, cachedComparisonIds map[string]struct{}, comparisonInternalDocEntities []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocDataEntities []*entity.ComparisonInternalDocumentDataEntity, ddlContractComparisons []*entity.DDLContractComparisonEntity, comparisonNotifications []*entity.VersionComparisonNotificationEntity, buildErrorFlags view.BuildErrorFlags) error
	GetLatestRevision(ctx context.Context, packageId, version string) (int, error)
	GetDeletedPackageLatestRevision(ctx context.Context, packageId, version string) (int, error)

	GetVersionRevisionContentForDocumentsTransformation(ctx context.Context, packageId string, version string, revision int,
		searchQuery entity.ContentForDocumentsTransformationSearchQueryEntity) ([]entity.PublishedContentWithDataEntity, error)
	GetPublishedSourcesArchives(ctx context.Context, offset int) (*entity.PublishedSrcArchiveEntity, error)
	DeletePublishedSourcesArchives(ctx context.Context, checksums []string) error
	SavePublishedSourcesArchive(ctx context.Context, ent *entity.PublishedSrcArchiveEntity) error
	GetPublishedVersionsHistory(ctx context.Context, filter view.PublishedVersionHistoryFilter) ([]entity.PackageVersionHistoryEntity, error)

	StoreOperationGroupPublishProcess(ctx context.Context, ent *entity.OperationGroupPublishEntity) error
	UpdateOperationGroupPublishProcess(ctx context.Context, ent *entity.OperationGroupPublishEntity) error
	GetOperationGroupPublishProcess(ctx context.Context, publishId string) (*entity.OperationGroupPublishEntity, error)

	StoreCSVDashboardPublishProcess(ctx context.Context, ent *entity.CSVDashboardPublishEntity) error
	UpdateCSVDashboardPublishProcess(ctx context.Context, ent *entity.CSVDashboardPublishEntity) error
	GetCSVDashboardPublishProcess(ctx context.Context, publishId string) (*entity.CSVDashboardPublishEntity, error)
	GetCSVDashboardPublishReport(ctx context.Context, publishId string) (*entity.CSVDashboardPublishEntity, error)

	GetVersionInternalDocuments(ctx context.Context, packageId string, version string, revision int) ([]entity.VersionInternalDocumentEntity, error)
	GetVersionInternalDocumentData(ctx context.Context, hash string) (*entity.VersionInternalDocumentDataEntity, error)
	GetComparisonInternalDocumentsByComparisons(ctx context.Context, comparisons []entity.VersionComparisonEntity) ([]entity.ComparisonInternalDocumentEntity, error)
	GetComparisonInternalDocumentData(ctx context.Context, hash string) (*entity.ComparisonInternalDocumentDataEntity, error)

	UpdateDocumentShareabilityBySlug(ctx context.Context, packageId string, version string, revision int, slug string, shareability string) error
	BulkUpdateDocumentShareability(ctx context.Context, entities []*entity.PublishedContentEntity) error

	UpdatePublishedSourcesArchive(ctx context.Context, packageId string, version string, revision int, newChecksum string, srcArchive *entity.PublishedSrcArchiveEntity, trackingEntity *entity.SourcesUpdateTrackingEntity) error
	UpdatePublishedSourcesChecksum(ctx context.Context, packageId string, version string, revision int, newChecksum string, trackingEntity *entity.SourcesUpdateTrackingEntity) error
}
