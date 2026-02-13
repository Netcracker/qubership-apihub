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

func NewTransformationService(publishedRepo repository.PublishedRepository, operationRepo repository.OperationRepository,
	packageVersionEnrichmentService PackageVersionEnrichmentService) TransformationService {
	return &transformationServiceImpl{
		publishedRepo:                   publishedRepo,
		operationRepo:                   operationRepo,
		packageVersionEnrichmentService: packageVersionEnrichmentService,
	}
}

type transformationServiceImpl struct {
	publishedRepo                   repository.PublishedRepository
	operationRepo                   repository.OperationRepository
	packageVersionEnrichmentService PackageVersionEnrichmentService
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

	packageVersions := make(map[string][]string, 0)

	for _, versionDocumentEnt := range content {
		transformationView := *entity.MakeDocumentForTransformationView(&versionDocumentEnt)
		transformationView.IncludedOperationIds = getCommonOperationFromGroupAndDocumentOperations(operationIdsByGroupName, transformationView)
		versionDocuments = append(versionDocuments, transformationView)

		packageVersions[versionDocumentEnt.ContentPackageId] =
			append(packageVersions[versionDocumentEnt.ContentPackageId], view.MakeVersionRefKey(versionDocumentEnt.Version, versionDocumentEnt.Revision))
	}

	packagesRefs, err := t.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
	if err != nil {
		return nil, err
	}

	return &view.DocumentsForTransformationView{Documents: versionDocuments, Packages: packagesRefs}, nil
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
