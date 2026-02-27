package archive

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type BuildResultToEntitiesReader struct {
	*BuildResultArchive
}

func NewBuildResultToEntitiesReader(buildArc *BuildResultArchive) *BuildResultToEntitiesReader {
	return &BuildResultToEntitiesReader{
		BuildResultArchive: buildArc,
	}
}

func (a *BuildResultToEntitiesReader) ReadDocumentsToEntities() ([]*entity.PublishedContentEntity, []*entity.PublishedContentDataEntity, error) {
	filesFromZipReadStart := time.Now()
	fileEntities := make([]*entity.PublishedContentEntity, 0)
	fileDataEntities := make([]*entity.PublishedContentDataEntity, 0)

	for i, document := range a.PackageDocuments.Documents {
		if fileHeader, exists := a.DocumentsHeaders[document.Filename]; exists {
			fileData, err := ReadZipFile(fileHeader)
			if err != nil {
				return nil, nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackageArchivedFile,
					Message: exception.InvalidPackageArchivedFileMsg,
					Params:  map[string]interface{}{"file": document.Slug, "error": err.Error()},
				}
			}
			mediaType := getMediaType(fileData)
			path, name := utils.SplitFileId(document.FileId)
			checksum := utils.GetEncodedChecksum(fileData, []byte(document.FileId), []byte(mediaType))
			fileEntMetadata := entity.Metadata{}
			var documentMetadata entity.Metadata = document.Metadata

			if document.Description != "" {
				fileEntMetadata.SetDescription(document.Description)
			}
			if document.Version != "" {
				fileEntMetadata.SetVersion(document.Version)
			}
			if len(documentMetadata) > 0 {
				docLabels := documentMetadata.GetStringArray("labels")
				if len(docLabels) > 0 {
					fileEntMetadata.SetLabels(docLabels)
				}
				docBlobId := documentMetadata.GetStringValue("blobId")
				if docBlobId != "" {
					fileEntMetadata.SetBlobId(docBlobId)
				}
				docInfo := documentMetadata.GetObject("info")
				if docInfo != nil {
					fileEntMetadata.SetInfo(docInfo)
				}
				docExternalDocs := documentMetadata.GetObject("externalDocs")
				if docExternalDocs != nil {
					fileEntMetadata.SetExternalDocs(docExternalDocs)
				}

				tags, err := documentMetadata.GetObjectArray("tags")
				if err != nil {
					return nil, nil, &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.InvalidPackagedFile,
						Message: exception.InvalidPackagedFileMsg,
						Params:  map[string]interface{}{"file": document.Slug, "error": err.Error()},
					}
				}
				if tags != nil {
					fileEntMetadata.SetDocTags(tags)
				}
			}
			index := i
			if a.PackageInfo.MigrationBuild {
				index = documentMetadata.GetIntValue("index")
			}
			fileEntities = append(fileEntities, &entity.PublishedContentEntity{
				PackageId:    a.PackageInfo.PackageId,
				Version:      a.PackageInfo.Version,
				Revision:     a.PackageInfo.Revision,
				FileId:       document.FileId,
				Checksum:     checksum,
				Index:        index,
				Slug:         document.Slug,
				Name:         name,
				Path:         path,
				DataType:     document.Type,
				Format:       document.Format,
				Title:        document.Title,
				Metadata:     fileEntMetadata,
				OperationIds: document.OperationIds,
				Filename:     document.Filename,
			})
			fileDataEntities = append(fileDataEntities, &entity.PublishedContentDataEntity{
				PackageId: a.PackageInfo.PackageId,
				Checksum:  checksum,
				MediaType: mediaType,
				Data:      fileData,
			})
		}
	}
	log.Debugf("Zip documents reading time: %vms", time.Since(filesFromZipReadStart).Milliseconds())
	return fileEntities, fileDataEntities, nil
}

func (a *BuildResultToEntitiesReader) ReadTransformedDocumentsToEntity() (*entity.TransformedContentDataEntity, error) {
	var data []byte
	if a.PackageInfo.BuildType == view.MergedSpecificationType_deprecated {
		if len(a.PackageDocuments.Documents) != 1 {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidPackageArchivedFile,
				Message: exception.InvalidPackageArchivedFileMsg,
				Params: map[string]interface{}{
					"file":  "documents",
					"error": fmt.Sprintf("expected exactly 1 document for '%v' buildType, documents: %v", a.PackageInfo.BuildType, len(a.PackageDocuments.Documents)),
				},
			}
		}
		document := a.PackageDocuments.Documents[0]
		if fileHeader, exists := a.DocumentsHeaders[document.Filename]; exists {
			fileData, err := ReadZipFile(fileHeader)
			if err != nil {
				return nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackageArchivedFile,
					Message: exception.InvalidPackageArchivedFileMsg,
					Params:  map[string]interface{}{"file": document.Slug, "error": err.Error()},
				}
			}
			data = fileData
		}
	} else {
		zipBuf := bytes.Buffer{}
		zw := zip.NewWriter(&zipBuf)
		for _, document := range a.PackageDocuments.Documents {
			if fileHeader, exists := a.DocumentsHeaders[document.Filename]; exists {
				fileData, err := ReadZipFile(fileHeader)
				if err != nil {
					return nil, &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.InvalidPackageArchivedFile,
						Message: exception.InvalidPackageArchivedFileMsg,
						Params:  map[string]interface{}{"file": document.Slug, "error": err.Error()},
					}
				}
				err = AddFileToZip(zw, document.Filename, fileData)
				if err != nil {
					return nil, err
				}
			}
		}
		err := zw.Close()
		if err != nil {
			return nil, err
		}
		data = zipBuf.Bytes()
	}
	format := a.PackageInfo.Format
	if format == "" {
		format = string(view.JsonDocumentFormat)
	}
	return &entity.TransformedContentDataEntity{
		PackageId:     a.PackageInfo.PackageId,
		Version:       a.PackageInfo.Version,
		Revision:      a.PackageInfo.Revision,
		ApiType:       a.PackageInfo.ApiType,
		BuildType:     a.PackageInfo.BuildType,
		Format:        format,
		GroupId:       view.MakeOperationGroupId(a.PackageInfo.PackageId, a.PackageInfo.Version, a.PackageInfo.Revision, a.PackageInfo.ApiType, a.PackageInfo.GroupName),
		Data:          data,
		DocumentsInfo: a.PackageDocuments.Documents,
	}, nil
}

func (a *BuildResultToEntitiesReader) ReadOperationsToEntities() ([]*entity.OperationEntity, []*entity.OperationDataEntity, map[string]entity.OperationInfo, error) {
	operationsFromZipReadStart := time.Now()
	operationEntities := make([]*entity.OperationEntity, 0)
	operationDataEntities := make([]*entity.OperationDataEntity, 0)
	operationsInfo := make(map[string]entity.OperationInfo)
	operationsExternalMetadataMap := a.calculateOperationsExternalMetadataMap()
	for _, operation := range a.PackageOperations.Operations {
		var fileData []byte
		var dataHash *string
		fileHeader, exists := a.OperationFileHeaders[operation.OperationId]

		if exists {
			var err error
			fileData, err = ReadZipFile(fileHeader)
			if err != nil {
				return nil, nil, nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackageArchivedFile,
					Message: exception.InvalidPackageArchivedFileMsg,
					Params:  map[string]interface{}{"file": operation.OperationId, "error": err.Error()},
				}
			}
			hash := utils.GetEncodedXXHash128(fileData)
			dataHash = &hash
		} else if operation.ApiType == string(view.GraphqlApiType) {
			dataHash = nil
		} else {
			continue
		}

		metadata := entity.Metadata{}
		var operationMetadata entity.Metadata = operation.Metadata
		var customTags map[string]interface{}
		switch operation.ApiType {
		case string(view.RestApiType):
			if len(operation.Tags) > 0 {
				metadata.SetTags(operation.Tags)
			}
			metadata.SetPath(operationMetadata.GetStringValue("path"))
			metadata.SetMethod(operationMetadata.GetStringValue("method"))
		case string(view.GraphqlApiType):
			if len(operation.Tags) > 0 {
				metadata.SetTags(operation.Tags)
			}
			metadata.SetType(operationMetadata.GetStringValue("type"))
			metadata.SetMethod(operationMetadata.GetStringValue("method"))
		case string(view.ProtobufApiType):
			metadata.SetType(operationMetadata.GetStringValue("type"))
			metadata.SetMethod(operationMetadata.GetStringValue("method"))
		case string(view.AsyncapiApiType):
			if len(operation.Tags) > 0 {
				metadata.SetTags(operation.Tags)
			}
			metadata.SetAction(operationMetadata.GetStringValue("action"))
			metadata.SetChannel(operationMetadata.GetStringValue("channel"))
			metadata.SetProtocol(operationMetadata.GetStringValue("protocol"))
		}

		if operationMetadata.GetOperationIdV1() != "" {
			metadata.SetOperationIdV1(operationMetadata.GetOperationIdV1())
		}

		var err error
		customTags, err = operationMetadata.GetMapStringToInterface("customTags")
		if err != nil {
			return nil, nil, nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidPackagedFile,
				Message: exception.InvalidPackagedFileMsg,
				Params: map[string]interface{}{"file": "operations.json", "error": fmt.Sprintf("Unable to process field 'customTags' value '%s': %s",
					operationMetadata.GetObject("customTags"), err.Error())},
			}
		}
		operationExternalMetadataKey := view.OperationExternalMetadataKey{
			ApiType: operation.ApiType,
			Method:  strings.ToLower(metadata.GetMethod()),
			Path:    operationMetadata.GetStringValue("originalPath"),
		}
		operationExternalMetadata := operationsExternalMetadataMap[operationExternalMetadataKey]

		if len(operationExternalMetadata) != 0 && customTags == nil {
			customTags = make(map[string]interface{})
		}

		for k, v := range operationExternalMetadata {
			customTags[k] = v
		}

		operationEntities = append(operationEntities, &entity.OperationEntity{
			PackageId:                 a.PackageInfo.PackageId,
			Version:                   a.PackageInfo.Version,
			Revision:                  a.PackageInfo.Revision,
			OperationId:               operation.OperationId,
			DataHash:                  dataHash,
			Deprecated:                operation.Deprecated,
			Kind:                      operation.ApiKind,
			Type:                      operation.ApiType,
			Title:                     operation.Title,
			Metadata:                  metadata,
			DeprecatedItems:           operation.DeprecatedItems,
			DeprecatedInfo:            operation.DeprecatedInfo,
			PreviousReleaseVersions:   operation.PreviousReleaseVersions,
			Models:                    operation.Models,
			CustomTags:                customTags,
			ApiAudience:               operation.ApiAudience,
			DocumentId:                operation.DocumentId,
			VersionInternalDocumentId: operation.VersionInternalDocumentId,
		})

		if dataHash != nil {
			operationDataEntities = append(operationDataEntities, &entity.OperationDataEntity{
				DataHash:    *dataHash,
				Data:        fileData,
				SearchScope: operation.SearchScopes,
			})
		}

		operationsInfo[operation.OperationId] = entity.OperationInfo{
			ApiType:  operation.ApiType,
			DataHash: dataHash,
		}
	}
	log.Debugf("Zip operations reading time: %vms", time.Since(operationsFromZipReadStart).Milliseconds())
	return operationEntities, operationDataEntities, operationsInfo, nil
}

func (a *BuildResultToEntitiesReader) ReadOperationComparisonsToEntities(publishingOperationsInfo map[string]entity.OperationInfo, operationRepository repository.OperationRepository) ([]*entity.VersionComparisonEntity, []*entity.OperationComparisonEntity, []string, map[string]view.ComparisonKey, error) {
	versionComparisonEntities := make([]*entity.VersionComparisonEntity, 0)
	operationComparisonEntities := make([]*entity.OperationComparisonEntity, 0)
	versionComparisonsFromCache := make([]string, 0)
	comparisonFileIdToKeyMap := make(map[string]view.ComparisonKey)
	var mainVersionComparison *entity.VersionComparisonEntity
	mainVersionRefs := make([]string, 0)
	for _, comparison := range a.PackageComparisons.Comparisons {
		versionComparisonEnt := &entity.VersionComparisonEntity{}
		mainVersion := false
		if comparison.Version != "" {
			//check if comparison's current version is a version that is being published
			if (a.PackageInfo.Revision == comparison.Revision || comparison.Revision == 0) &&
				a.PackageInfo.Version == comparison.Version &&
				a.PackageInfo.PackageId == comparison.PackageId {
				mainVersion = true
				mainVersionComparison = versionComparisonEnt
				versionComparisonEnt.PackageId = comparison.PackageId
				versionComparisonEnt.Version = a.PackageInfo.Version
				versionComparisonEnt.Revision = a.PackageInfo.Revision
			} else {
				versionComparisonEnt.PackageId = comparison.PackageId
				versionComparisonEnt.Version = comparison.Version
				versionComparisonEnt.Revision = comparison.Revision
			}
		}
		if comparison.PreviousVersion != "" {
			versionComparisonEnt.PreviousPackageId = comparison.PreviousVersionPackageId
			versionComparisonEnt.PreviousVersion = comparison.PreviousVersion
			versionComparisonEnt.PreviousRevision = comparison.PreviousVersionRevision
		}
		versionComparisonEnt.NoContent = false
		versionComparisonEnt.LastActive = time.Now()
		versionComparisonEnt.OperationTypes = comparison.OperationTypes
		versionComparisonEnt.BuilderVersion = a.PackageInfo.BuilderVersion
		versionComparisonEnt.ComparisonId = view.MakeVersionComparisonId(
			versionComparisonEnt.PackageId,
			versionComparisonEnt.Version,
			versionComparisonEnt.Revision,
			versionComparisonEnt.PreviousPackageId,
			versionComparisonEnt.PreviousVersion,
			versionComparisonEnt.PreviousRevision)
		versionComparisonEnt.Metadata = entity.Metadata{}
		if a.PackageInfo.MigrationBuild {
			versionComparisonEnt.Metadata.SetMigrationId(a.PackageInfo.MigrationId)
		}
		if !mainVersion {
			mainVersionRefs = append(mainVersionRefs, versionComparisonEnt.ComparisonId)
		}
		if comparison.ComparisonFileId != "" {
			comparisonFileIdToKeyMap[comparison.ComparisonFileId] = view.ComparisonKey{
				PackageId:                versionComparisonEnt.PackageId,
				Version:                  versionComparisonEnt.Version,
				Revision:                 versionComparisonEnt.Revision,
				PreviousVersion:          versionComparisonEnt.PreviousVersion,
				PreviousVersionRevision:  versionComparisonEnt.PreviousRevision,
				PreviousVersionPackageId: versionComparisonEnt.PreviousPackageId,
			}
		}
		if comparison.FromCache {
			versionComparisonsFromCache = append(versionComparisonsFromCache, versionComparisonEnt.ComparisonId)
			continue
		}
		versionComparisonEntities = append(versionComparisonEntities, versionComparisonEnt)
		if comparison.ComparisonFileId == "" {
			continue
		}
		if fileHeader, exists := a.ComparisonsFileHeaders[comparison.ComparisonFileId]; exists {
			fileData, err := ReadZipFile(fileHeader)
			if err != nil {
				return nil, nil, nil, nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackageArchivedFile,
					Message: exception.InvalidPackageArchivedFileMsg,
					Params:  map[string]interface{}{"file": comparison.ComparisonFileId, "error": err.Error()},
				}
			}
			var operationChanges view.PackageOperationChanges
			err = json.Unmarshal(fileData, &operationChanges)
			if err != nil {
				return nil, nil, nil, nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackageArchivedFile,
					Message: exception.InvalidPackageArchivedFileMsg,
					Params:  map[string]interface{}{"file": comparison.ComparisonFileId, "error": "failed to unmarshal operation changes"},
					Debug:   err.Error(),
				}
			}
			validationErr := utils.ValidateObject(operationChanges)
			if validationErr != nil {
				return nil, nil, nil, nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackagedFile,
					Message: exception.InvalidPackagedFileMsg,
					Params:  map[string]interface{}{"file": comparison.ComparisonFileId, "error": validationErr.Error()},
				}
			}

			var operationsInfo map[string]entity.OperationInfo
			if publishingOperationsInfo != nil && mainVersion {
				operationsInfo = publishingOperationsInfo
			} else if operationRepository != nil {
				operationsInfoEntity, err := operationRepository.GetOperationsInfo(
					versionComparisonEnt.PackageId,
					versionComparisonEnt.Version,
					versionComparisonEnt.Revision,
				)
				if err != nil {
					return nil, nil, nil, nil, &exception.CustomError{
						Status:  http.StatusInternalServerError,
						Message: "Failed to get operations info for $packageId-$version-$revision",
						Debug:   err.Error(),
						Params:  map[string]interface{}{"packageId": versionComparisonEnt.PackageId, "version": versionComparisonEnt.Version, "revision": versionComparisonEnt.Revision},
					}
				}
				operationsInfo = operationsInfoEntity.OperationsInfo
			}

			var previousOperationsInfo map[string]entity.OperationInfo
			if versionComparisonEnt.PreviousPackageId != "" && versionComparisonEnt.PreviousVersion != "" && operationRepository != nil {
				previousOperationsInfoEntity, err := operationRepository.GetOperationsInfo(
					versionComparisonEnt.PreviousPackageId,
					versionComparisonEnt.PreviousVersion,
					versionComparisonEnt.PreviousRevision,
				)
				if err != nil {
					return nil, nil, nil, nil, &exception.CustomError{
						Status:  http.StatusInternalServerError,
						Message: "Failed to get operations info for $packageId-$version-$revision",
						Debug:   err.Error(),
						Params:  map[string]interface{}{"packageId": versionComparisonEnt.PreviousPackageId, "version": versionComparisonEnt.PreviousVersion, "revision": versionComparisonEnt.PreviousRevision},
					}
				}
				previousOperationsInfo = previousOperationsInfoEntity.OperationsInfo
			}

			for _, operationComparison := range operationChanges.OperationComparisons {
				operationInfo := operationsInfo[operationComparison.OperationId]
				previousOperationInfo := previousOperationsInfo[operationComparison.PreviousOperationId]

				isGraphQL := operationInfo.ApiType == string(view.GraphqlApiType) || previousOperationInfo.ApiType == string(view.GraphqlApiType)
				if !isGraphQL {
					var dataHashStr, previousDataHashStr string
					if operationInfo.DataHash != nil {
						dataHashStr = *operationInfo.DataHash
					}
					if previousOperationInfo.DataHash != nil {
						previousDataHashStr = *previousOperationInfo.DataHash
					}
					err = validateOperationComparison(operationComparison, dataHashStr, previousDataHashStr)
					if err != nil {
						return nil, nil, nil, nil, &exception.CustomError{
							Status:  http.StatusBadRequest,
							Code:    exception.InvalidPackagedFile,
							Message: exception.InvalidPackagedFileMsg,
							Params:  map[string]interface{}{"file": comparison.ComparisonFileId, "error": err.Error()},
						}
					}
				}
				//todo maybe check that changedOperation.OperationId really exists in this package or in our db
				operationComparisonEntities = append(operationComparisonEntities,
					&entity.OperationComparisonEntity{
						PackageId:                    versionComparisonEnt.PackageId,
						Version:                      versionComparisonEnt.Version,
						Revision:                     versionComparisonEnt.Revision,
						OperationId:                  operationComparison.OperationId,
						PreviousPackageId:            versionComparisonEnt.PreviousPackageId,
						PreviousVersion:              versionComparisonEnt.PreviousVersion,
						PreviousRevision:             versionComparisonEnt.PreviousRevision,
						PreviousOperationId:          operationComparison.PreviousOperationId,
						ComparisonId:                 versionComparisonEnt.ComparisonId,
						DataHash:                     operationInfo.DataHash,
						PreviousDataHash:             previousOperationInfo.DataHash,
						ChangesSummary:               operationComparison.ChangeSummary,
						Changes:                      map[string]interface{}{"changes": operationComparison.Changes},
						ComparisonInternalDocumentId: operationComparison.ComparisonInternalDocumentId,
					})
			}
		}
	}
	if len(versionComparisonEntities) > 0 && mainVersionComparison == nil {
		return nil, nil, nil, nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackagedFile,
			Message: exception.InvalidPackagedFileMsg,
			Params:  map[string]interface{}{"file": "comparisons", "error": "comparison for a version specified in package info not found"},
		}
	}
	if mainVersionComparison != nil {
		mainVersionComparison.Refs = mainVersionRefs
	}
	return versionComparisonEntities, operationComparisonEntities, versionComparisonsFromCache, comparisonFileIdToKeyMap, nil
}

func validateOperationComparison(oc view.OperationComparison, dataHash string, previousDataHash string) error {
	oidIsEmpty := false
	if oc.OperationId == "" {
		if dataHash != "" {
			return fmt.Errorf("invalid operation comparison: operationId is empty, but dataHash is set to %s", dataHash)
		}
		oidIsEmpty = true
	} else {
		if dataHash == "" {
			return fmt.Errorf("invalid operation comparison: operationId is set to %s, but dataHash is empty", oc.OperationId)
		}
	}
	if oc.PreviousOperationId == "" {
		if previousDataHash != "" {
			return fmt.Errorf("invalid operation comparison: previousOperationId is empty, but previousDataHash is set to %s", previousDataHash)
		}
		if oidIsEmpty {
			return fmt.Errorf("invalid operation comparison: both operationId and previousOperationId are empty, jsonPath=%+v", oc.JsonPath)
		}
	} else {
		if previousDataHash == "" {
			return fmt.Errorf("invalid operation comparison: previousOperationId is set to %s, but previousDataHash is empty", oc.PreviousOperationId)
		}
	}
	return nil
}

func (a *BuildResultToEntitiesReader) ReadBuilderNotificationsToEntities(publishId string) []*entity.BuilderNotificationsEntity {
	builderNotificationsEntities := make([]*entity.BuilderNotificationsEntity, 0)
	for _, builderNotifications := range a.BuilderNotifications.Notifications {
		builderNotificationsEntities = append(builderNotificationsEntities,
			&entity.BuilderNotificationsEntity{
				BuildId:  publishId,
				Severity: builderNotifications.Severity,
				Message:  builderNotifications.Message,
				FileId:   builderNotifications.FileId,
			})
	}
	return builderNotificationsEntities
}

func (a *BuildResultToEntitiesReader) ReadVersionInternalDocumentsToEntities() ([]*entity.VersionInternalDocumentEntity, []*entity.VersionInternalDocumentDataEntity, error) {
	filesFromZipReadStart := time.Now()
	versionInternalDocEntities := make([]*entity.VersionInternalDocumentEntity, 0)
	versionInternalDocDataEntities := make([]*entity.VersionInternalDocumentDataEntity, 0)

	for _, document := range a.VersionInternalDocuments.Documents {
		if fileHeader, exists := a.VersionInternalDocumentsHeaders[document.Filename]; exists {
			fileData, err := ReadZipFile(fileHeader)
			if err != nil {
				return nil, nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackageArchivedFile,
					Message: exception.InvalidPackageArchivedFileMsg,
					Params:  map[string]interface{}{"file": document.Filename, "error": err.Error()},
				}
			}
			hash := utils.GetEncodedXXHash128(fileData, []byte(document.Filename))
			versionInternalDocEntities = append(versionInternalDocEntities, &entity.VersionInternalDocumentEntity{
				PackageId:  a.PackageInfo.PackageId,
				Version:    a.PackageInfo.Version,
				Revision:   a.PackageInfo.Revision,
				DocumentId: document.Id,
				Filename:   document.Filename,
				Hash:       hash,
			})
			versionInternalDocDataEntities = append(versionInternalDocDataEntities, &entity.VersionInternalDocumentDataEntity{
				Hash: hash,
				Data: fileData,
			})
		}
	}
	log.Debugf("Zip version internal documents reading time: %vms", time.Since(filesFromZipReadStart).Milliseconds())
	return versionInternalDocEntities, versionInternalDocDataEntities, nil
}

func (a *BuildResultToEntitiesReader) ReadComparisonInternalDocumentsToEntities(comparisonFileIdToKeyMap map[string]view.ComparisonKey) ([]*entity.ComparisonInternalDocumentEntity, []*entity.ComparisonInternalDocumentDataEntity, error) {
	filesFromZipReadStart := time.Now()
	comparisonInternalDocEntities := make([]*entity.ComparisonInternalDocumentEntity, 0)
	comparisonInternalDocDataEntities := make([]*entity.ComparisonInternalDocumentDataEntity, 0)

	for _, document := range a.ComparisonInternalDocuments.Documents {
		if fileHeader, exists := a.ComparisonInternalDocumentsHeaders[document.Filename]; exists {
			fileData, err := ReadZipFile(fileHeader)
			if err != nil {
				return nil, nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidPackageArchivedFile,
					Message: exception.InvalidPackageArchivedFileMsg,
					Params:  map[string]interface{}{"file": document.Filename, "error": err.Error()},
				}
			}
			hash := utils.GetEncodedXXHash128(fileData, []byte(document.Filename))

			comparisonKey, exists := comparisonFileIdToKeyMap[document.ComparisonFileId]
			if !exists {
				var previousPackageId string
				if a.PackageInfo.PreviousVersionPackageId != "" {
					previousPackageId = a.PackageInfo.PreviousVersionPackageId
				} else {
					previousPackageId = a.PackageInfo.PackageId
				}
				comparisonKey = view.ComparisonKey{
					PackageId:                a.PackageInfo.PackageId,
					Version:                  a.PackageInfo.Version,
					Revision:                 a.PackageInfo.Revision,
					PreviousVersionPackageId: previousPackageId,
					PreviousVersion:          a.PackageInfo.PreviousVersion,
					PreviousVersionRevision:  a.PackageInfo.PreviousVersionRevision,
				}
			}

			comparisonInternalDocEntities = append(comparisonInternalDocEntities, &entity.ComparisonInternalDocumentEntity{
				PackageId:         comparisonKey.PackageId,
				Version:           comparisonKey.Version,
				Revision:          comparisonKey.Revision,
				PreviousPackageId: comparisonKey.PreviousVersionPackageId,
				PreviousVersion:   comparisonKey.PreviousVersion,
				PreviousRevision:  comparisonKey.PreviousVersionRevision,
				DocumentId:        document.Id,
				Filename:          document.Filename,
				Hash:              hash,
			})
			comparisonInternalDocDataEntities = append(comparisonInternalDocDataEntities, &entity.ComparisonInternalDocumentDataEntity{
				Hash: hash,
				Data: fileData,
			})
		}
	}
	log.Debugf("Zip comparison internal documents reading time: %vms", time.Since(filesFromZipReadStart).Milliseconds())
	return comparisonInternalDocEntities, comparisonInternalDocDataEntities, nil
}

func (a *BuildResultToEntitiesReader) calculateOperationsExternalMetadataMap() map[view.OperationExternalMetadataKey]map[string]interface{} {
	result := map[view.OperationExternalMetadataKey]map[string]interface{}{}
	if a.PackageInfo.ExternalMetadata == nil {
		return result
	}

	for _, meta := range a.PackageInfo.ExternalMetadata.Operations {
		result[view.OperationExternalMetadataKey{
			ApiType: meta.ApiType,
			Method:  strings.ToLower(meta.Method),
			Path:    meta.Path,
		}] = meta.ExternalMetadata
	}

	return result
}
