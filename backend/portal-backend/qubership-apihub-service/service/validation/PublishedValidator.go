package validation

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/archive"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type PublishedValidator interface {
	ValidatePackage(ctx context.Context, buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error
	ValidateBuildResultAgainstConfig(buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error //TODO remove and merge logic with ValidatePackage
	ValidateChanges(ctx context.Context, buildArc *archive.BuildResultArchive) error                            //TODO remove and merge logic with ValidatePackage
	ValidateBuildNotifications(buildArc *archive.BuildResultArchive) error
	ValidateComparisonNotifications(buildArc *archive.BuildResultArchive) error
	ValidateErroredVersionNotPublishedAsRelease(buildArc *archive.BuildResultArchive) error
}

func NewPublishedValidator(publishedRepo repository.PublishedRepository) PublishedValidator {
	return &publishedValidatorImpl{
		publishedRepo: publishedRepo,
	}
}

type publishedValidatorImpl struct {
	publishedRepo repository.PublishedRepository
}

func (p publishedValidatorImpl) ValidatePackage(ctx context.Context, buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error {
	if err := p.validatePackageInfo(ctx, buildArc, buildConfig); err != nil {
		return err
	}

	if err := p.validatePackageDocuments(buildArc, buildConfig); err != nil {
		return err
	}

	if err := p.validatePackageOperations(buildArc, buildConfig); err != nil {
		return err
	}

	if err := p.validatePackageComparisons(ctx, buildArc, buildConfig); err != nil {
		return err
	}

	if err := p.validateCachedComparisons(ctx, buildArc); err != nil {
		return err
	}

	if err := p.validatePackageDdlContracts(ctx, buildArc, buildConfig); err != nil {
		return err
	}

	if err := p.validatePackageMcpContracts(buildArc, buildConfig); err != nil {
		return err
	}

	if err := p.validateVersionInternalDocuments(buildArc); err != nil {
		return err
	}

	if err := p.validateComparisonInternalDocuments(buildArc); err != nil {
		return err
	}

	if len(buildArc.PackageDocuments.Documents) == 0 && len(buildArc.PackageInfo.Refs) == 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyDataForPublish,
			Message: exception.EmptyDataForPublishMsg,
		}
	}
	if len(buildArc.PackageDocuments.Documents) != 0 && buildArc.PackageInfo.Kind == entity.KIND_GROUP {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "documents", "error": "cannot publish package with kind 'group' which contains documents"},
		}
	}

	if (len(buildArc.PackageInfo.Refs) > 0 || len(buildArc.PackageDocuments.Documents) == 0) &&
		buildArc.PackageInfo.Kind == entity.KIND_PACKAGE {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "refs", "error": "cannot publish package with kind 'package' with refs or without documents"},
		}
	}

	// Doesn't work for migration, maybe need some flag
	//	if err := ValidateVersionName(info.Version); err != nil {
	//		return err
	//	}

	return nil
}

func (p publishedValidatorImpl) ValidateBuildResultAgainstConfig(buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error {
	info := buildArc.PackageInfo
	if info.PackageId != buildConfig.PackageId {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PackageForBuildConfigDiscrepancy,
			Message: exception.PackageForBuildConfigDiscrepancyMsg,
			Params: map[string]interface{}{
				"param":    "packageId",
				"expected": buildConfig.PackageId,
				"actual":   info.PackageId,
			},
		}
	}
	if info.Version != buildConfig.Version {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PackageForBuildConfigDiscrepancy,
			Message: exception.PackageForBuildConfigDiscrepancyMsg,
			Params: map[string]interface{}{
				"param":    "version",
				"expected": buildConfig.Version,
				"actual":   info.Version,
			},
		}
	}
	if info.Status != buildConfig.Status {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PackageForBuildConfigDiscrepancy,
			Message: exception.PackageForBuildConfigDiscrepancyMsg,
			Params: map[string]interface{}{
				"param":    "status",
				"expected": buildConfig.Status,
				"actual":   info.Status,
			},
		}
	}
	if info.PreviousVersion != buildConfig.PreviousVersion {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PackageForBuildConfigDiscrepancy,
			Message: exception.PackageForBuildConfigDiscrepancyMsg,
			Params: map[string]interface{}{
				"param":    "previousVersion",
				"expected": buildConfig.PreviousVersion,
				"actual":   info.PreviousVersion,
			},
		}
	}
	if info.PreviousVersionPackageId != buildConfig.PreviousVersionPackageId {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PackageForBuildConfigDiscrepancy,
			Message: exception.PackageForBuildConfigDiscrepancyMsg,
			Params: map[string]interface{}{
				"param":    "previousVersionPackageId",
				"expected": buildConfig.PreviousVersionPackageId,
				"actual":   info.PreviousVersionPackageId,
			},
		}
	}

	if info.BuildType != buildConfig.BuildType {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PackageForBuildConfigDiscrepancy,
			Message: exception.PackageForBuildConfigDiscrepancyMsg,
			Params: map[string]interface{}{
				"param":    "buildType",
				"expected": buildConfig.BuildType,
				"actual":   info.BuildType,
			},
		}
	}
	if info.Format != buildConfig.Format {
		if info.Format != "" || buildConfig.Format != string(view.JsonDocumentFormat) {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.PackageForBuildConfigDiscrepancy,
				Message: exception.PackageForBuildConfigDiscrepancyMsg,
				Params: map[string]interface{}{
					"param":    "format",
					"expected": buildConfig.Format,
					"actual":   info.Format,
				},
			}
		}
	}

	return nil
}

func (p publishedValidatorImpl) ValidateErroredVersionNotPublishedAsRelease(buildArc *archive.BuildResultArchive) error {
	info := buildArc.PackageInfo
	if info.Status != string(view.Release) {
		return nil
	}
	if !info.HasErrors && !buildArc.ComparisonsHaveErrors() {
		return nil
	}
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.VersionHasErrors,
		Message: exception.ReleasePublishWithErrorsMsg,
		Params:  map[string]interface{}{"packageId": info.PackageId, "version": info.Version},
	}
}

func (p publishedValidatorImpl) ValidateChanges(ctx context.Context, buildArc *archive.BuildResultArchive) error {
	info := view.MakeChangelogInfoFileView(buildArc.PackageInfo)
	comparisons := buildArc.PackageComparisons
	ddlComparisons := buildArc.PackageDdlComparisons
	if err := utils.ValidateObject(info); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "info", "error": err.Error()},
		}
	}
	if info.Revision == 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "info", "error": "version revision cannot be empty with changelog buildType"},
		}
	}
	if info.PreviousVersionRevision == 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "info", "error": "previous version revision cannot be empty with changelog buildType"},
		}
	}

	// A changelog build may carry only DDL comparisons (see PublishChanges), so at least one
	// comparison of either kind is required, not specifically a REST/operation comparison.
	if len(comparisons.Comparisons) == 0 && len(ddlComparisons.Comparisons) == 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "comparisons", "error": "at least one comparison required for changelog buildType"},
		}
	}
	if err := utils.ValidateObject(comparisons); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "comparisons", "error": err.Error()},
		}
	}
	if err := utils.ValidateObject(ddlComparisons); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "ddl-comparisons", "error": err.Error()},
		}
	}

	entries := make([]view.ComparisonKey, 0, len(comparisons.Comparisons)+len(ddlComparisons.Comparisons))
	for _, comparison := range comparisons.Comparisons {
		entries = append(entries, view.ComparisonKey{
			PackageId:                comparison.PackageId,
			Version:                  comparison.Version,
			Revision:                 comparison.Revision,
			PreviousVersionPackageId: comparison.PreviousVersionPackageId,
			PreviousVersion:          comparison.PreviousVersion,
			PreviousVersionRevision:  comparison.PreviousVersionRevision,
		})
	}
	for _, comparison := range ddlComparisons.Comparisons {
		entries = append(entries, view.ComparisonKey{
			PackageId:                comparison.PackageId,
			Version:                  comparison.Version,
			Revision:                 comparison.Revision,
			PreviousVersionPackageId: comparison.PreviousVersionPackageId,
			PreviousVersion:          comparison.PreviousVersion,
			PreviousVersionRevision:  comparison.PreviousVersionRevision,
		})
	}
	if err := p.validateChangelogComparisonEntries(ctx, buildArc, entries); err != nil {
		return err
	}

	if err := p.validateCachedComparisons(ctx, buildArc); err != nil {
		return err
	}

	if err := p.validateComparisonInternalDocuments(buildArc); err != nil {
		return err
	}

	return nil
}

// validateChangelogComparisonEntries checks that every comparison entry in a changelog build
// (regular or DDL) references an existing published version. Unlike validateComparisonEntries
// (used by ValidatePackage), a changelog build only ever compares two already-published versions,
// so lookups use GetVersionByRevision rather than GetVersionIncludingDeleted.
func (p publishedValidatorImpl) validateChangelogComparisonEntries(ctx context.Context, buildArc *archive.BuildResultArchive, entries []view.ComparisonKey) error {
	for _, comparison := range entries {
		if comparison.Version != "" {
			if (buildArc.PackageInfo.Revision != comparison.Revision && comparison.Revision != 0) ||
				buildArc.PackageInfo.Version != comparison.Version ||
				buildArc.PackageInfo.PackageId != comparison.PackageId {
				versionEnt, err := p.publishedRepo.GetVersionByRevision(ctx, comparison.PackageId, comparison.Version, comparison.Revision)
				if err != nil {
					return err
				}
				if versionEnt == nil {
					return &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.PublishedVersionRevisionNotFound,
						Message: exception.PublishedVersionRevisionNotFoundMsg,
						Params:  map[string]interface{}{"version": comparison.Version, "revision": comparison.Revision, "packageId": comparison.PackageId},
					}
				}
			}
		}
		if comparison.PreviousVersion != "" {
			previousVersionEnt, err := p.publishedRepo.GetVersionByRevision(ctx, comparison.PreviousVersionPackageId, comparison.PreviousVersion, comparison.PreviousVersionRevision)
			if err != nil {
				return err
			}
			if previousVersionEnt == nil {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.PublishedVersionRevisionNotFound,
					Message: exception.PublishedVersionRevisionNotFoundMsg,
					Params:  map[string]interface{}{"version": comparison.PreviousVersion, "revision": comparison.PreviousVersionRevision, "packageId": comparison.PreviousVersionPackageId},
				}
			}
		}
	}
	return nil
}

func (p publishedValidatorImpl) validatePackageInfo(ctx context.Context, buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error {
	if err := utils.ValidateObject(buildArc.PackageInfo); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "info", "error": err.Error()},
		}
	}
	info := buildArc.PackageInfo
	if _, err := view.ParseVersionStatus(buildArc.PackageInfo.Status); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "info", "error": err.Error()},
		}
	}
	if info.PreviousVersionPackageId == info.PackageId {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPreviousVersionPackage,
			Message: exception.InvalidPreviousVersionPackageMsg,
			Params:  map[string]interface{}{"previousVersionPackageId": info.PreviousVersionPackageId, "packageId": info.PackageId},
		}
	}
	if info.Version == info.PreviousVersion {
		if info.PreviousVersionPackageId == "" {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.VersionIsEqualToPreviousVersion,
				Message: exception.VersionIsEqualToPreviousVersionMsg,
				Params:  map[string]interface{}{"version": info.Version, "previousVersion": info.PreviousVersion},
			}
		}
	}
	for _, srcRef := range buildConfig.Refs {
		refExists := false
		for _, ref := range info.Refs {
			if ref.RefId == srcRef.RefId && ref.Version == srcRef.Version {
				refExists = true
				break
			}
		}
		if !refExists {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.ReferenceMissingFromPackage,
				Message: exception.ReferenceMissingFromPackageMsg,
				Params:  map[string]interface{}{"refId": srcRef.RefId, "version": srcRef.Version},
			}
		}
	}
	if buildArc.PackageInfo.MigrationBuild {
		ent, err := p.publishedRepo.GetVersion(ctx, buildArc.PackageInfo.PackageId, buildArc.PackageInfo.Version)
		if err != nil {
			return err
		}
		if ent == nil {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.PublishedPackageVersionNotFound,
				Message: exception.PublishedPackageVersionNotFoundMsg,
				Params:  map[string]interface{}{"version": buildArc.PackageInfo.Version, "packageId": buildArc.PackageInfo.PackageId},
			}
		}
	}
	return nil
}

func (p publishedValidatorImpl) validatePackageDocuments(buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error {
	if err := utils.ValidateObject(buildArc.PackageDocuments); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "documents", "error": err.Error()},
		}
	}
	documents := buildArc.PackageDocuments
	for _, document := range documents.Documents {
		if view.InvalidDocumentType(document.Type) {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidDocumentType,
				Message: exception.InvalidDocumentTypeMsg,
				Params:  map[string]interface{}{"type": document.Type},
			}
		}
		/*if view.InvalidDocumentFormat(document.Format) {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidDocumentFormat,
				Message: exception.InvalidDocumentFormatMsg,
				Params:  map[string]interface{}{"format": document.Format},
			}
		}*/
	}

	for _, srcFile := range buildConfig.Files {
		if srcFile.Publish != nil && *srcFile.Publish {
			documentExists := false
			for _, document := range documents.Documents {
				if document.FileId == srcFile.FileId {
					documentExists = true
					break
				}
			}
			if !documentExists {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.DocumentMissingFromPackage,
					Message: exception.DocumentMissingFromPackageMsg,
					Params:  map[string]interface{}{"fileId": srcFile.FileId},
				}
			}
		}
	}

	return nil
}

func (p publishedValidatorImpl) validatePackageOperations(buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error {
	if err := utils.ValidateObject(buildArc.PackageOperations); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "operations", "error": err.Error()},
		}
	}
	operations := buildArc.PackageOperations
	for _, operation := range operations.Operations {
		apiType, err := view.ParseApiType(operation.ApiType)
		if err != nil {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidPackagedFile,
				Message: exception.InvalidPackagedFileMsg,
				Params: map[string]interface{}{
					"file":  "operations",
					"error": fmt.Sprintf("object with operationId = %v is incorrect: %v", operation.OperationId, err.Error()),
				},
			}
		}
		if !view.ValidApiAudience(operation.ApiAudience) {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidPackagedFile,
				Message: exception.InvalidPackagedFileMsg,
				Params: map[string]interface{}{
					"file":  "operations",
					"error": fmt.Sprintf("object with operationId = %v has incorrect api_audience: %v", operation.OperationId, operation.ApiAudience),
				},
			}
		}
		// Do not check api kind up to D's comment. Validation is not required for this field.
		// I.e. any value from builder is acceptable.

		/*_, err = view.ParseApiKind(operation.ApiKind)
		if err != nil {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidPackagedFile,
				Message: exception.InvalidPackagedFileMsg,
				Params: map[string]interface{}{
					"file":  "operations",
					"error": fmt.Sprintf("object with operationId = %v is incorrect: %v", operation.OperationId, err.Error()),
				},
			}
		}*/

		var operationMetadata entity.Metadata
		operationMetadata = operation.Metadata

		switch apiType {
		case view.RestApiType:
			if operationMetadata.GetPath() == "" {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackagedFile,
					Message: exception.InvalidPackagedFileMsg,
					Params: map[string]interface{}{
						"file":  "operations",
						"error": fmt.Sprintf("object with operationId = %v is incorrect: %v", operation.OperationId, "Metadata.Path for operation is missing"),
					},
				}
			}
			if operationMetadata.GetMethod() == "" {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackagedFile,
					Message: exception.InvalidPackagedFileMsg,
					Params: map[string]interface{}{
						"file":  "operations",
						"error": fmt.Sprintf("object with operationId = %v is incorrect: %v", operation.OperationId, "Metadata.Method for operation is missing"),
					},
				}
			}
		case view.GraphqlApiType:
			if operationMetadata.GetType() == "" {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackagedFile,
					Message: exception.InvalidPackagedFileMsg,
					Params: map[string]interface{}{
						"file":  "operations",
						"error": fmt.Sprintf("object with operationId = %v is incorrect: %v", operation.OperationId, "Metadata.Type for operation is missing"),
					},
				}
			}
			if !view.ValidGraphQLOperationType(operationMetadata.GetType()) {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidGraphQLOperationType,
					Message: exception.InvalidGraphQLOperationTypeMsg,
					Params:  map[string]interface{}{"type": operationMetadata.GetType()},
				}
			}
			if operationMetadata.GetMethod() == "" {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackagedFile,
					Message: exception.InvalidPackagedFileMsg,
					Params: map[string]interface{}{
						"file":  "operations",
						"error": fmt.Sprintf("object with operationId = %v is incorrect: %v", operation.OperationId, "Metadata.Method for operation is missing"),
					},
				}
			}
		case view.ProtobufApiType:
			if operationMetadata.GetType() == "" {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackagedFile,
					Message: exception.InvalidPackagedFileMsg,
					Params: map[string]interface{}{
						"file":  "operations",
						"error": fmt.Sprintf("object with operationId = %v is incorrect: %v", operation.OperationId, "Metadata.Type for operation is missing"),
					},
				}
			}
			if !view.ValidProtobufOperationType(operationMetadata.GetType()) {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidProtobufOperationType,
					Message: exception.InvalidProtobufOperationTypeMsg,
					Params:  map[string]interface{}{"type": operationMetadata.GetType()},
				}
			}
			if operationMetadata.GetMethod() == "" {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackagedFile,
					Message: exception.InvalidPackagedFileMsg,
					Params: map[string]interface{}{
						"file":  "operations",
						"error": fmt.Sprintf("object with operationId = %v is incorrect: %v", operation.OperationId, "Metadata.Method for operation is missing"),
					},
				}
			}
			//todo validate protobuf search scopes
		case view.AsyncapiApiType:
			if operationMetadata.GetChannel() == "" {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackagedFile,
					Message: exception.InvalidPackagedFileMsg,
					Params: map[string]interface{}{
						"file":  "operations",
						"error": fmt.Sprintf("object with operationId = %v is incorrect: %v", operation.OperationId, "Metadata.Channel for operation is missing"),
					},
				}
			}
			if operationMetadata.GetAction() == "" {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackagedFile,
					Message: exception.InvalidPackagedFileMsg,
					Params: map[string]interface{}{
						"file":  "operations",
						"error": fmt.Sprintf("object with operationId = %v is incorrect: %v", operation.OperationId, "Metadata.Action for operation is missing"),
					},
				}
			}
			if !view.ValidAsyncAPIAction(operationMetadata.GetAction()) {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidAsyncAPIOperationAction,
					Message: exception.InvalidAsyncAPIOperationActionMsg,
					Params:  map[string]interface{}{"action": operationMetadata.GetAction()},
				}
			}
			if operationMetadata.GetProtocol() == "" {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackagedFile,
					Message: exception.InvalidPackagedFileMsg,
					Params: map[string]interface{}{
						"file":  "operations",
						"error": fmt.Sprintf("object with operationId = %v is incorrect: %v", operation.OperationId, "Metadata.Protocol for operation is missing"),
					},
				}
			}
			//TODO: add validation for search scopes when they will be supported
		default:

		}
	}

	return nil
}

// cachedComparisonKeys returns the version pairs listed in cached-comparisons.json, keyed by the raw
// fields the archive carries. The entries repeat the values of the comparison index entry they refer
// to, so raw keys match without resolving revisions - which the publish path cannot do yet, because
// the revision of the version being published is assigned after validation.
func cachedComparisonKeys(buildArc *archive.BuildResultArchive) map[view.ComparisonKey]struct{} {
	keys := make(map[view.ComparisonKey]struct{}, len(buildArc.CachedComparisons.CachedComparisons))
	for _, cached := range buildArc.CachedComparisons.CachedComparisons {
		keys[view.ComparisonKey{
			PackageId:                cached.PackageId,
			Version:                  cached.Version,
			Revision:                 cached.Revision,
			PreviousVersionPackageId: cached.PreviousVersionPackageId,
			PreviousVersion:          cached.PreviousVersion,
			PreviousVersionRevision:  cached.PreviousVersionRevision,
		}] = struct{}{}
	}
	return keys
}

func (p publishedValidatorImpl) validateCachedComparisons(ctx context.Context, buildArc *archive.BuildResultArchive) error {
	comparisonsPresent := buildArc.ComparisonsFile != nil || buildArc.ContractsDdlComparisonsFile != nil
	if buildArc.CachedComparisonsFile == nil {
		if !comparisonsPresent {
			return nil
		}
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FileMissingFromSources,
			Message: exception.FileMissingFromSourcesMsg,
			Params:  map[string]interface{}{"fileId": archive.CachedComparisonsFilePath},
		}
	}
	if err := utils.ValidateObject(buildArc.CachedComparisons); err != nil {
		return invalidCachedComparisonsFile(err.Error())
	}

	indexedComparisons := make(map[view.ComparisonKey]struct{},
		len(buildArc.PackageComparisons.Comparisons)+len(buildArc.PackageDdlComparisons.Comparisons))
	for _, comparison := range buildArc.PackageComparisons.Comparisons {
		indexedComparisons[view.ComparisonKey{
			PackageId:                comparison.PackageId,
			Version:                  comparison.Version,
			Revision:                 comparison.Revision,
			PreviousVersionPackageId: comparison.PreviousVersionPackageId,
			PreviousVersion:          comparison.PreviousVersion,
			PreviousVersionRevision:  comparison.PreviousVersionRevision,
		}] = struct{}{}
	}
	for _, comparison := range buildArc.PackageDdlComparisons.Comparisons {
		indexedComparisons[view.ComparisonKey{
			PackageId:                comparison.PackageId,
			Version:                  comparison.Version,
			Revision:                 comparison.Revision,
			PreviousVersionPackageId: comparison.PreviousVersionPackageId,
			PreviousVersion:          comparison.PreviousVersion,
			PreviousVersionRevision:  comparison.PreviousVersionRevision,
		}] = struct{}{}
	}

	// ValidatePackage runs before the version being published is split into name and revision, so
	// compare the name alone - the revision is not resolved yet, and the build's own pair can never be
	// reused whatever its revision turns out to be.
	buildVersion, _, err := repository.SplitVersionRevision(buildArc.PackageInfo.Version)
	if err != nil {
		return err
	}

	for i, cached := range buildArc.CachedComparisons.CachedComparisons {
		key := view.ComparisonKey{
			PackageId:                cached.PackageId,
			Version:                  cached.Version,
			Revision:                 cached.Revision,
			PreviousVersionPackageId: cached.PreviousVersionPackageId,
			PreviousVersion:          cached.PreviousVersion,
			PreviousVersionRevision:  cached.PreviousVersionRevision,
		}
		if cached.PackageId == buildArc.PackageInfo.PackageId && cached.Version == buildVersion {
			return invalidCachedComparisonsFile(fmt.Sprintf(
				"cachedComparisons[%v]: the version pair the build was started for cannot be reused from cache", i))
		}
		if _, indexed := indexedComparisons[key]; !indexed {
			return invalidCachedComparisonsFile(fmt.Sprintf(
				"cachedComparisons[%v]: %v@%v vs %v@%v is not listed in %v or %v",
				i, cached.PackageId, cached.Version, cached.PreviousVersionPackageId, cached.PreviousVersion,
				archive.ComparisonsFilePath, archive.ContractsDdlComparisonsFilePath))
		}
		if err := p.validateCachedComparisonExists(ctx, key); err != nil {
			return err
		}
	}
	return nil
}

func invalidCachedComparisonsFile(errText string) error {
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.InvalidPackagedFile,
		Message: exception.InvalidPackagedFileMsg,
		Params:  map[string]interface{}{"file": archive.CachedComparisonsFilePath, "error": errText},
	}
}

func (p publishedValidatorImpl) validateCachedComparisonExists(ctx context.Context, comparison view.ComparisonKey) error {
	comparisonId := view.MakeVersionComparisonId(
		comparison.PackageId,
		comparison.Version,
		comparison.Revision,
		comparison.PreviousVersionPackageId,
		comparison.PreviousVersion,
		comparison.PreviousVersionRevision)
	comparisonEntity, err := p.publishedRepo.GetVersionComparison(ctx, comparisonId)
	if err != nil {
		return err
	}
	if comparisonEntity == nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ComparisonNotFound,
			Message: exception.ComparisonNotFoundMsg,
			Params: map[string]interface{}{
				"comparisonId":      comparisonId,
				"packageId":         comparison.PackageId,
				"version":           comparison.Version,
				"revision":          comparison.Revision,
				"previousPackageId": comparison.PreviousVersionPackageId,
				"previousVersion":   comparison.PreviousVersion,
				"previousRevision":  comparison.PreviousVersionRevision,
			},
		}
	}
	return nil
}

func (p publishedValidatorImpl) validatePackageComparisons(ctx context.Context, buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error {
	if err := utils.ValidateObject(buildArc.PackageComparisons); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "comparisons", "error": err.Error()},
		}
	}
	comparisons := buildArc.PackageComparisons
	info := buildArc.PackageInfo
	if info.NoChangelog && len(comparisons.Comparisons) != 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ChangesAreNotEmpty,
			Message: exception.ChangesAreNotEmptyMsg,
		}
	}

	if !info.NoChangelog && info.PreviousVersion != "" && len(comparisons.Comparisons) == 0 {
		if err := p.validatePreviousVersionComparisonRequired(ctx, info, "comparisons", "at least one comparison required for publishing package with previous version"); err != nil {
			return err
		}
	}

	entries := make([]view.ComparisonKey, 0, len(comparisons.Comparisons))
	for _, comparison := range comparisons.Comparisons {
		entries = append(entries, view.ComparisonKey{
			PackageId:                comparison.PackageId,
			Version:                  comparison.Version,
			Revision:                 comparison.Revision,
			PreviousVersionPackageId: comparison.PreviousVersionPackageId,
			PreviousVersion:          comparison.PreviousVersion,
			PreviousVersionRevision:  comparison.PreviousVersionRevision,
		})
	}
	return p.validateComparisonEntries(ctx, buildArc, entries)
}

// validatePreviousVersionComparisonRequired checks whether the previous version was deleted
// (in which case the caller's "at least one comparison" requirement is waived) and otherwise
// returns an InvalidPackagedFile error for the given file/errorDetail.
func (p publishedValidatorImpl) validatePreviousVersionComparisonRequired(ctx context.Context, info view.PackageInfoFile, file string, errorDetail string) error {
	// need to check if previous version was deleted
	prevPkgId := ""
	if info.PreviousVersionPackageId != "" {
		prevPkgId = info.PreviousVersionPackageId
	} else {
		prevPkgId = info.PackageId
	}
	pvEnt, err := p.publishedRepo.GetVersionIncludingDeleted(ctx, prevPkgId, info.PreviousVersion)
	if err != nil {
		return fmt.Errorf("failed to get previous version in validatePackage: %w", err)
	}
	if pvEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": info.PreviousVersion, "packageId": prevPkgId},
		}
	}
	if pvEnt.DeletedAt != nil && !pvEnt.DeletedAt.IsZero() {
		// previous version is deleted, so it's ok
		return nil
	}
	// previous version is not deleted, and we don't have comparisons
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.InvalidPackagedFile,
		Message: exception.InvalidPackagedFileMsg,
		Params:  map[string]interface{}{"file": file, "error": errorDetail},
	}
}

// validateComparisonEntries runs the shared business-logic checks (excluded refs, field
// consistency, referenced version/comparison existence) against both regular and DDL comparisons.
func (p publishedValidatorImpl) validateComparisonEntries(ctx context.Context, buildArc *archive.BuildResultArchive, entries []view.ComparisonKey) error {
	excludedRefs := make(map[string]struct{}, 0)
	for _, ref := range buildArc.PackageInfo.Refs {
		if ref.Excluded {
			excludedRefs[view.MakePackageVersionRefKey(ref.RefId, ref.Version)] = struct{}{}
		}
	}
	for _, comparison := range entries {
		if _, refExcluded := excludedRefs[view.MakePackageVersionRefKey(comparison.PackageId, view.MakeVersionRefKey(comparison.Version, comparison.Revision))]; refExcluded {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.ExcludedComparisonReference,
				Message: exception.ExcludedComparisonReferenceMsg,
				Params:  map[string]interface{}{"packageId": comparison.PackageId, "version": comparison.Version, "revision": comparison.Revision},
			}
		}
		if comparison.Version != "" {
			if comparison.PackageId == "" {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidComparisonField,
					Message: exception.InvalidComparisonFieldMsg,
					Params:  map[string]interface{}{"field": "packageId", "error": "packageId cannot be empty if version field is filled"},
				}
			}
		}
		if comparison.Version == "" && comparison.PreviousVersion == "" {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidComparisonField,
				Message: exception.InvalidComparisonFieldMsg,
				Params:  map[string]interface{}{"field": "version", "error": "version and previousVersion cannot both be empty"},
			}
		}
		if comparison.PreviousVersion != "" {
			if comparison.PreviousVersionPackageId == "" {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidComparisonField,
					Message: exception.InvalidComparisonFieldMsg,
					Params:  map[string]interface{}{"field": "previousVersionPackageId", "error": "previousVersionPackageId cannot be empty if previousVersion field is filled"},
				}
			}
			if comparison.PreviousVersionRevision == 0 {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidComparisonField,
					Message: exception.InvalidComparisonFieldMsg,
					Params:  map[string]interface{}{"field": "previousVersionRevision", "error": "previousVersionRevision cannot be empty if previousVersion field is filled"},
				}
			}
		}
		if strings.Contains(comparison.Version, "@") {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidComparisonField,
				Message: exception.InvalidComparisonFieldMsg,
				Params:  map[string]interface{}{"field": "version", "error": "version cannot not contain '@' symbol"},
			}
		}
		if strings.Contains(comparison.PreviousVersion, "@") {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidComparisonField,
				Message: exception.InvalidComparisonFieldMsg,
				Params:  map[string]interface{}{"field": "previousVersion", "error": "previousVersion cannot not contain '@' symbol"},
			}
		}
		if comparison.Version != "" {
			if (buildArc.PackageInfo.Revision != comparison.Revision && comparison.Revision != 0) ||
				buildArc.PackageInfo.Version != comparison.Version ||
				buildArc.PackageInfo.PackageId != comparison.PackageId {
				versionEnt, err := p.publishedRepo.GetVersionIncludingDeleted(ctx, comparison.PackageId, view.MakeVersionRefKey(comparison.Version, comparison.Revision))
				if err != nil {
					return err
				}
				if versionEnt == nil {
					return &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.PublishedVersionRevisionNotFound,
						Message: exception.PublishedVersionRevisionNotFoundMsg,
						Params:  map[string]interface{}{"version": comparison.Version, "revision": comparison.Revision, "packageId": comparison.PackageId},
					}
				}
				/*if versionEnt.DeletedAt != nil {
					// TODO: delete this changelog
				}*/
			}
		}
		if comparison.PreviousVersion != "" {
			previousVersionEnt, err := p.publishedRepo.GetVersionIncludingDeleted(ctx, comparison.PreviousVersionPackageId, view.MakeVersionRefKey(comparison.PreviousVersion, comparison.PreviousVersionRevision))
			if err != nil {
				return err
			}
			if previousVersionEnt == nil {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.PublishedVersionRevisionNotFound,
					Message: exception.PublishedVersionRevisionNotFoundMsg,
					Params:  map[string]interface{}{"version": comparison.PreviousVersion, "revision": comparison.PreviousVersionRevision, "packageId": comparison.PreviousVersionPackageId},
				}
			}
			/*if previousVersionEnt.DeletedAt != nil {
				// TODO: delete this changelog
			}*/
		}
		// if comparison.ComparisonFileId != "" {
		// 	if _, exists := comparisonsFileHeaders[comparison.ComparisonFileId]; !exists {
		// 		return &exception.CustomError{
		// 			Status:  http.StatusBadRequest,
		// 			Code:    exception.PackageArchivedFileNotFound,
		// 			Message: exception.PackageArchivedFileNotFoundMsg,
		// 			Params:  map[string]interface{}{"file": comparison.ComparisonFileId, "folder": "comparisons/"},
		// 		}
		// 	}
		// }
	}
	return nil
}

func (p publishedValidatorImpl) validatePackageDdlContracts(ctx context.Context, buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error {
	if err := utils.ValidateObject(buildArc.PackageDdlContracts); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "ddl", "error": err.Error()},
		}
	}
	if err := utils.ValidateObject(buildArc.PackageDdlComparisons); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "ddl-comparisons", "error": err.Error()},
		}
	}

	for _, table := range buildArc.PackageDdlContracts.Tables {
		if table.Kind != view.DdlEntityKindTable {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidPackagedFile,
				Message: exception.InvalidPackagedFileMsg,
				Params: map[string]interface{}{
					"file":  "ddl",
					"error": fmt.Sprintf("object with ddlEntityId = %v is incorrect: unsupported kind %v", table.DdlEntityId, table.Kind),
				},
			}
		}
	}

	ddlComparisons := buildArc.PackageDdlComparisons
	info := buildArc.PackageInfo
	if info.NoChangelog && len(ddlComparisons.Comparisons) != 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ChangesAreNotEmpty,
			Message: exception.ChangesAreNotEmptyMsg,
		}
	}

	// A DDL comparison is only required when the build actually carries DDL contracts to diff;
	// packages without DDL contracts never populate ddl-comparisons.json.
	if !info.NoChangelog && info.PreviousVersion != "" && len(buildArc.PackageDdlContracts.Tables) != 0 && len(ddlComparisons.Comparisons) == 0 {
		if err := p.validatePreviousVersionComparisonRequired(ctx, info, "ddl-comparisons", "at least one ddl comparison required for publishing package with previous version when ddl contracts are present"); err != nil {
			return err
		}
	}

	entries := make([]view.ComparisonKey, 0, len(ddlComparisons.Comparisons))
	for _, comparison := range ddlComparisons.Comparisons {
		entries = append(entries, view.ComparisonKey{
			PackageId:                comparison.PackageId,
			Version:                  comparison.Version,
			Revision:                 comparison.Revision,
			PreviousVersionPackageId: comparison.PreviousVersionPackageId,
			PreviousVersion:          comparison.PreviousVersion,
			PreviousVersionRevision:  comparison.PreviousVersionRevision,
		})
	}
	return p.validateComparisonEntries(ctx, buildArc, entries)
}

func (p publishedValidatorImpl) validatePackageMcpContracts(buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error {
	if err := utils.ValidateObject(buildArc.PackageMcpContracts); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "mcp", "error": err.Error()},
		}
	}

	validMcpKinds := map[string]struct{}{
		view.McpEntityKindInit:     {},
		view.McpEntityKindTool:     {},
		view.McpEntityKindPrompt:   {},
		view.McpEntityKindResource: {},
	}

	mcp := buildArc.PackageMcpContracts
	allContracts := make([]view.PackageMcpContract, 0, len(mcp.Inits)+len(mcp.Tools)+len(mcp.Resources)+len(mcp.Prompts))
	allContracts = append(allContracts, mcp.Inits...)
	allContracts = append(allContracts, mcp.Tools...)
	allContracts = append(allContracts, mcp.Resources...)
	allContracts = append(allContracts, mcp.Prompts...)

	for _, contract := range allContracts {
		if _, valid := validMcpKinds[contract.Kind]; !valid {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidPackagedFile,
				Message: exception.InvalidPackagedFileMsg,
				Params: map[string]interface{}{
					"file":  "mcp",
					"error": fmt.Sprintf("object with mcpEntityId = %v is incorrect: unsupported kind %v", contract.McpEntityId, contract.Kind),
				},
			}
		}
	}

	return nil
}

func (p publishedValidatorImpl) ValidateBuildNotifications(buildArc *archive.BuildResultArchive) error {
	if err := utils.ValidateObject(buildArc.BuildNotifications); err != nil {
		return invalidNotificationsFile(archive.BuildNotificationsFilePath, err.Error())
	}
	for i, notification := range buildArc.BuildNotifications.Notifications {
		if err := validateNotification(notification); err != nil {
			return invalidNotificationsFile(archive.BuildNotificationsFilePath, fmt.Sprintf("notifications[%v]: %v", i, err.Error()))
		}
	}
	return nil
}

func (p publishedValidatorImpl) ValidateComparisonNotifications(buildArc *archive.BuildResultArchive) error {
	if err := utils.ValidateObject(buildArc.ComparisonNotifications); err != nil {
		return invalidNotificationsFile(archive.ComparisonNotificationsFilePath, err.Error())
	}
	if len(buildArc.ComparisonNotifications.Comparisons) == 0 {
		return nil
	}

	// Only comparisons the build calculated are eligible. A comparison reused from the backend creates no
	// version_comparison row here, so an entry for it would have nothing to be stored against - and it would
	// clear the notifications recorded when that comparison was really calculated.
	cachedComparisons := cachedComparisonKeys(buildArc)
	calculatedComparisons := make(map[view.ComparisonKey]struct{})
	for _, comparison := range buildArc.PackageComparisons.Comparisons {
		key := view.ComparisonKey{
			PackageId:                comparison.PackageId,
			Version:                  comparison.Version,
			Revision:                 comparison.Revision,
			PreviousVersionPackageId: comparison.PreviousVersionPackageId,
			PreviousVersion:          comparison.PreviousVersion,
			PreviousVersionRevision:  comparison.PreviousVersionRevision,
		}
		if _, cached := cachedComparisons[key]; cached {
			continue
		}
		calculatedComparisons[key] = struct{}{}
	}
	for _, comparison := range buildArc.PackageDdlComparisons.Comparisons {
		key := view.ComparisonKey{
			PackageId:                comparison.PackageId,
			Version:                  comparison.Version,
			Revision:                 comparison.Revision,
			PreviousVersionPackageId: comparison.PreviousVersionPackageId,
			PreviousVersion:          comparison.PreviousVersion,
			PreviousVersionRevision:  comparison.PreviousVersionRevision,
		}
		if _, cached := cachedComparisons[key]; cached {
			continue
		}
		calculatedComparisons[key] = struct{}{}
	}

	for i, comparison := range buildArc.ComparisonNotifications.Comparisons {
		key := view.ComparisonKey{
			PackageId:                comparison.PackageId,
			Version:                  comparison.Version,
			Revision:                 comparison.Revision,
			PreviousVersionPackageId: comparison.PreviousVersionPackageId,
			PreviousVersion:          comparison.PreviousVersion,
			PreviousVersionRevision:  comparison.PreviousVersionRevision,
		}
		if _, exists := calculatedComparisons[key]; !exists {
			return invalidNotificationsFile(archive.ComparisonNotificationsFilePath, fmt.Sprintf(
				"comparisons[%v]: %v@%v vs %v@%v does not match any comparison calculated by this build",
				i, comparison.PackageId, comparison.Version, comparison.PreviousVersionPackageId, comparison.PreviousVersion))
		}
		for j, notification := range comparison.Notifications {
			if err := validateNotification(notification); err != nil {
				return invalidNotificationsFile(archive.ComparisonNotificationsFilePath,
					fmt.Sprintf("comparisons[%v].notifications[%v]: %v", i, j, err.Error()))
			}
		}
	}
	return nil
}

func ValidateFailedBuildNotifications(part view.FailedBuildNotifications) error {
	if err := utils.ValidateObject(part); err != nil {
		return err
	}
	for i, notification := range part.Notifications {
		if err := validateNotification(notification); err != nil {
			return fmt.Errorf("notifications[%v]: %w", i, err)
		}
	}
	for i, notification := range part.ComparisonNotifications {
		if err := validateNotification(notification); err != nil {
			return fmt.Errorf("comparisonNotifications[%v]: %w", i, err)
		}
	}
	return nil
}

func validateNotification(notification view.BuilderNotification) error {
	if _, err := view.NotificationSeverityFromBuilder(notification.Severity); err != nil {
		return err
	}
	if notification.Message == "" {
		return fmt.Errorf("message is required")
	}
	if notification.Category == "" {
		return fmt.Errorf("category is required")
	}
	return nil
}

func invalidNotificationsFile(filePath string, errText string) error {
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.InvalidPackagedFile,
		Message: exception.InvalidPackagedFileMsg,
		Params:  map[string]interface{}{"file": filePath, "error": errText},
	}
}

func (p publishedValidatorImpl) validateVersionInternalDocuments(buildArc *archive.BuildResultArchive) error {
	if err := utils.ValidateObject(buildArc.VersionInternalDocuments); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "version-internal-documents", "error": err.Error()},
		}
	}
	return nil
}

func (p publishedValidatorImpl) validateComparisonInternalDocuments(buildArc *archive.BuildResultArchive) error {
	if err := utils.ValidateObject(buildArc.ComparisonInternalDocuments); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "comparison-internal-documents", "error": err.Error()},
		}
	}
	return nil
}
