package repository

import (
	"context"
	"errors"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/db"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/go-pg/pg/v10"
)

type VersionResultRepository interface {
	GetVersionAndDocsSummary(ctx context.Context, packageId, version string, revision int) (*entity.LintedVersion, []entity.LintedDocument, error)
	GetVersionWithProcessAndDocsSummary_deprecated(ctx context.Context, packageId, version string, revision int) (*entity.LintedVersionWithProcess_deprecated, []entity.LintedDocument, error)
	GetLintedDocuments(ctx context.Context, packageId, version string, revision int, slug string) ([]entity.LintedDocument, error)
}

func NewVersionResultRepository(cp db.ConnectionProvider) VersionResultRepository {
	return &versionResultRepositoryImpl{cp: cp}
}

type versionResultRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (v versionResultRepositoryImpl) GetVersionAndDocsSummary(ctx context.Context, packageId, version string, revision int) (*entity.LintedVersion, []entity.LintedDocument, error) {

	// get version and get all related documents with summary
	var verEnt entity.LintedVersion
	err := v.cp.GetConnection().ModelContext(ctx, &verEnt).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil, nil
		}
		return nil, nil, err
	}

	var docs []entity.LintedDocument
	err = v.cp.GetConnection().ModelContext(ctx, &docs).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Order("slug ASC").
		Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil, nil
		}
		return nil, nil, err
	}

	return &verEnt, docs, nil
}

func (v versionResultRepositoryImpl) GetVersionWithProcessAndDocsSummary_deprecated(ctx context.Context, packageId, version string, revision int) (*entity.LintedVersionWithProcess_deprecated, []entity.LintedDocument, error) {
	var verEnt entity.LintedVersionWithProcess_deprecated
	_, err := v.cp.GetConnection().QueryOneContext(ctx, &verEnt, `select lv.*, p.status as validation_process_status
		from linted_version lv
		left join version_validation_process p on p.id = lv.validation_process_id
		where lv.package_id = ? and lv.version = ? and lv.revision = ?`,
		packageId, version, revision)
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil, nil
		}
		return nil, nil, err
	}

	var docs []entity.LintedDocument
	err = v.cp.GetConnection().ModelContext(ctx, &docs).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Order("slug ASC").
		Select()
	if err != nil {
		return nil, nil, err
	}

	return &verEnt, docs, nil
}

func (v versionResultRepositoryImpl) GetLintedDocuments(ctx context.Context, packageId, version string, revision int, slug string) ([]entity.LintedDocument, error) {
	var doc []entity.LintedDocument
	err := v.cp.GetConnection().ModelContext(ctx, &doc).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Where("slug = ?", slug).
		Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return doc, nil
}
