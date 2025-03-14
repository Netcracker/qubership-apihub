package repository

import (
	"errors"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/go-pg/pg/v10"
)

type PackageExportConfigRepository interface {
	GetConfigForHierarchy(packageId string) ([]entity.PackageExportConfigExtEntity, error)
	SetConfig(ent entity.PackageExportConfigEntity) error
}

func NewPackageExportConfigRepository(cp db.ConnectionProvider) PackageExportConfigRepository {
	return packageExportConfigRepositoryImpl{
		cp: cp,
	}
}

type packageExportConfigRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (p packageExportConfigRepositoryImpl) GetConfigForHierarchy(packageId string) ([]entity.PackageExportConfigExtEntity, error) {
	packageIds := utils.GetPackageHierarchy(packageId)
	if len(packageIds) == 0 {
		return nil, nil
	}
	var result []entity.PackageExportConfigExtEntity
	err := p.cp.GetConnection().Model(&result).
		ColumnExpr("package_export_config.package_id as package_id").
		ColumnExpr("p.name as package_name").
		ColumnExpr("p.kind as package_kind").
		ColumnExpr("package_export_config.allowed_oas_extensions as allowed_oas_extensions").
		Join("inner join package_group p").
		JoinOn("package_export_config.package_id = p.id").
		Where("package_id in (?)", pg.In(packageIds)).
		Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p packageExportConfigRepositoryImpl) SetConfig(ent entity.PackageExportConfigEntity) error {
	_, err := p.cp.GetConnection().Model(&ent).
		OnConflict("(package_id) DO UPDATE").
		Insert()
	if err != nil {
		return err
	}
	return nil
}
