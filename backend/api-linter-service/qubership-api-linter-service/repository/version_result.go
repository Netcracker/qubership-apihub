package repository

import (
	"context"
	"database/sql"
	"errors"
	"github.com/Netcracker/qubership-api-linter-service/db"
	"github.com/Netcracker/qubership-api-linter-service/entity"
)

type VersionResultRepository interface {
	GetLintedVersion(ctx context.Context, packageId, version string, revision int) (*entity.LintedVersion, error)
	GetVersionAndDocsSummary(ctx context.Context, packageId, version string, revision int) (*entity.LintedVersion, []entity.LintedDocument, error)
	GetLintedDocument(ctx context.Context, packageId, version string, revision int, slug string) (*entity.LintedDocument, error)
}

func NewVersionResultRepository(cp db.ConnectionProvider) VersionResultRepository {
	return &versionResultRepositoryImpl{cp: cp}
}

type versionResultRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (v versionResultRepositoryImpl) GetLintedVersion(ctx context.Context, packageId, version string, revision int) (*entity.LintedVersion, error) {
	var verEnt entity.LintedVersion
	err := v.cp.GetConnection().ModelContext(ctx, &verEnt).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Select()
	if err != nil {
		if errors.As(err, &sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &verEnt, nil
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
		if errors.As(err, &sql.ErrNoRows) {
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
		if errors.As(err, &sql.ErrNoRows) {
			return nil, nil, nil
		}
		return nil, nil, err
	}

	return &verEnt, docs, nil
}

func (v versionResultRepositoryImpl) GetLintedDocument(ctx context.Context, packageId, version string, revision int, slug string) (*entity.LintedDocument, error) {
	var doc entity.LintedDocument
	err := v.cp.GetConnection().ModelContext(ctx, &doc).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Where("slug = ?", slug).
		Select()
	if err != nil {
		if errors.As(err, &sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &doc, nil
}
