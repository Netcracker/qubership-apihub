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

package validation

import (
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
	ValidatePackage(buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error
	ValidateBuildResultAgainstConfig(buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error //TODO remove and merge logic with ValidatePackage
	ValidateChanges(buildArc *archive.BuildResultArchive) error                                                 //TODO remove and merge logic with ValidatePackage
}

func NewPublishedValidator(publishedRepo repository.PublishedRepository) PublishedValidator {
	return &publishedValidatorImpl{
		publishedRepo: publishedRepo,
	}
}

type publishedValidatorImpl struct {
	publishedRepo repository.PublishedRepository
}

func (p publishedValidatorImpl) ValidatePackage(buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error {
	if err := p.validatePackageInfo(buildArc, buildConfig); err != nil {
		return err
	}

	if err := p.validatePackageDocuments(buildArc, buildConfig); err != nil {
		return err
	}

	if err := p.validatePackageOperations(buildArc, buildConfig); err != nil {
		return err
	}

	if err := p.validatePackageComparisons(buildArc, buildConfig); err != nil {
		return err
	}

	if err := p.validatePackageBuilderNotifications(buildArc, buildConfig); err != nil {
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

func (p publishedValidatorImpl) ValidateChanges(buildArc *archive.BuildResultArchive) error {
	info := view.MakeChangelogInfoFileView(buildArc.PackageInfo)
	comparisons := buildArc.PackageComparisons
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

	if len(comparisons.Comparisons) == 0 {
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
	for _, comparison := range comparisons.Comparisons {
		if comparison.Version != "" {
			if (buildArc.PackageInfo.Revision != comparison.Revision && comparison.Revision != 0) ||
				buildArc.PackageInfo.Version != comparison.Version ||
				buildArc.PackageInfo.PackageId != comparison.PackageId {
				versionEnt, err := p.publishedRepo.GetVersionByRevision(comparison.PackageId, comparison.Version, comparison.Revision)
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
			previousVersionEnt, err := p.publishedRepo.GetVersionByRevision(comparison.PreviousVersionPackageId, comparison.PreviousVersion, comparison.PreviousVersionRevision)
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
		if comparison.FromCache {
			comparisonId := view.MakeVersionComparisonId(
				comparison.PackageId,
				comparison.Version,
				comparison.Revision,
				comparison.PreviousVersionPackageId,
				comparison.PreviousVersion,
				comparison.PreviousVersionRevision)
			comparisonEntity, err := p.publishedRepo.GetVersionComparison(comparisonId)
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
		}
	}

	return nil
}

func (p publishedValidatorImpl) validatePackageInfo(buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error {
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
		ent, err := p.publishedRepo.GetVersion(buildArc.PackageInfo.PackageId, buildArc.PackageInfo.Version)
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
			for scope := range operation.SearchScopes {
				if !view.ValidRestOperationScope(scope) {
					return &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.InvalidPackagedFile,
						Message: exception.InvalidPackagedFileMsg,
						Params: map[string]interface{}{
							"file":  "operations",
							"error": fmt.Sprintf("object with operationId = %v is incorrect: search scope %v doesn't exist for %v api type", operation.OperationId, scope, apiType),
						},
					}
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
			for scope := range operation.SearchScopes {
				if !view.ValidGraphqlOperationScope(scope) {
					return &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.InvalidPackagedFile,
						Message: exception.InvalidPackagedFileMsg,
						Params: map[string]interface{}{
							"file":  "operations",
							"error": fmt.Sprintf("object with operationId = %v is incorrect: search scope %v doesn't exist for %v api type", operation.OperationId, scope, apiType),
						},
					}
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
		default:

		}
	}

	return nil
}

func (p publishedValidatorImpl) validatePackageComparisons(buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error {
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
		// need to check if previous version was deleted
		prevPkgId := ""
		if info.PreviousVersionPackageId != "" {
			prevPkgId = info.PreviousVersionPackageId
		} else {
			prevPkgId = info.PackageId
		}
		pvEnt, err := p.publishedRepo.GetVersionIncludingDeleted(prevPkgId, info.PreviousVersion)
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
		} else {
			// previous version is not deleted, and we don't have comparisons
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidPackagedFile,
				Message: exception.InvalidPackagedFileMsg,
				Params:  map[string]interface{}{"file": "comparisons", "error": "at least one comparison required for publishing package with previous version"},
			}
		}
	}

	excludedRefs := make(map[string]struct{}, 0)
	for _, ref := range info.Refs {
		if ref.Excluded {
			excludedRefs[view.MakePackageVersionRefKey(ref.RefId, ref.Version)] = struct{}{}
		}
	}
	for _, comparison := range comparisons.Comparisons {
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
				versionEnt, err := p.publishedRepo.GetVersionIncludingDeleted(comparison.PackageId, view.MakeVersionRefKey(comparison.Version, comparison.Revision))
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
			previousVersionEnt, err := p.publishedRepo.GetVersionIncludingDeleted(comparison.PreviousVersionPackageId, view.MakeVersionRefKey(comparison.PreviousVersion, comparison.PreviousVersionRevision))
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
		if comparison.FromCache {
			comparisonId := view.MakeVersionComparisonId(
				comparison.PackageId,
				comparison.Version,
				comparison.Revision,
				comparison.PreviousVersionPackageId,
				comparison.PreviousVersion,
				comparison.PreviousVersionRevision)
			comparisonEntity, err := p.publishedRepo.GetVersionComparison(comparisonId)
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

func (p publishedValidatorImpl) validatePackageBuilderNotifications(buildArc *archive.BuildResultArchive, buildConfig *view.BuildConfig) error {
	if err := utils.ValidateObject(buildArc.BuilderNotifications); err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "notifications", "error": err.Error()},
		}
	}
	return nil
}
