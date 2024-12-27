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
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"strconv"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/go-pg/pg/v10"
	"github.com/gosimple/slug"
	log "github.com/sirupsen/logrus"
)

const typeAndTitleMigrationVersion = 28
const searchTablesMigrationVersion = 35
const filesOperationsMigrationVersion = 57
const groupToDashboardVersion = 100
const personalWorkspaces = 102
const draftBlobIds = 133

// SoftMigrateDb The function implements migrations that can't be made via SQL query.
// Executes only required migrations based on current vs new versions.
func (d dbMigrationServiceImpl) SoftMigrateDb(currentVersion int, newVersion int, migrationRequired bool) error {
	if (currentVersion < typeAndTitleMigrationVersion && typeAndTitleMigrationVersion <= newVersion) ||
		(migrationRequired && typeAndTitleMigrationVersion == currentVersion && typeAndTitleMigrationVersion == newVersion) {
		//async migration because it could take a lot of time to execute
		utils.SafeAsync(func() {
			err := d.updateTypeAndTitleForPublishedFiles()
			if err != nil {
				log.Error(err)
			}
		})
	}
	if (currentVersion < searchTablesMigrationVersion && searchTablesMigrationVersion <= newVersion) ||
		(migrationRequired && searchTablesMigrationVersion == currentVersion && searchTablesMigrationVersion == newVersion) {
		//async migration because it could take a lot of time to execute
		utils.SafeAsync(func() {
			err := d.fillTextSearchTables()
			if err != nil {
				log.Error(err)
			}
		})
	}

	if currentVersion < groupToDashboardVersion && groupToDashboardVersion <= newVersion ||
		(migrationRequired && groupToDashboardVersion == currentVersion && groupToDashboardVersion == newVersion) {
		//async migration because it could take a lot of time to execute
		utils.SafeAsync(func() {
			err := d.groupsToDashboards()
			if err != nil {
				log.Error(err)
			}
		})
	}

	if currentVersion < personalWorkspaces && personalWorkspaces <= newVersion ||
		(migrationRequired && personalWorkspaces == currentVersion && personalWorkspaces == newVersion) {
		//async migration because it could take a lot of time to execute
		utils.SafeAsync(func() {
			err := d.generatePersonalWorkspaceIds()
			if err != nil {
				log.Error(err)
			}
		})
	}
	if currentVersion < draftBlobIds && draftBlobIds <= newVersion ||
		(migrationRequired && draftBlobIds == currentVersion && draftBlobIds == newVersion) {
		//async migration because it could take a lot of time to execute
		utils.SafeAsync(func() {
			err := d.calculateDraftBlobIds()
			if err != nil {
				log.Error(err)
			}
		})
	}

	return nil
}

func (d dbMigrationServiceImpl) updateTypeAndTitleForPublishedFiles() error {
	err := d.validateMinRequiredVersion(typeAndTitleMigrationVersion)
	if err != nil {
		return err
	}
	allPublishedFiles := make([]entity.PublishedContentEntity, 0)
	err = d.cp.GetConnection().Model(&allPublishedFiles).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil
		}
		return err
	}
	total := len(allPublishedFiles)
	log.Infof("start calculating type and title for published files")
	for i, fileEnt := range allPublishedFiles {
		log.Infof("[%v / %v] calculating type and title..", i, total)
		fileType, title := d.getTypeAndTitleFromPublishedFileData(fileEnt.Name, fileEnt.Checksum)
		if title == "" {
			title = getTitleFromFilename(fileEnt.Name)
		}
		fileEntTmp := fileEnt
		fileEntTmp.Title = title
		fileEntTmp.DataType = fileType
		_, err = d.cp.GetConnection().Model(&fileEntTmp).
			Column("title", "data_type").
			WherePK().
			Update()
		if err != nil {
			log.Errorf("failed to calculate type or title for file %v with checksum %v: %v", fileEnt.FileId, fileEnt.Checksum, err.Error())
		}
	}
	log.Infof("finished calculating type and title for published files")
	return nil
}

func (d dbMigrationServiceImpl) fillTextSearchTables() error {
	err := d.validateMinRequiredVersion(searchTablesMigrationVersion)
	if err != nil {
		return err
	}

	var filesToCalculate []entity.PublishedContentEntity

	//select files from not deleted versions that have no entries in any of ts_ tables
	filesWithoutTextSearchDataQuery := `
	with maxrev as
	(
		select package_id, version, max(revision) as revision
		from published_version
		group by package_id, version
	)
	select vc.* from published_version_revision_content vc
	inner join maxrev
		on maxrev.package_id = vc.package_id
		and maxrev.version = vc.version
		and maxrev.revision = vc.revision
	inner join published_version pv
		on pv.package_id = vc.package_id
		and pv.version = vc.version
		and pv.revision = vc.revision
		and pv.deleted_at is null
	where vc.data_type != 'unknown'
	and vc.checksum not in(
		select t.checksum from ts_published_data_path_split t where t.package_id = vc.package_id
		union  
		select t.checksum from ts_published_data_custom_split t where t.package_id = vc.package_id
		union
		select t.checksum from ts_published_data_errors t where t.package_id = vc.package_id
	);`
	_, err = d.cp.GetConnection().Query(&filesToCalculate, filesWithoutTextSearchDataQuery)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil
		}
		return err
	}
	//splits each lexem by /
	//(e.g. lexem /api-v1/customerTroubleTicket_final will be split into 2 lexems: api-v1, customerTroubleTicket_final)
	insertTextSearchPathSplitQuery := `
	insert into ts_published_data_path_split(package_id, checksum, search_vector) 
		select package_id, checksum, to_tsvector(replace(convert_from(data, 'UTF-8'),'/',' ')) as search_vector
		from published_data
		where package_id = ? and checksum = ?
	on conflict (package_id, checksum) do update set search_vector = excluded.search_vector;`

	//splits each lexem by / and then by '-', '_' and capital letters
	//(e.g. lexem /api-v1/customerTroubleTicket_final will be split into 6 lexems: api, v1, customer, trouble, ticket, final)
	insertTextSearchCustomSplitQuery := `
	insert into ts_published_data_custom_split(package_id, checksum, search_vector) 
		select package_id, checksum, to_tsvector(regexp_replace(replace(replace(replace(convert_from(data, 'UTF-8'),'/',' '),'-',' '),'_',' '), '([A-Z])', ' \1', 'g')) as search_vector
		from published_data
		where package_id = ? and checksum = ?
	on conflict (package_id, checksum) do update set search_vector = excluded.search_vector;`

	insertTextSearchErrorQuery := `
	insert into ts_published_data_errors(package_id, checksum, error) 
	values (?, ?, ?)
	on conflict (package_id, checksum) do update set error = excluded.error;`

	total := len(filesToCalculate)
	log.Infof("start filling text search tables")
	for i, file := range filesToCalculate {
		log.Infof("[%v / %v] calculating lexems..", i, total)
		_, err := d.cp.GetConnection().Exec(insertTextSearchPathSplitQuery, file.PackageId, file.Checksum)
		if err != nil {
			log.Warnf("Failed to store text search path split vector for '%v' in version %v: %v", file.FileId, file.Version, err.Error())
			_, err = d.cp.GetConnection().Exec(insertTextSearchErrorQuery, file.PackageId, file.Checksum, err.Error())
			if err != nil {
				log.Errorf("Failed to store error for '%v' in version %v: %v", file.FileId, file.Version, err.Error())
				continue
			}
		}
		_, err = d.cp.GetConnection().Exec(insertTextSearchCustomSplitQuery, file.PackageId, file.Checksum)
		if err != nil {
			log.Warnf("Failed to store text search custom split vector for '%v' in version %v: %v", file.FileId, file.Version, err.Error())
			_, err = d.cp.GetConnection().Exec(insertTextSearchErrorQuery, file.PackageId, file.Checksum, err.Error())
			if err != nil {
				log.Errorf("Failed to store error for '%v' in version %v: %v", file.FileId, file.Version, err.Error())
				continue
			}
		}
	}
	log.Infof("finished filling text search tables")
	return nil
}

// Actually it's custom code for agent
func (d dbMigrationServiceImpl) groupsToDashboards() error {
	selectNamespaceGroupsQuery := "select distinct pv.package_id from published_version pv inner join package_group pg on pv.package_id=pg.id where pv.package_id ilike 'QS.RUNENV.%' and pg.kind='group'"

	nsGroupIds := make([]string, 0)

	_, err := d.cp.GetConnection().Query(&nsGroupIds, selectNamespaceGroupsQuery)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil
		}
		return err
	}
	if len(nsGroupIds) == 0 {
		return nil
	}

	insertDashboardQuery := "insert into package_group (id, kind, name, alias, parent_id, image_url, description, deleted_at, created_at, created_by, deleted_by, default_role, default_released_version, service_name, release_version_pattern, exclude_from_search, rest_grouping_prefix) " +
		"values (?, 'dashboard', 'snapshot', ?, ?, '', '', null, ?, 'db migration', '', 'viewer', '', '', '', true, '') on conflict(id) do nothing;"

	log.Infof("groupsToDashboards: creating dashboards and moving data")
	total := len(nsGroupIds)
	for i, id := range nsGroupIds {
		if (i+1)%10 == 0 {
			log.Infof("groupsToDashboards: processed %d/%d", i+1, total)
		}

		dashAlias := "SNAPSHOT-DASH"
		dashId := id + "." + dashAlias
		_, err := d.cp.GetConnection().Exec(insertDashboardQuery, dashId, dashAlias, id, time.Now())
		if err != nil {
			return fmt.Errorf("failed to create snapshot dashboard %s", dashId)
		}

		_, err = d.transitionRepository.MoveAllData(id, dashId)
		if err != nil {
			return fmt.Errorf("failed to move data from group %s to dashboard %s: %w", id, dashId, err)
		}
	}
	log.Infof("groupsToDashboards: done")
	return nil
}

func (d dbMigrationServiceImpl) generatePersonalWorkspaceIds() error {
	log.Info("Start generating personal workspace ids")
	getAllUsersQuery := `select * from user_data`
	userEnts := make([]entity.UserEntity, 0)
	_, err := d.cp.GetConnection().Query(&userEnts, getAllUsersQuery)
	if err != nil {
		return fmt.Errorf("failed to get all users: %w", err)
	}
	for _, user := range userEnts {
		privatePackageId, err := d.generateUserPrivatePackageId(user.Id)
		if err != nil {
			return fmt.Errorf("failed to generate privatePackageId for user: %w", err)
		}
		_, err = d.cp.GetConnection().Exec(`update user_data set private_package_id = ? where user_id = ?`, privatePackageId, user.Id)
		if err != nil {
			return fmt.Errorf("failed to update private_package_id for user: %w", err)
		}
	}
	log.Info("Successfully generated personal workspace ids")
	return nil
}

func (d dbMigrationServiceImpl) generateUserPrivatePackageId(userId string) (string, error) {
	userIdSlug := slug.Make(userId)
	privatePackageId := userIdSlug
	privatePackageIdTaken, err := d.privatePackageIdExists(privatePackageId, userId)
	if err != nil {
		return "", err
	}
	i := 1
	for privatePackageIdTaken {
		privatePackageId = userIdSlug + "-" + strconv.Itoa(i)
		privatePackageIdTaken, err = d.privatePackageIdExists(privatePackageId, userId)
		if err != nil {
			return "", err
		}
		i++
	}
	packageEnt, err := d.getPackageIncludingDeleted(privatePackageId)
	if err != nil {
		return "", err
	}
	for packageEnt != nil {
		i++
		privatePackageId = userIdSlug + "-" + strconv.Itoa(i)
		packageEnt, err = d.getPackageIncludingDeleted(privatePackageId)
		if err != nil {
			return "", err
		}
	}
	return privatePackageId, nil
}

func (d dbMigrationServiceImpl) privatePackageIdExists(privatePackageId string, excludedUserId string) (bool, error) {
	userEnt := new(entity.UserEntity)
	err := d.cp.GetConnection().Model(userEnt).
		Where("private_package_id = ?", privatePackageId).
		Where("user_id != ?", excludedUserId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return userEnt.PrivatePackageId == privatePackageId, nil
}

func (d dbMigrationServiceImpl) getPackageIncludingDeleted(id string) (*entity.PackageEntity, error) {
	result := new(entity.PackageEntity)
	err := d.cp.GetConnection().Model(result).
		Where("id = ?", id).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (d dbMigrationServiceImpl) calculateDraftBlobIds() error {
	log.Info("Start calculating blobIds for all draft files")
	type draftFile struct {
		ProjectId  string `pg:"project_id"`
		BranchName string `pg:"branch_name"`
		FileId     string `pg:"file_id"`
		Status     string `pg:"status"`
		Data       string `pg:"data"`
	}
	getDraftFiles := `
	select 
		project_id,
		branch_name,
		file_id,
		status,
		data
		from branch_draft_content
		where coalesce(commit_id, '') != ''
		and data is not null
		and coalesce(blob_id, '') = '' 
		order by project_id, branch_name, file_id
		limit ?;
	`
	updateDraftFileBlobId := `
	update branch_draft_content set blob_id = ?
	where project_id = ?
	and branch_name = ?
	and file_id = ?
	`
	limit := 10
	for {
		draftFilesWithCommitId := make([]draftFile, 0)
		_, err := d.cp.GetConnection().Query(&draftFilesWithCommitId, getDraftFiles, limit)
		if err != nil {
			return fmt.Errorf("failed to get draft files with commitId: %w", err)
		}
		for _, draftFile := range draftFilesWithCommitId {
			_, err := d.cp.GetConnection().Exec(updateDraftFileBlobId, calculateGitBlobId(draftFile.Data), draftFile.ProjectId, draftFile.BranchName, draftFile.FileId)
			if err != nil {
				return fmt.Errorf("failed to get draft files with commitId: %w", err)
			}
		}
		if len(draftFilesWithCommitId) < limit {
			break
		}
	}

	log.Info("Successfully calculated new blobIds")
	return nil
}

func calculateGitBlobId(s string) string {
	p := fmt.Sprintf("blob %d\x00", len(s))
	h := sha1.New()
	h.Write([]byte(p))
	h.Write([]byte(s))
	return hex.EncodeToString(h.Sum([]byte(nil)))
}
