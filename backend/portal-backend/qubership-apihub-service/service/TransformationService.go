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
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type TransformationService interface {
	GetDataForDocumentsTransformation(packageId, version string, filterReq view.DocumentsForTransformationFilterReq) (interface{}, error)
}

func NewTransformationService(publishedRepo repository.PublishedRepository, operationRepo repository.OperationRepository) TransformationService {
	return &transformationServiceImpl{publishedRepo: publishedRepo, operationRepo: operationRepo}
}

type transformationServiceImpl struct {
	publishedRepo repository.PublishedRepository
	operationRepo repository.OperationRepository
}

func (t transformationServiceImpl) GetDataForDocumentsTransformation(packageId, version string, filterReq view.DocumentsForTransformationFilterReq) (interface{}, error) {
	versionEnt, err := t.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version},
		}
	}

	searchQuery := entity.ContentForDocumentsTransformationSearchQueryEntity{
		Limit:               filterReq.Limit,
		Offset:              filterReq.Offset,
		DocumentTypesFilter: view.GetDocumentTypesForApiType(filterReq.ApiType),
		OperationGroup:      view.MakeOperationGroupId(packageId, versionEnt.Version, versionEnt.Revision, filterReq.ApiType, filterReq.FilterByOperationGroup),
	}
	existingGroup, err := t.operationRepo.GetOperationGroup(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, filterReq.ApiType, filterReq.FilterByOperationGroup)
	if err != nil {
		return nil, err
	}
	if existingGroup == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationGroupNotFound,
			Message: exception.OperationGroupNotFoundMsg,
			Params:  map[string]interface{}{"groupName": filterReq.FilterByOperationGroup},
		}
	}

	operationByGroupEnts, err := t.operationRepo.GetGroupedOperations(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, filterReq.ApiType, filterReq.FilterByOperationGroup, view.OperationListReq{})
	if err != nil {
		return nil, err
	}
	operationIdsByGroupName := entity.MakeOperationIdsSlice(operationByGroupEnts)
	versionDocuments := make([]view.DocumentForTransformationView, 0)
	content, err := t.publishedRepo.GetVersionRevisionContentForDocumentsTransformation(packageId, versionEnt.Version, versionEnt.Revision, searchQuery)
	if err != nil {
		return nil, err
	}
	for _, versionDocumentEnt := range content {
		transformationView := *entity.MakeDocumentForTransformationView(&versionDocumentEnt)
		transformationView.IncludedOperationIds = getCommonOperationFromGroupAndDocumentOperations(operationIdsByGroupName, transformationView)
		versionDocuments = append(versionDocuments, transformationView)
	}

	return &view.DocumentsForTransformationView{Documents: versionDocuments}, nil
}

func getCommonOperationFromGroupAndDocumentOperations(operationIdsByGroupName []string, document view.DocumentForTransformationView) []string {
	commonOperations := make([]string, 0)
	hash := make(map[string]struct{})

	for _, v := range operationIdsByGroupName {
		hash[v] = struct{}{}
	}

	for _, v := range document.IncludedOperationIds {
		if _, ok := hash[v]; ok {
			commonOperations = append(commonOperations, v)
		}
	}

	return commonOperations
}
