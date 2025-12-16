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

package repository

import (
	"context"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type PublishedRepository interface {
	MarkVersionDeleted(packageId string, versionName string, userId string) (int, error)
	PatchVersion(packageId string, versionName string, status *string, versionLabels *[]string) (*entity.PublishedVersionEntity, error)
	GetVersion(packageId string, versionName string) (*entity.PublishedVersionEntity, error)
	GetReadonlyVersion(packageId string, versionName string, showOnlyDeleted bool) (*entity.PackageVersionRevisionEntity, error)
	GetVersionByRevision(packageId string, versionName string, revision int) (*entity.PublishedVersionEntity, error)
	GetVersionIncludingDeleted(packageId string, versionName string) (*entity.PublishedVersionEntity, error)
	GetServiceOwner(workspaceId string, serviceName string) (string, error)
	GetRichPackageVersion(packageId string, version string) (*entity.PackageVersionRichEntity, error)
	GetRevisionContent(packageId string, versionName string, revision int) ([]entity.PublishedContentEntity, error)
	GetRevisionContentWithLimit(packageId string, versionName string, revision int, skipRefs bool, searchQuery entity.PublishedContentSearchQueryEntity) ([]entity.PublishedContentEntity, error)
	GetVersionRevisionsList(searchQuery entity.PackageVersionSearchQueryEntity) ([]entity.PackageVersionRevisionEntity, error)
	GetLatestContentBySlug(packageId string, versionName string, slug string) (*entity.PublishedContentEntity, error)
	GetRevisionContentBySlug(packageId string, versionName string, slug string, revision int) (*entity.PublishedContentEntity, error)

	GetVersionSources(packageId string, versionName string, revision int) (*entity.PublishedSrcArchiveEntity, error)
	GetPublishedVersionSourceDataConfig(packageId string, versionName string, revision int) (*entity.PublishedSrcDataConfigEntity, error)
	GetPublishedSources(packageId string, versionName string, revision int) (*entity.PublishedSrcEntity, error)

	CreateVersionWithData(packageInfo view.PackageInfoFile, publishId string, version *entity.PublishedVersionEntity, content []*entity.PublishedContentEntity,
		data []*entity.PublishedContentDataEntity, refs []*entity.PublishedReferenceEntity, src *entity.PublishedSrcEntity, srcArchive *entity.PublishedSrcArchiveEntity,
		operations []*entity.OperationEntity, operationsData []*entity.OperationDataEntity,
		operationComparisons []*entity.OperationComparisonEntity, builderNotifications []*entity.BuilderNotificationsEntity,
		versionComparisonEntities []*entity.VersionComparisonEntity, serviceName string, pkg *entity.PackageEntity, versionComparisonsFromCache []string,
		versionInternalDocEntities []*entity.VersionInternalDocumentEntity, versionInternalDocDataEntities []*entity.VersionInternalDocumentDataEntity,
		comparisonInternalDocEntities []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocDataEntities []*entity.ComparisonInternalDocumentDataEntity) error
	GetContentData(packageId string, checksum string) (*entity.PublishedContentDataEntity, error)

	GetVersionRefsV3(packageId string, version string, revision int) ([]entity.PublishedReferenceEntity, error)
	GetVersionsByPreviousVersion(previousPackageId string, previousVersionName string) ([]entity.PublishedVersionEntity, error)
	GetReadonlyPackageVersionsWithLimit(searchQuery entity.PublishedVersionSearchQueryEntity, checkRevisions bool, showOnlyDeleted bool) ([]entity.PackageVersionRevisionEntity, error)
	GetDefaultVersion(packageId string, status string) (*entity.PublishedVersionEntity, error)
	DeletePackageRevisionsBeforeDate(ctx context.Context, packageId string, beforeDate time.Time, deleteLastRevision bool, deleteReleaseRevisions bool, deletedBy string) (int, int, error)
	DeleteSoftDeletedPackageRevisionsBeforeDate(ctx context.Context, runId string, beforeDate time.Time, batchSize int) (int, error)

	GetFileSharedInfo(packageId string, fileId string, versionName string) (*entity.SharedUrlInfoEntity, error)
	GetFileSharedInfoById(sharedId string) (*entity.SharedUrlInfoEntity, error)
	CreateFileSharedInfo(newSharedIdInfo *entity.SharedUrlInfoEntity) error

	CreatePackage(packageEntity *entity.PackageEntity) error
	CreatePrivatePackageForUser(packageEntity *entity.PackageEntity, userRoleEntity *entity.PackageMemberRoleEntity) error
	GetPackage(id string) (*entity.PackageEntity, error)
	GetDeletedPackage(id string) (*entity.PackageEntity, error)
	GetPackageIncludingDeleted(id string) (*entity.PackageEntity, error)
	GetAllChildPackageIdsIncludingParent(parentId string) ([]string, error)
	GetParentsForPackage(id string, includeDeleted bool) ([]entity.PackageEntity, error)
	UpdatePackage(ent *entity.PackageEntity) (*entity.PackageEntity, error)
	DeletePackage(id string, userId string) (int, error)
	DeleteSoftDeletedPackagesBeforeDate(ctx context.Context, runId string, beforeDate time.Time, batchSize int) (int, error)
	GetFilteredPackagesWithOffset(ctx context.Context, searchReq view.PackageListReq, userId string) ([]entity.PackageEntity, error)
	GetFilteredDeletedPackages(ctx context.Context, searchReq view.PackageListReq, userId string) ([]entity.PackageEntity, error)
	GetVersionValidationChanges(packageId string, versionName string, revision int) (*entity.PublishedVersionValidationEntity, error)
	GetVersionValidationProblems(packageId string, versionName string, revision int) (*entity.PublishedVersionValidationEntity, error)
	SearchForVersions(searchQuery *entity.PackageSearchQuery) ([]entity.PackageSearchResult, error)
	SearchForDocuments(searchQuery *entity.DocumentSearchQuery) ([]entity.DocumentSearchResult, error)

	RecalculatePackageOperationGroups(packageId string, restGroupingPrefixRegex string, graphqlGroupingPrefixRegex string, userId string) error
	RecalculateOperationGroups(packageId string, version string, revision int, restGroupingPrefixRegex string, graphqlGroupingPrefixRegex string, userId string) error

	GetVersionComparison(comparisonId string) (*entity.VersionComparisonEntity, error)
	GetVersionRefsComparisons(comparisonId string) ([]entity.VersionComparisonEntity, error)
	GetVersionComparisonsCleanupCandidates(ctx context.Context, limit int, offset int) ([]entity.VersionComparisonCleanupCandidateEntity, error)
	DeleteVersionComparison(ctx context.Context, comparisonId string) (bool, error)
	SaveVersionChanges(packageInfo view.PackageInfoFile, publishId string, operationComparisons []*entity.OperationComparisonEntity, versionComparisons []*entity.VersionComparisonEntity, versionComparisonsFromCache []string, comparisonInternalDocEntities []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocDataEntities []*entity.ComparisonInternalDocumentDataEntity) error
	GetLatestRevision(packageId, version string) (int, error)
	GetDeletedPackageLatestRevision(packageId, version string) (int, error)

	GetVersionRevisionContentForDocumentsTransformation(packageId string, version string, revision int,
		searchQuery entity.ContentForDocumentsTransformationSearchQueryEntity) ([]entity.PublishedContentWithDataEntity, error)
	GetPublishedSourcesArchives(offset int) (*entity.PublishedSrcArchiveEntity, error)
	DeletePublishedSourcesArchives(checksums []string) error
	SavePublishedSourcesArchive(ent *entity.PublishedSrcArchiveEntity) error
	GetPublishedVersionsHistory(filter view.PublishedVersionHistoryFilter) ([]entity.PackageVersionHistoryEntity, error)

	StoreOperationGroupPublishProcess(ent *entity.OperationGroupPublishEntity) error
	UpdateOperationGroupPublishProcess(ent *entity.OperationGroupPublishEntity) error
	GetOperationGroupPublishProcess(publishId string) (*entity.OperationGroupPublishEntity, error)

	StoreCSVDashboardPublishProcess(ent *entity.CSVDashboardPublishEntity) error
	UpdateCSVDashboardPublishProcess(ent *entity.CSVDashboardPublishEntity) error
	GetCSVDashboardPublishProcess(publishId string) (*entity.CSVDashboardPublishEntity, error)
	GetCSVDashboardPublishReport(publishId string) (*entity.CSVDashboardPublishEntity, error)

	GetVersionInternalDocuments(packageId string, version string, revision int) ([]entity.VersionInternalDocumentEntity, error)
	GetVersionInternalDocumentData(hash string) (*entity.EnrichedVersionInternalDocumentDataEntity, error)
	GetComparisonInternalDocumentsByComparisons(comparisons []entity.VersionComparisonEntity) ([]entity.ComparisonInternalDocumentEntity, error)
	GetComparisonInternalDocumentData(hash string) (*entity.EnrichedComparisonInternalDocumentDataEntity, error)
}
