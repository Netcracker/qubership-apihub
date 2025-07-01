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
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

const MigrationBuildPriority = -100
const CancelledMigrationError = "cancelled"

func (d dbMigrationServiceImpl) validateMinRequiredVersion(minRequiredMigrationVersion int) error {
	var currentMigration entity.MigrationEntity
	err := d.cp.GetConnection().Model(&currentMigration).
		First()

	if err != nil {
		return err
	}
	if currentMigration.Dirty {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.MigrationVersionIsDirty,
			Message: exception.MigrationVersionIsDirtyMsg,
			Params:  map[string]interface{}{"currentVersion": currentMigration.Version},
		}
	}
	if currentMigration.Version < minRequiredMigrationVersion {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.MigrationVersionIsTooLow,
			Message: exception.MigrationVersionIsTooLowMsg,
			Params:  map[string]interface{}{"currentVersion": currentMigration.Version, "requiredVersion": minRequiredMigrationVersion},
		}
	}
	return nil
}

func (d dbMigrationServiceImpl) getTypeAndTitleFromPublishedFileData(filename string, checksum string) (string, string) {
	fileData := new(entity.PublishedContentDataEntity)
	err := d.cp.GetConnection().Model(fileData).
		Where("checksum = ?", checksum).
		First()
	if err != nil {
		log.Errorf("failed to get file data by checksum %v", checksum)
	}
	title := ""
	fileType := view.Unknown
	if fileData != nil && len(fileData.Data) > 0 {
		fileType, title = service.GetContentInfo(filename, &fileData.Data)
	}

	if title == "" {
		log.Infof("failed to calculate title for %v", checksum)
		title = getTitleFromFilename(filename)
	}
	if fileType == view.Unknown {
		log.Infof("file %v has unknown type", filename)
	}
	return string(fileType), title
}

func (d dbMigrationServiceImpl) addTaskToRebuild(migrationId string, versionEnt entity.PublishedVersionEntity, noChangelog bool) (string, error) {
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
			file, err := d.minioStorageService.GetFile(context.Background(), view.PUBLISHED_SOURCES_ARCHIVES_TABLE, configEntity.ArchiveChecksum)
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

func (d dbMigrationServiceImpl) getPublishedSrcDataConfigEntity(query, packageId, version string, revision int) (*entity.PublishedSrcDataConfigEntity, error) {
	savedSources := new(entity.PublishedSrcDataConfigEntity)
	_, err := d.cp.GetConnection().Query(savedSources, query, packageId, version, revision)
	if err != nil {
		return nil, err
	}
	return savedSources, nil
}

func (d dbMigrationServiceImpl) addChangelogTaskToRebuild(migrationId string, changelogEnt mEntity.MigrationChangelogEntity) (string, error) {
	config := view.BuildConfig{
		PackageId:                changelogEnt.PackageId,
		Version:                  fmt.Sprintf("%s@%d", changelogEnt.Version, changelogEnt.Revision),
		PreviousVersionPackageId: changelogEnt.PreviousPackageId,
		PreviousVersion:          fmt.Sprintf("%s@%d", changelogEnt.PreviousVersion, changelogEnt.PreviousRevision),
		BuildType:                view.ChangelogType,
		CreatedBy:                "db migration",
		PublishedAt:              time.Now(),
		MigrationBuild:           true,
		MigrationId:              migrationId,
	}
	status := view.StatusNotStarted

	buildId := uuid.New().String()

	buildEnt := entity.BuildEntity{
		BuildId: buildId,
		Status:  string(status),
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

func (d dbMigrationServiceImpl) getVersionConfigReferences(packageId string, version string, revision int) ([]view.BCRef, error) {
	var refEntities []entity.PublishedReferenceEntity
	err := d.cp.GetConnection().Model(&refEntities).
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

func (d dbMigrationServiceImpl) makeBuildSourceEntityFromPublishedFiles(migrationId string, buildId string, noChangelog bool, versionEnt *entity.PublishedVersionEntity) (*entity.BuildSourceEntity, error) {
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
	_, err = d.cp.GetConnection().Query(&fileEntities, filesWithDataQuery, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}
	configFiles := make([]view.BCFile, 0)

	sourcesBuff := bytes.Buffer{}
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

func (d dbMigrationServiceImpl) makeBuildSourceEntityFromSources(migrationId string, buildId string, noChangelog bool, versionEnt *entity.PublishedVersionEntity, buildConfigData []byte, sourceData []byte) (*entity.BuildSourceEntity, error) {
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
	_, err = d.cp.GetConnection().Query(&fileEntities, publishedFilesQuery, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
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
func (d dbMigrationServiceImpl) storeVersionBuildTask(buildEnt entity.BuildEntity, sourceEnt entity.BuildSourceEntity) error {
	ctx := context.Background()
	return d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
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

func (d dbMigrationServiceImpl) getBuilds(buildIds []string) ([]entity.BuildEntity, error) {
	var result []entity.BuildEntity
	if len(buildIds) == 0 {
		return nil, nil
	}
	err := d.cp.GetConnection().Model(&result).
		Where("build_id in (?)", pg.In(buildIds)).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func getMapKeys(m map[string]entity.PublishedVersionEntity) []string {
	result := make([]string, 0)
	for k := range m {
		result = append(result, k)
	}
	return result
}
func getMapKeysGeneric(m map[string]interface{}) []string {
	result := make([]string, 0)
	for k := range m {
		result = append(result, k)
	}
	return result
}

func getTitleFromFilename(filename string) string {
	name := strings.TrimSuffix(filename, filepath.Ext(filename))
	return strings.Title(strings.ToLower(name))
}

func (d dbMigrationServiceImpl) cleanupEmptyVersions() error {
	selectEmptyVersionsQuery := `
		with doccount as (
			select package_id, version, revision, count(*) as cnt from published_version_revision_content as content group by package_id, version, revision
		), refcount as (
			select package_id, version, revision, count(*) as cnt from published_version_reference as refs group by package_id, version, revision
		)
		select pv.package_id, pv.version, pv.revision from
			published_version pv
			left join doccount
		on pv.package_id = doccount.package_id
			and pv.version = doccount.version
			and pv.revision = doccount.revision
			left join refcount
			on pv.package_id = refcount.package_id
			and pv.version = refcount.version
			and pv.revision = refcount.revision
		where doccount.cnt is null and refcount.cnt is null`
	var emptyVersions []entity.PublishedVersionEntity
	_, err := d.cp.GetConnection().Query(&emptyVersions, selectEmptyVersionsQuery)
	if err != nil {
		log.Errorf("Failed to read empty versions: %v", err.Error())
		return err
	}
	for _, ver := range emptyVersions {
		deleteFromBuildDebug := "delete from published_version where package_id = '" + ver.PackageId + "' and version='" + ver.Version + "' and revision=" + strconv.Itoa(ver.Revision)
		_, err = d.cp.GetConnection().Exec(deleteFromBuildDebug)
		if err != nil {
			return err
		}
	}
	return nil
}

func (d dbMigrationServiceImpl) cleanForRebuild(packageIds []string, versions []string, buildType view.BuildType) error {
	deleteQuery := "delete from migrated_version where 1=1 "

	if len(packageIds) > 0 {
		var wherePackageIn = " and package_id in ("
		for i, pkg := range packageIds {
			if i > 0 {
				wherePackageIn += ","
			}
			wherePackageIn += fmt.Sprintf("'%s'", pkg)
		}
		wherePackageIn += ") "

		deleteQuery += wherePackageIn
	}

	var whereVersionIn string
	if len(versions) > 0 {
		whereVersionIn = " and version in ("
		for i, ver := range versions {
			if i > 0 {
				whereVersionIn += ","
			}
			verSplit := strings.Split(ver, "@")
			whereVersionIn += fmt.Sprintf("'%s'", verSplit[0])
		}
		whereVersionIn += ") "
		deleteQuery += whereVersionIn
	}

	if buildType != "" {
		deleteQuery += fmt.Sprintf(" and build_type = '%s'", buildType)
	}

	_, err := d.cp.GetConnection().Exec(deleteQuery)
	if err != nil {
		return err
	}

	// deleteFromBuildDebug := `delete from build where created_by = 'db migration'`
	// _, err = d.cp.GetConnection().Exec(deleteFromBuildDebug)
	// if err != nil {
	// 	return err
	// }

	return nil
}

func (d dbMigrationServiceImpl) createMigrationTables() error {
	versionMigrationTable := `
	create table if not exists migrated_version (
		package_id varchar,
		version varchar,
		revision int,
		error varchar,
		build_id varchar,
		migration_id varchar,
	    build_type varchar,
	    no_changelog bool
	);

	alter table migrated_version add column if not exists build_type varchar;
	alter table migrated_version add column if not exists no_changelog bool;

	create table if not exists migration_run (
		id varchar,
		started_at timestamp without time zone,
		status varchar,
		stage varchar,
		package_ids varchar[],
		versions varchar[],
		is_rebuild bool,
		is_rebuild_changelog_only bool,
		current_builder_version varchar,
		error_details varchar,
		finished_at timestamp without time zone,
		updated_at timestamp without time zone
	);

	alter table migration_run add column if not exists is_rebuild_changelog_only bool;
	`

	_, err := d.cp.GetConnection().Exec(versionMigrationTable)
	if err != nil {
		return err
	}
	return nil
}

var downMigrationFileRegexp = regexp.MustCompile(`^[0-9]+_.+\.down\.sql$`)
var upMigrationFileRegexp = regexp.MustCompile(`^[0-9]+_.+\.up\.sql$`)

func (d *dbMigrationServiceImpl) getMigrationFilenamesMap() (map[int]string, map[int]string, error) {
	folder, err := os.Open(d.migrationsFolder)
	if err != nil {
		return nil, nil, err
	}
	defer folder.Close()
	fileNames, err := folder.Readdirnames(-1)
	if err != nil {
		return nil, nil, err
	}
	upMigrations := make(map[int]string, 0)
	downMigrations := make(map[int]string, 0)
	maxUpMigrationNumber := -1
	for _, file := range fileNames {
		if upMigrationFileRegexp.MatchString(file) {
			num, _ := strconv.Atoi(strings.Split(file, `_`)[0])
			if _, exists := upMigrations[num]; exists {
				return nil, nil, fmt.Errorf("found duplicate migration number, migration is not possible: %v", file)
			}
			upMigrations[num] = filepath.Join(d.migrationsFolder, file)
			if maxUpMigrationNumber < num {
				maxUpMigrationNumber = num
			}
		}
		if downMigrationFileRegexp.MatchString(file) {
			num, _ := strconv.Atoi(strings.Split(file, `_`)[0])
			if _, exists := downMigrations[num]; exists {
				return nil, nil, fmt.Errorf("found duplicate migration number, migration is not possible: %v", file)
			}
			downMigrations[num] = filepath.Join(d.migrationsFolder, file)
		}
	}
	if maxUpMigrationNumber != len(upMigrations) {
		return nil, nil, fmt.Errorf("highest migration number (%v) should be equal to a total number of migrations (%v)", maxUpMigrationNumber, len(upMigrations))
	}
	for num := range downMigrations {
		if _, exists := upMigrations[num]; !exists {
			return nil, nil, fmt.Errorf("down migration '%v' doesn't belong to any of up migrations", downMigrations[num])
		}
	}
	return upMigrations, downMigrations, nil
}

func calculateMigrationHash(migrationNum int, data []byte) string {
	return utils.GetEncodedChecksum([]byte(strconv.Itoa(migrationNum)), data)
}
