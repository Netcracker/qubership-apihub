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

package stages

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"
	mView "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

	"time"

	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

const MigrationBuildPriority = -100
const CancelledMigrationError = "cancelled"

func (d OpsMigration) createBuilds(versionsQuery string, params []interface{}, migrationId string, migrationStage mView.OpsMigrationStage) (int, error) {
	var versions []entity.PublishedVersionEntity

	_, err := d.cp.GetConnection().QueryContext(d.migrationCtx, &versions, versionsQuery, params...)
	if err != nil {
		return 0, fmt.Errorf("failed to read versions for migration: %w", err)
	}

	buildsCreated := 0
	for _, versionEnt := range versions {
		buildId, err := d.addTaskToRebuild(migrationId, versionEnt, false, migrationStage)
		if err != nil {
			return buildsCreated, fmt.Errorf("failed to add task to rebuild version %+v: %w", versionEnt, err)
		} else {
			buildsCreated += 1
			log.Infof("addTaskToRebuild complete. BuildId: %v. Version %v@%v@%v", buildId, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
		}
	}

	return buildsCreated, nil
}

func (d OpsMigration) createComparisonBuilds(versionCompQuery string, params []interface{}, migrationId string, migrationStage mView.OpsMigrationStage) (int, error) {
	var versionComps []entity.VersionComparisonEntity

	_, err := d.cp.GetConnection().QueryContext(d.migrationCtx, &versionComps, versionCompQuery, params...)
	if err != nil {
		return 0, fmt.Errorf("failed to read version comparisons for migration: %w", err)
	}

	buildsCreated := 0
	for _, ent := range versionComps {
		buildId, err := d.addCompTaskToRebuild(migrationId, ent, migrationStage)
		if err != nil {
			return buildsCreated, fmt.Errorf("failed to add task comparison to rebuild version %+v: %w", ent, err)
		} else {
			buildsCreated += 1
			log.Infof("addCompTaskToRebuild complete. BuildId: %v. Version %v@%v@%v", buildId, ent.PackageId, ent.Version, ent.Revision)
		}
	}

	return buildsCreated, nil
}

func (d OpsMigration) waitForBuilds(stage mView.OpsMigrationStage, round int) (int, error) {
	// Get and count active builds related to the migration, wait until all builds are finished
	processed := 0
	var builds []entity.BuildEntity

	totalCount, err := d.cp.GetConnection().ModelContext(d.migrationCtx, &builds).
		WhereOrGroup(func(query *orm.Query) (*orm.Query, error) {
			query = query.WhereOr("status=?", view.StatusNotStarted)
			query = query.WhereOr("status=?", view.StatusRunning)
			return query, nil
		}).
		Where("metadata->>'migration_id'=?", d.ent.Id).Count()
	if err != nil {
		return processed, fmt.Errorf("failed to get active builds for migration %s on stage %s: %w", d.ent.Id, stage, err)
	}
	if totalCount == 0 {
		return processed, nil
	}
	start := time.Now()
	limitSec := time.Duration(totalCount) * time.Second * time.Duration(600) // limit per build with great reserve
	for {
		count, err := d.cp.GetConnection().ModelContext(d.migrationCtx, &builds).
			WhereOrGroup(func(query *orm.Query) (*orm.Query, error) {
				query = query.WhereOr("status=?", view.StatusNotStarted)
				query = query.WhereOr("status=?", view.StatusRunning)
				return query, nil
			}).
			Where("metadata->>'migration_id'=?", d.ent.Id).Count()
		if err != nil {
			return processed, fmt.Errorf("failed to get active builds for migration %s on stage %s: %w", d.ent.Id, stage, err)
		}

		if count == 0 {
			log.Infof("Migration %s stage %s round %d: finished waiting builds", d.ent.Id, stage, round)
			return processed, nil
		} else {
			log.Infof("Migration %s stage %s round %d: finished builds: %d / %d.", d.ent.Id, stage, round, totalCount-count, totalCount)
			time.Sleep(time.Second * 15)
		}

		if time.Since(start) > limitSec {
			// Probably something is wrong, return error
			return processed, fmt.Errorf("time limit of %v seconds is exceeded for migration %s on stage %s", limitSec, d.ent.Id, stage)
		}
	}
}

func (d OpsMigration) addTaskToRebuild(migrationId string, versionEnt entity.PublishedVersionEntity, noChangelog bool, migrationStage mView.OpsMigrationStage) (string, error) {
	buildId := uuid.New().String()
	log.Debugf("Start creating task %v to rebuild %v@%v@%v NoChangelog: %v", buildId, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, noChangelog)

	buildEnt := entity.BuildEntity{
		BuildId: buildId,
		Status:  string(view.StatusNotStarted),
		Details: "",

		PackageId: versionEnt.PackageId,
		Version:   fmt.Sprintf("%s@%v", versionEnt.Version, versionEnt.Revision),

		CreatedBy:    "db migration",
		RestartCount: 0,
		Priority:     MigrationBuildPriority,
		Metadata: map[string]interface{}{
			"build_type":                  view.PublishType,
			"previous_version":            versionEnt.PreviousVersion,
			"previous_version_package_id": versionEnt.PreviousVersionPackageId,
			"migration_id":                migrationId,
			"migration_stage":             migrationStage,
		},
	}

	var config, data []byte
	var err error
	if d.systemInfoService.IsMinioStorageActive() && !d.systemInfoService.IsMinioStoreOnlyBuildResult() {
		savedSourcesQuery := `
		select config, archive_checksum
		from published_sources
		where package_id = ?
		and version = ?
		and revision = ?
		limit 1
	`
		configEntity, err := d.getPublishedSrcDataConfigEntity(savedSourcesQuery, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
		if err != nil {
			return "", err
		}
		if configEntity.ArchiveChecksum != "" {
			file, err := d.minioStorageService.GetFile(d.migrationCtx, view.PUBLISHED_SOURCES_ARCHIVES_TABLE, configEntity.ArchiveChecksum)
			if err != nil {
				return "", err
			}
			config = configEntity.Config
			data = file
		}
	} else {
		savedSourcesQuery := `
		select psa.checksum as archive_checksum, psa.data, ps.config, ps.package_id
		from published_sources_archives psa, published_sources ps
		where ps.package_id = ?
		and ps.version = ?
		and ps.revision = ?
		and ps.archive_checksum = psa.checksum
		limit 1
	`
		configEntity, err := d.getPublishedSrcDataConfigEntity(savedSourcesQuery, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
		if err != nil {
			return "", err
		}
		data = configEntity.Data
		config = configEntity.Config
	}
	var buildSourceEnt *entity.BuildSourceEntity
	if len(data) > 0 {
		buildSourceEnt, err = d.makeBuildSourceEntityFromSources(migrationId, buildId, noChangelog, &versionEnt, config, data)
	} else {
		buildSourceEnt, err = d.makeBuildSourceEntityFromPublishedFiles(migrationId, buildId, noChangelog, &versionEnt)
	}
	if err != nil {
		return "", err
	}

	err = d.storeVersionBuildTask(buildEnt, *buildSourceEnt)
	if err != nil {
		return "", err
	}

	log.Debugf("Created task %v to rebuild %v@%v@%v NoChangelog: %v", buildId, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, noChangelog)

	return buildId, nil
}

func (d OpsMigration) addCompTaskToRebuild(migrationId string, compEnt entity.VersionComparisonEntity, migrationStage mView.OpsMigrationStage) (string, error) {
	buildId := uuid.New().String()

	log.Debugf("Start creating task %v to rebuild comparison %v@%v@%v-%v@%v@%v",
		buildId, compEnt.PackageId, compEnt.Version, compEnt.Revision,
		compEnt.PreviousPackageId, compEnt.PreviousVersion, compEnt.PreviousRevision)

	config := view.BuildConfig{
		PackageId:                compEnt.PackageId,
		Version:                  fmt.Sprintf("%s@%d", compEnt.Version, compEnt.Revision),
		PreviousVersionPackageId: compEnt.PreviousPackageId,
		PreviousVersion:          fmt.Sprintf("%s@%d", compEnt.PreviousVersion, compEnt.PreviousRevision),
		BuildType:                view.ChangelogType,
		CreatedBy:                "db migration",
		PublishedAt:              time.Now(),
		MigrationBuild:           true,
		MigrationId:              migrationId,
	}

	buildEnt := entity.BuildEntity{
		BuildId: buildId,
		Status:  string(view.StatusNotStarted),
		Details: "",

		PackageId: config.PackageId,
		Version:   config.Version,

		CreatedBy:    config.CreatedBy,
		RestartCount: 0,
		Priority:     MigrationBuildPriority,
		Metadata: map[string]interface{}{
			"build_type":                  config.BuildType,
			"previous_version":            config.PreviousVersion,
			"previous_version_package_id": config.PreviousVersionPackageId,
			"migration_id":                migrationId,
			"migration_stage":             migrationStage,
		},
	}

	confAsMap, err := view.BuildConfigToMap(config)
	if err != nil {
		return "", err
	}

	sourceEnt := entity.BuildSourceEntity{
		BuildId: buildEnt.BuildId,
		Config:  *confAsMap,
	}
	err = d.storeVersionBuildTask(buildEnt, sourceEnt)
	if err != nil {
		return "", err
	}

	return buildId, nil
}

func (d OpsMigration) getPublishedSrcDataConfigEntity(query, packageId, version string, revision int) (*entity.PublishedSrcDataConfigEntity, error) {
	savedSources := new(entity.PublishedSrcDataConfigEntity)
	_, err := d.cp.GetConnection().QueryContext(d.migrationCtx, savedSources, query, packageId, version, revision)
	if err != nil {
		return nil, err
	}
	return savedSources, nil
}

func (d OpsMigration) makeBuildSourceEntityFromSources(migrationId string, buildId string, noChangelog bool, versionEnt *entity.PublishedVersionEntity, buildConfigData []byte, sourceData []byte) (*entity.BuildSourceEntity, error) {
	var buildConfig view.BuildConfig
	err := json.Unmarshal(buildConfigData, &buildConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal build config from sources: %v", err.Error())
	}
	if len(buildConfig.Files)+len(buildConfig.Refs) == 0 {
		return nil, fmt.Errorf("empty build config")
	}
	if len(sourceData) <= 0 {
		return nil, fmt.Errorf("failed to read sources archive for version: %v", *versionEnt)
	}

	publishedFilesQuery := `
	select *
	from published_version_revision_content
	where package_id = ?
		and version = ?
		and revision = ?
	`
	var fileEntities []entity.PublishedContentEntity
	_, err = d.cp.GetConnection().QueryContext(d.migrationCtx, &fileEntities, publishedFilesQuery, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}
	publishedFileEntitiesMap := make(map[string]entity.PublishedContentEntity, 0)
	for _, fileEnt := range fileEntities {
		publishedFileEntitiesMap[fileEnt.FileId] = fileEnt
	}
	for i, file := range buildConfig.Files {
		if file.Publish != nil && *file.Publish == true {
			publishedFileEnt, exists := publishedFileEntitiesMap[file.FileId]
			if !exists {
				return nil, fmt.Errorf("published file %v not found", file.FileId)
			}
			buildConfig.Files[i].Slug = publishedFileEnt.Slug
			buildConfig.Files[i].Index = publishedFileEnt.Index
			buildConfig.Files[i].BlobId = publishedFileEnt.Metadata.GetBlobId()
			buildConfig.Files[i].Labels = publishedFileEnt.Metadata.GetLabels()
		}
	}
	buildConfig.Refs, err = d.getVersionConfigReferences(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}
	config := view.BuildConfig{
		PackageId:                versionEnt.PackageId,
		Version:                  view.MakeVersionRefKey(versionEnt.Version, versionEnt.Revision),
		BuildType:                view.PublishType,
		PreviousVersion:          versionEnt.PreviousVersion,
		PreviousVersionPackageId: versionEnt.PreviousVersionPackageId,
		Status:                   versionEnt.Status,
		Refs:                     buildConfig.Refs,
		Files:                    buildConfig.Files,
		PublishId:                buildId,
		Metadata: view.BuildConfigMetadata{
			BranchName:    versionEnt.Metadata.GetBranchName(),
			RepositoryUrl: versionEnt.Metadata.GetRepositoryUrl(),
			CloudName:     versionEnt.Metadata.GetCloudName(),
			CloudUrl:      versionEnt.Metadata.GetCloudUrl(),
			Namespace:     versionEnt.Metadata.GetNamespace(),
			VersionLabels: versionEnt.Labels,
		},
		CreatedBy:      versionEnt.CreatedBy,
		NoChangelog:    noChangelog,
		PublishedAt:    versionEnt.PublishedAt,
		MigrationBuild: true,
		MigrationId:    migrationId,
	}

	confAsMap, err := view.BuildConfigToMap(config)
	if err != nil {
		return nil, err
	}

	sourceEnt := entity.BuildSourceEntity{
		BuildId: buildId,
		Source:  sourceData,
		Config:  *confAsMap,
	}

	return &sourceEnt, nil
}

func (d OpsMigration) makeBuildSourceEntityFromPublishedFiles(migrationId string, buildId string, noChangelog bool, versionEnt *entity.PublishedVersionEntity) (*entity.BuildSourceEntity, error) {
	configRefs, err := d.getVersionConfigReferences(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}
	filesWithDataQuery := `
	select rc.*, pd.data as data
	from published_version_revision_content rc, published_data pd
	where rc.package_id = pd.package_id
		and rc.checksum = pd.checksum
		and rc.package_id = ?
		and rc.version = ?
		and rc.revision = ?
	`
	var fileEntities []mEntity.PublishedContentMigrationEntity
	_, err = d.cp.GetConnection().QueryContext(d.migrationCtx, &fileEntities, filesWithDataQuery, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}
	configFiles := make([]view.BCFile, 0)

	sourcesBuff := bytes.Buffer{}
	if len(fileEntities) > 0 {
		zw := zip.NewWriter(&sourcesBuff)
		for _, fileEnt := range fileEntities {
			fw, err := zw.Create(fileEnt.FileId)
			if err != nil {
				return nil, err
			}
			_, err = fw.Write(fileEnt.Data)
			if err != nil {
				return nil, err
			}
			publish := true
			configFiles = append(configFiles, view.BCFile{
				FileId:  fileEnt.FileId,
				Slug:    fileEnt.Slug,
				Index:   fileEnt.Index,
				Labels:  fileEnt.Metadata.GetLabels(),
				Publish: &publish,
				BlobId:  fileEnt.Metadata.GetBlobId(),
			})
		}
		err = zw.Close()
		if err != nil {
			return nil, err
		}
	}

	config := view.BuildConfig{
		PackageId:                versionEnt.PackageId,
		Version:                  fmt.Sprintf("%s@%v", versionEnt.Version, versionEnt.Revision),
		BuildType:                view.PublishType,
		PreviousVersion:          versionEnt.PreviousVersion,
		PreviousVersionPackageId: versionEnt.PreviousVersionPackageId,
		Status:                   versionEnt.Status,
		Refs:                     configRefs,
		Files:                    configFiles,
		PublishId:                buildId,
		Metadata: view.BuildConfigMetadata{
			BranchName:    versionEnt.Metadata.GetBranchName(),
			RepositoryUrl: versionEnt.Metadata.GetRepositoryUrl(),
			CloudName:     versionEnt.Metadata.GetCloudName(),
			CloudUrl:      versionEnt.Metadata.GetCloudUrl(),
			Namespace:     versionEnt.Metadata.GetNamespace(),
			VersionLabels: versionEnt.Labels,
		},
		CreatedBy:      versionEnt.CreatedBy,
		NoChangelog:    noChangelog,
		PublishedAt:    versionEnt.PublishedAt,
		MigrationBuild: true,
		MigrationId:    migrationId,
	}
	confAsMap, err := view.BuildConfigToMap(config)
	if err != nil {
		return nil, err
	}

	sourceEnt := entity.BuildSourceEntity{
		BuildId: buildId,
		Source:  sourcesBuff.Bytes(),
		Config:  *confAsMap,
	}

	return &sourceEnt, nil
}

func (d OpsMigration) storeVersionBuildTask(buildEnt entity.BuildEntity, sourceEnt entity.BuildSourceEntity) error {
	return d.cp.GetConnection().RunInTransaction(d.migrationCtx, func(tx *pg.Tx) error {
		_, err := tx.Model(&buildEnt).Insert()
		if err != nil {
			return err
		}
		_, err = tx.Model(&sourceEnt).Insert()
		if err != nil {
			return err
		}

		return nil
	})
}

func (d OpsMigration) getVersionConfigReferences(packageId string, version string, revision int) ([]view.BCRef, error) {
	var refEntities []entity.PublishedReferenceEntity
	err := d.cp.GetConnection().ModelContext(d.migrationCtx, &refEntities).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Select()
	if err != nil {
		return nil, err
	}
	configRefs := make([]view.BCRef, 0)
	for _, refEnt := range refEntities {
		configRefs = append(configRefs, view.BCRef{
			RefId:         refEnt.RefPackageId,
			Version:       view.MakeVersionRefKey(refEnt.RefVersion, refEnt.RefRevision),
			ParentRefId:   refEnt.ParentRefPackageId,
			ParentVersion: view.MakeVersionRefKey(refEnt.ParentRefVersion, refEnt.ParentRefRevision),
			Excluded:      refEnt.Excluded,
		})
	}
	return configRefs, nil
}
