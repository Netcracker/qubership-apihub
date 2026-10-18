package service

import (
	"context"
	"fmt"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"net/http"
	"strings"
)

type PackageExportConfigService interface {
	GetConfig(ctx context.Context, packageId string) (*view.PackageExportConfig, error)
	SetConfig(ctx context.Context, packageId string, AllowedOasExtensions []string) error
}

func NewPackageExportConfigService(repo repository.PackageExportConfigRepository, packageService PackageService) PackageExportConfigService {
	return packageExportConfigServiceImpl{
		repo:           repo,
		packageService: packageService,
	}
}

type packageExportConfigServiceImpl struct {
	repo           repository.PackageExportConfigRepository
	packageService PackageService
}

func (p packageExportConfigServiceImpl) GetConfig(ctx context.Context, packageId string) (*view.PackageExportConfig, error) {
	if err := p.checkPackageExistence(ctx, packageId); err != nil {
		return nil, err
	}
	ents, err := p.repo.GetConfigForHierarchy(ctx, packageId)
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

func (p packageExportConfigServiceImpl) SetConfig(ctx context.Context, packageId string, AllowedOasExtensions []string) error {
	if err := p.checkPackageExistence(ctx, packageId); err != nil {
		return err
	}
	var incorrectExtensions []string
	var duplicates []string
	set := map[string]struct{}{}
	for _, ext := range AllowedOasExtensions {
		if !strings.HasPrefix(ext, "x-") {
			incorrectExtensions = append(incorrectExtensions, ext)
		}
		_, exists := set[ext]
		if exists {
			duplicates = append(duplicates, ext)
		}
		set[ext] = struct{}{}
	}
	if len(incorrectExtensions) > 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectOASExtensions,
			Message: exception.IncorrectOASExtensionsMsg,
			Params: map[string]interface{}{
				"incorrectExt": fmt.Sprintf("%+v", incorrectExtensions),
			},
		}
	}
	if len(duplicates) > 0 {
		return &exception.CustomError{
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

	return p.repo.SetConfig(ctx, ent)
}

func (p packageExportConfigServiceImpl) checkPackageExistence(ctx context.Context, packageId string) error {
	exists, err := p.packageService.PackageExists(ctx, packageId)
	if err != nil {
		return err
	}
	if !exists {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	return nil
}
