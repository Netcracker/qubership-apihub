package service

import (
	"fmt"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"net/http"
)

type PackageExportConfigService interface {
	GetConfig(packageId string) (*view.PackageExportConfig, error)
	SetConfig(packageId string, AllowedOasExtensions []string) error
}

func NewPackageExportConfigService(repo repository.PackageExportConfigRepository) PackageExportConfigService {
	return packageExportConfigServiceImpl{repo: repo}
}

type packageExportConfigServiceImpl struct {
	repo repository.PackageExportConfigRepository
}

func (p packageExportConfigServiceImpl) GetConfig(packageId string) (*view.PackageExportConfig, error) {
	ents, err := p.repo.GetConfigForHierarchy(packageId)
	if err != nil {
		return nil, err
	}
	result := view.PackageExportConfig{
		AllowedOasExtensions: make([]view.AllowedOASExtEnriched, 0),
	}
	for _, ent := range ents {
		for _, ext := range ent.AllowedOasExtensions {
			elem := view.AllowedOASExtEnriched{
				OasExtension: ext,
				PackageId:    ent.PackageId,
				PackageName:  ent.PackageName,
				PackageKind:  ent.PackageKind,
			}
			result.AllowedOasExtensions = append(result.AllowedOasExtensions, elem)
		}
	}
	return &result, nil
}

func (p packageExportConfigServiceImpl) SetConfig(packageId string, AllowedOasExtensions []string) error {
	var duplicates []string
	set := map[string]struct{}{}
	for _, ext := range AllowedOasExtensions {
		_, exists := set[ext]
		if exists {
			duplicates = append(duplicates, ext)
		}
		set[ext] = struct{}{}
	}
	if len(duplicates) > 0 {
		return exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.DuplicateOASExtensionsNotAllowed,
			Message: exception.DuplicateOASExtensionsNotAllowedMsg,
			Params: map[string]interface{}{
				"duplicates": fmt.Sprintf("%+v", duplicates),
			},
		}
	}

	ent := entity.PackageExportConfigEntity{
		PackageId:            packageId,
		AllowedOasExtensions: AllowedOasExtensions,
	}

	return p.repo.SetConfig(ent)
}
