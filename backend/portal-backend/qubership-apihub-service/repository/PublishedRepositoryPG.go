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

package repository

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/pkg/errors"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/go-pg/pg/v10"
)

func NewPublishedRepositoryPG(cp db.ConnectionProvider) (PublishedRepository, error) {
	return &publishedRepositoryImpl{cp: cp}, nil
}

type publishedRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (p publishedRepositoryImpl) updateVersion(tx *pg.Tx, version *entity.PublishedVersionEntity) error {
	_, err := tx.Model(version).WherePK().Update()
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) MarkVersionDeleted(packageId string, versionName string, userId string) error {
	ctx := context.Background()

	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var ents []entity.PublishedVersionEntity
		err := tx.Model(&ents).
			Where("package_id = ?", packageId).
			Where("version = ?", versionName).
			Where("deleted_at is ?", nil).
			Select()
		if err != nil {
			return err
		}

		timeNow := time.Now()
		for _, ent := range ents {
			tmpEnt := &ent
			tmpEnt.DeletedAt = &timeNow
			tmpEnt.DeletedBy = userId
			_, err := tx.Model(tmpEnt).WherePK().Update()
			if err != nil {
				return err
			}
		}

		clearDefaultReleaseVersionForProjectQuery := `
			UPDATE package_group
			SET default_released_version = null
			WHERE default_released_version = ? AND id = ?`
		_, err = tx.Exec(clearDefaultReleaseVersionForProjectQuery, versionName, packageId)
		if err != nil {
			return err
		}
		_, err = tx.Exec(`delete from grouped_operation where package_id = ? and version = ?`, packageId, versionName)
		if err != nil {
			return err
		}

		clearPreviousVersionQuery := `
			UPDATE published_version
			SET previous_version = null, previous_version_package_id = null
			WHERE previous_version = ? AND (previous_version_package_id = ? OR ((previous_version_package_id = '' or previous_version_package_id is null) and package_id = ?))`
		_, err = tx.Exec(clearPreviousVersionQuery, versionName, packageId, packageId)
		if err != nil {
			return err
		}

		return nil
	})

	return err
}

func (p publishedRepositoryImpl) PatchVersion(packageId string, versionName string, status *string, versionLabels *[]string) (*entity.PublishedVersionEntity, error) {
	getPackage, errGetPackage := p.GetPackage(packageId)
	if errGetPackage != nil {
		return nil, errGetPackage
	}
	if getPackage == nil {
		return nil, nil
	}

	ent := new(entity.PublishedVersionEntity)

	p.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {
		err := p.cp.GetConnection().Model(ent).
			Where("package_id = ?", packageId).
			Where("version = ?", versionName).
			Where("deleted_at is ?", nil).
			Order("revision DESC").
			First()
		if err != nil {
			if err == pg.ErrNoRows {
				return nil
			}
			return err
		}

		if status != nil {
			ent.Status = *status
		}
		if versionLabels != nil {
			ent.Labels = *versionLabels
		}

		_, err = tx.Model(ent).Where("package_id = ?", ent.PackageId).Where("version = ?", ent.Version).Where("revision = ?", ent.Revision).Update()
		if err != nil {
			return err
		}

		return nil
	})

	return ent, nil
}

func (p publishedRepositoryImpl) markAllVersionsDeletedByPackageId(tx *pg.Tx, packageId string, userId string) error {
	var ents []entity.PublishedVersionEntity
	err := tx.Model(&ents).
		Where("package_id = ?", packageId).
		Where("deleted_at is ?", nil).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil
		}
		return err
	}

	timeNow := time.Now()
	for _, ent := range ents {
		tmpEnt := &ent
		tmpEnt.DeletedAt = &timeNow
		tmpEnt.DeletedBy = userId
		err := p.updateVersion(tx, tmpEnt)
		if err != nil {
			return err
		}
		clearPreviousVersionQuery := `
			UPDATE published_version
			SET previous_version = null, previous_version_package_id = null
			WHERE previous_version = ? AND (previous_version_package_id = ? OR ((previous_version_package_id = '' or previous_version_package_id is null) and package_id = ?))`
		_, err = tx.Exec(clearPreviousVersionQuery, ent.Version, packageId, packageId)
		if err != nil {
			return err
		}
	}
	_, err = tx.Exec(`delete from grouped_operation where package_id = ?`, packageId)
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) GetVersion(packageId string, versionName string) (*entity.PublishedVersionEntity, error) {
	getPackage, errGetPackage := p.GetPackage(packageId)
	if errGetPackage != nil {
		return nil, errGetPackage
	}
	if getPackage == nil {
		return nil, nil
	}

	result := new(entity.PublishedVersionEntity)

	version, revision, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}
	query := p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("deleted_at is ?", nil).
		Where("version = ?", version)

	if revision > 0 {
		query.Where("revision = ?", revision)
	} else if revision == 0 {
		query.Order("revision DESC")
	}

	err = query.First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}

func (p publishedRepositoryImpl) GetLatestRevision(packageId, versionName string) (int, error) {
	result := new(entity.PublishedVersionEntity)
	version, _, err := SplitVersionRevision(versionName)
	if err != nil {
		return -1, err
	}
	query := p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("deleted_at is ?", nil).
		Where("version = ?", version).
		Order("revision DESC")
	err = query.First()
	if err != nil {
		if err == pg.ErrNoRows {
			return 0, nil
		}
		return -1, err
	}

	return result.Revision, nil
}
func (p publishedRepositoryImpl) GetReadonlyVersion_deprecated(packageId string, versionName string) (*entity.ReadonlyPublishedVersionEntity_deprecated, error) {
	getPackage, errGetPackage := p.GetPackage(packageId)
	if errGetPackage != nil {
		return nil, errGetPackage
	}
	if getPackage == nil {
		return nil, nil
	}
	result := new(entity.ReadonlyPublishedVersionEntity_deprecated)
	version, revision, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}
	query := `
	select pv.*,get_latest_revision(coalesce(pv.previous_version_package_id,pv.package_id),pv.previous_version) as previous_version_revision, coalesce(usr.name, created_by) user_name from published_version as pv left join user_data usr on usr.user_id = created_by
	where pv.package_id = ?
	  and pv.version = ?
	  and ((? = 0 and pv.revision = get_latest_revision(?,?)) or
		   (? != 0 and pv.revision = ?))
	  and deleted_at is null
	limit 1
	`
	_, err = p.cp.GetConnection().QueryOne(result, query, packageId, version, revision, packageId, version, revision, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}
func (p publishedRepositoryImpl) GetReadonlyVersion(packageId string, versionName string) (*entity.PackageVersionRevisionEntity, error) {
	getPackage, errGetPackage := p.GetPackage(packageId)
	if errGetPackage != nil {
		return nil, errGetPackage
	}
	if getPackage == nil {
		return nil, nil
	}
	result := new(entity.PackageVersionRevisionEntity)
	version, revision, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}
	query := `
	select pv.*,get_latest_revision(coalesce(pv.previous_version_package_id,pv.package_id),pv.previous_version) as previous_version_revision,
	    usr.name as prl_usr_name, usr.email as prl_usr_email, usr.avatar_url as prl_usr_avatar_url,
		apikey.id as prl_apikey_id, apikey.name as prl_apikey_name,
		case when coalesce(usr.name, apikey.name)  is null then pv.created_by else usr.user_id end prl_usr_id
		from published_version as pv
	    left join user_data usr on usr.user_id = pv.created_by
	    left join apihub_api_keys apikey on apikey.id = pv.created_by
	where pv.package_id = ?
	  and pv.version = ?
	  and ((? = 0 and pv.revision = get_latest_revision(?,?)) or
		   (? != 0 and pv.revision = ?))
	  and pv.deleted_at is null
	limit 1
	`
	_, err = p.cp.GetConnection().QueryOne(result, query, packageId, version, revision, packageId, version, revision, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetRichPackageVersion(packageId string, version string) (*entity.PackageVersionRichEntity, error) {
	result := new(entity.PackageVersionRichEntity)
	version, revision, err := SplitVersionRevision(version)
	if err != nil {
		return nil, err
	}
	query := `
select pv.*, pg.kind as kind, pg.name as package_name, pg.service_name as service_name, parent_package_names(pg.id) parent_names, get_latest_revision(pv.package_id, pv.version) != pv.revision as not_latest_revision
from package_group as pg,
     published_version as pv
where pv.package_id = ?
  and pv.version = ?
  and ((? = 0 and pv.revision = get_latest_revision(pv.package_id, pv.version)) or
         (? != 0 and pv.revision = ?))
  and pv.package_id = pg.id
limit 1
`
	_, err = p.cp.GetConnection().QueryOne(result, query, packageId, version, revision, revision, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetVersionRevisionsList_deprecated(searchQuery entity.PackageVersionSearchQueryEntity) ([]entity.PackageVersionRevisionEntity_deprecated, error) {
	var ents []entity.PackageVersionRevisionEntity_deprecated
	if searchQuery.TextFilter != "" {
		searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
	}
	query := `
		select pv.*, us.email, us.name, us.avatar_url, coalesce(us.user_id, pv.created_by) as user_id, pv.revision != get_latest_revision(pv.package_id, pv.version) as not_latest_revision
			from published_version as pv left join user_data as us on pv.created_by = us.user_id
			where (?text_filter = ''
				or exists(select 1 from unnest(pv.labels) as label where label ilike ?text_filter)
				or pv.revision::text ilike ?text_filter
				or exists(select user_id from user_data where user_id = pv.created_by and name ilike ?text_filter))
			and pv.package_id = ?package_id
			and pv.version = ?version
			and pv.deleted_at is null
			order by pv.revision desc
			limit ?limit
			offset ?offset;
 `
	_, err := p.cp.GetConnection().Model(&searchQuery).Query(&ents, query)
	if err != nil {
		return nil, err
	}
	return ents, nil
}
func (p publishedRepositoryImpl) GetVersionRevisionsList(searchQuery entity.PackageVersionSearchQueryEntity) ([]entity.PackageVersionRevisionEntity, error) {
	var ents []entity.PackageVersionRevisionEntity
	if searchQuery.TextFilter != "" {
		searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
	}
	query := `
		select pv.*, pv.revision != get_latest_revision(pv.package_id, pv.version) as not_latest_revision,
	    	us.user_id as prl_usr_id, us.name as prl_usr_name, us.email as prl_usr_email, us.avatar_url as prl_usr_avatar_url,
			apikey.id as prl_apikey_id, apikey.name as prl_apikey_name,
			case when coalesce(us.name, apikey.name)  is null then pv.created_by else us.user_id end prl_usr_id
			from published_version as pv
			left join user_data as us on pv.created_by = us.user_id
			left join apihub_api_keys as apikey on pv.created_by = apikey.id
			where (?text_filter = ''
				or exists(select 1 from unnest(pv.labels) as label where label ilike ?text_filter)
				or exists(select from jsonb_each_text(pv.metadata) where value ilike ?text_filter)
				or exists(select user_id from user_data where user_id = pv.created_by and name ilike ?text_filter))
			and pv.package_id = ?package_id
			and pv.version = ?version
			and pv.deleted_at is null
			order by pv.revision desc
			limit ?limit
			offset ?offset;
 `
	_, err := p.cp.GetConnection().Model(&searchQuery).Query(&ents, query)
	if err != nil {
		return nil, err
	}
	return ents, nil
}

func (p publishedRepositoryImpl) GetVersionByRevision(packageId string, versionName string, revision int) (*entity.PublishedVersionEntity, error) {
	result := new(entity.PublishedVersionEntity)
	err := p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("version = ?", versionName).
		Where("revision = ?", revision).
		Where("deleted_at is ?", nil).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}

func (p publishedRepositoryImpl) GetVersionIncludingDeleted(packageId string, versionName string) (*entity.PublishedVersionEntity, error) {
	result := new(entity.PublishedVersionEntity)
	version, revision, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}
	query := p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("version = ?", version)

	if revision > 0 {
		query.Where("revision = ?", revision)
	} else if revision == 0 {
		query.Order("revision DESC")
	}
	err = query.First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) IsPublished(packageId string, branchName string) (bool, error) {
	count, err := p.cp.GetConnection().Model(&entity.PublishedVersionEntity{PackageId: packageId}).
		Where("package_id = ?", packageId).
		Where("jsonb_extract_path_text(metadata, ?) = ?", entity.BRANCH_NAME_KEY, branchName).
		Where("deleted_at is ?", nil).
		Count()
	if err != nil {
		if err == pg.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return count > 0, nil
}

func (p publishedRepositoryImpl) GetServiceOwner(workspaceId string, serviceName string) (string, error) {
	var packageId string
	serviceOwnerQuery := `SELECT package_id FROM package_service WHERE workspace_id = ? and service_name = ?`
	_, err := p.cp.GetConnection().QueryOne(pg.Scan(&packageId), serviceOwnerQuery, workspaceId, serviceName)
	if err != nil {
		if err == pg.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return packageId, nil
}

func (p publishedRepositoryImpl) validateMigrationResult(tx *pg.Tx, packageInfo view.PackageInfoFile, publishId string, version *entity.PublishedVersionEntity, content []*entity.PublishedContentEntity, contentData []*entity.PublishedContentDataEntity,
	refs []*entity.PublishedReferenceEntity, src *entity.PublishedSrcEntity, operations []*entity.OperationEntity, operationData []*entity.OperationDataEntity, versionComparisons []*entity.VersionComparisonEntity, operationComparisons []*entity.OperationComparisonEntity, versionComparisonsFromCache []string) error {
	migrationRun := new(mEntity.MigrationRunEntity)

	err := tx.Model(migrationRun).Where("id = ?", packageInfo.MigrationId).First()
	if err != nil {
		return fmt.Errorf("failed to get migration info: %v", err.Error())
	}
	if migrationRun.SkipValidation {
		return nil
	}
	changes := make(map[string]interface{})
	changesOverview := make(PublishedBuildChangesOverview)

	currentTable := "published_version"
	oldVersion := new(entity.PublishedVersionEntity)
	err = tx.Model(oldVersion).
		Where("package_id = ?", version.PackageId).
		Where("version = ?", version.Version).
		Where("revision = ?", version.Revision).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			changes[currentTable] = "published version not found"
			changesOverview.setUnexpectedEntry(currentTable)
			return fmt.Errorf("published version not found")
		} else {
			return err
		}
	}
	if versionChanges := oldVersion.GetChanges(*version); len(versionChanges) > 0 {
		changes[currentTable] = versionChanges
		changesOverview.setTableChanges(currentTable, versionChanges)
	}

	oldContent := make([]entity.PublishedContentEntity, 0)
	err = tx.Model(&oldContent).
		Where("package_id = ?", version.PackageId).
		Where("version = ?", version.Version).
		Where("revision = ?", version.Revision).
		Select()
	if err != nil {
		return err
	}

	currentTable = "published_version_revision_content"
	contentChanges := make(map[string]interface{}, 0)
	matchedContent := make(map[string]struct{}, 0)
	oldContentChecksums := make(map[string]struct{}, 0)
	for _, s := range oldContent {
		found := false
		oldContentChecksums[s.Checksum] = struct{}{}
		for _, t := range content {
			if s.FileId == t.FileId {
				found = true
				matchedContent[s.FileId] = struct{}{}
				if fileChanges := s.GetChanges(*t); len(fileChanges) > 0 {
					contentChanges[s.FileId] = fileChanges
					changesOverview.setTableChanges(currentTable, fileChanges)
					continue
				}
			}
		}
		if !found {
			return fmt.Errorf(`file '%v' not found in build archive`, s.FileId)
		}
	}
	for _, t := range content {
		if _, matched := matchedContent[t.FileId]; !matched {
			return fmt.Errorf(`unexpected file '%v' (not found in database)`, t.FileId)
		}
	}
	if len(contentChanges) > 0 {
		changes[currentTable] = contentChanges
	}

	currentTable = "published_data"
	contentDataChanges := make(map[string]interface{}, 0)
	matchedChecksums := make(map[string]struct{}, 0)
	for oldChecksum := range oldContentChecksums {
		found := false
		for _, newContentData := range contentData {
			if oldChecksum == newContentData.Checksum {
				found = true
				matchedChecksums[oldChecksum] = struct{}{}
			}
		}
		if !found {
			contentDataChanges[oldChecksum] = "content data not found in build archive"
			changesOverview.setNotFoundEntry(currentTable)
		}
	}
	for _, newContentData := range contentData {
		if _, matched := matchedChecksums[newContentData.Checksum]; !matched {
			contentDataChanges[newContentData.Checksum] = "unexpected content data (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	if len(contentDataChanges) > 0 {
		changes[currentTable] = contentDataChanges
	}

	currentTable = "published_version_reference"
	oldRefs := make([]entity.PublishedReferenceEntity, 0)
	err = tx.Model(&oldRefs).
		Where("package_id = ?", version.PackageId).
		Where("version = ?", version.Version).
		Where("revision = ?", version.Revision).
		Select()
	if err != nil {
		return err
	}
	refsChanges := make(map[string]interface{}, 0)
	matchedRefs := make(map[string]struct{}, 0)
	for _, s := range oldRefs {
		found := false
		refId := view.MakePackageRefKey(s.RefPackageId, s.RefVersion, s.RefRevision)
		parentRefId := view.MakePackageRefKey(s.ParentRefPackageId, s.ParentRefVersion, s.ParentRefRevision)
		refKey := fmt.Sprintf(`RefId:%v;ParentRef:%v`, refId, parentRefId)
		for _, t := range refs {
			if refId == view.MakePackageRefKey(t.RefPackageId, t.RefVersion, t.RefRevision) &&
				parentRefId == view.MakePackageRefKey(t.ParentRefPackageId, t.ParentRefVersion, t.ParentRefRevision) {
				found = true
				matchedRefs[refKey] = struct{}{}
				if refChanges := s.GetChanges(*t); len(refChanges) > 0 {
					refsChanges[refKey] = refChanges
					changesOverview.setTableChanges(currentTable, refChanges)
					continue
				}
			}
		}
		if !found {
			return fmt.Errorf(`ref '%v' not found in build archive`, refKey)
		}
	}
	for _, t := range refs {
		refId := view.MakePackageRefKey(t.RefPackageId, t.RefVersion, t.RefRevision)
		parentRefId := view.MakePackageRefKey(t.ParentRefPackageId, t.ParentRefVersion, t.ParentRefRevision)
		refKey := fmt.Sprintf(`RefId:%v;ParentRef:%v`, refId, parentRefId)
		if _, matched := matchedRefs[refKey]; !matched {
			return fmt.Errorf(`unexpected ref '%v' (not found in database)`, refKey)
		}
	}
	if len(refsChanges) > 0 {
		changes[currentTable] = refsChanges
	}

	currentTable = "published_sources"
	oldSource := new(entity.PublishedSrcEntity)
	sourcesFound := true
	err = tx.Model(oldSource).
		Where("package_id = ?", version.PackageId).
		Where("version = ?", version.Version).
		Where("revision = ?", version.Revision).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			changes[currentTable] = "sources not found"
			changesOverview.setUnexpectedEntry(currentTable)
			sourcesFound = false
		} else {
			return err
		}
	}
	if sourcesFound {
		if srcChanges := oldSource.GetChanges(*src); len(srcChanges) > 0 {
			changes["published_sources"] = srcChanges
			changesOverview.setTableChanges(currentTable, srcChanges)
		}
	}

	currentTable = "operation"
	oldOperations := make([]entity.OperationEntity, 0)
	err = tx.Model(&oldOperations).
		Where("package_id = ?", version.PackageId).
		Where("version = ?", version.Version).
		Where("revision = ?", version.Revision).
		Select()
	if err != nil {
		return err
	}
	operationsChanges := make(map[string]interface{}, 0)
	matchedOperations := make(map[string]struct{}, 0)
	for _, s := range oldOperations {
		found := false
		for _, t := range operations {
			if s.OperationId == t.OperationId {
				found = true
				matchedOperations[s.OperationId] = struct{}{}
				if operationChanges := s.GetChanges(*t); len(operationChanges) > 0 {
					operationsChanges[s.OperationId] = operationChanges
					changesOverview.setTableChanges(currentTable, operationChanges)
					continue
				}
			}
		}
		if !found {
			operationsChanges[s.OperationId] = "operation not found in build archive"
			changesOverview.setNotFoundEntry(currentTable)
		}
	}
	for _, t := range operations {
		if _, matched := matchedOperations[t.OperationId]; !matched {
			operationsChanges[t.OperationId] = "unexpected operation (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	if len(operationsChanges) > 0 {
		changes["operation"] = operationsChanges
	}

	currentTable = "operation_data"
	oldOperationData := make([]entity.OperationDataEntity, 0)
	err = tx.Model(&oldOperationData).
		ColumnExpr("operation_data.data_hash, operation_data.search_scope").
		Join("inner join operation o").
		JoinOn("o.data_hash = operation_data.data_hash").
		JoinOn("o.package_id = ?", version.PackageId).
		JoinOn("o.version = ?", version.Version).
		JoinOn("o.revision = ?", version.Revision).
		Select()
	if err != nil {
		return err
	}
	operationDataChanges := make(map[string]interface{}, 0)
	matchedOperationData := make(map[string]struct{}, 0)
	for _, s := range oldOperationData {
		found := false
		for _, t := range operationData {
			if s.DataHash == t.DataHash {
				found = true
				matchedOperationData[s.DataHash] = struct{}{}
				if dataChanges := s.GetChanges(*t); len(dataChanges) > 0 {
					operationDataChanges[s.DataHash] = dataChanges
					changesOverview.setTableChanges(currentTable, dataChanges)
					continue
				}
			}
		}
		if !found {
			operationDataChanges[s.DataHash] = "operation data not found in build archive"
			changesOverview.setNotFoundEntry(currentTable)
		}
	}
	for _, t := range operationData {
		if _, matched := matchedOperationData[t.DataHash]; !matched {
			operationDataChanges[t.DataHash] = "unexpected operation data (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	if len(operationDataChanges) > 0 {
		changes["operation_data"] = operationDataChanges
	}

	if !packageInfo.NoChangelog && packageInfo.PreviousVersion != "" {
		versionComparisonsChanges, versionComparisonIds, err := p.getVersionComparisonsChanges(tx, packageInfo, versionComparisons, versionComparisonsFromCache, &changesOverview)
		if err != nil {
			return err
		}
		if len(versionComparisonsChanges) > 0 {
			changes["version_comparison"] = versionComparisonsChanges
		}
		operationComparisonsChanges, err := p.getOperationComparisonsChanges(tx, packageInfo, operationComparisons, versionComparisonIds, &changesOverview)
		if err != nil {
			return err
		}
		if len(operationComparisonsChanges) > 0 {
			changes["operation_comparison"] = operationComparisonsChanges
		}
	}
	if len(changes) > 0 {
		ent := mEntity.MigratedVersionChangesEntity{
			PackageId:     version.PackageId,
			Version:       version.Version,
			Revision:      version.Revision,
			BuildId:       publishId,
			MigrationId:   packageInfo.MigrationId,
			Changes:       changes,
			UniqueChanges: changesOverview.getUniqueChanges(),
		}
		_, err = tx.Model(&ent).Insert()
		if err != nil {
			return fmt.Errorf("failed to insert migrated version changes: %v", err.Error())
		}
		insertMigrationChangesQuery := `
		insert into migration_changes
		values (?, ?)
		on conflict (migration_id)
		do update
		set changes = coalesce(migration_changes.changes, '{}') || (
			SELECT jsonb_object_agg(key, coalesce((migration_changes.changes ->> key)::int, 0) + 1)
			from jsonb_each_text(EXCLUDED.changes)
			);`
		_, err = tx.Exec(insertMigrationChangesQuery, packageInfo.MigrationId, changesOverview)
		if err != nil {
			return fmt.Errorf("failed to insert migration changes: %v", err.Error())
		}
	}
	return nil
}

func (p publishedRepositoryImpl) getVersionComparisonsChanges(tx *pg.Tx, packageInfo view.PackageInfoFile, versionComparisonEntities []*entity.VersionComparisonEntity, versionComparisonsFromCache []string, changesOverview *PublishedBuildChangesOverview) (map[string]interface{}, []string, error) {
	var err error
	currentTable := "version_comparison"
	if packageInfo.PreviousVersionPackageId == "" {
		packageInfo.PreviousVersionPackageId = packageInfo.PackageId
	}
	if strings.Contains(packageInfo.Version, `@`) {
		packageInfo.Version, packageInfo.Revision, err = SplitVersionRevision(packageInfo.Version)
		if err != nil {
			return nil, nil, err
		}
	}
	if strings.Contains(packageInfo.PreviousVersion, `@`) {
		packageInfo.PreviousVersion, packageInfo.PreviousVersionRevision, err = SplitVersionRevision(packageInfo.PreviousVersion)
		if err != nil {
			return nil, nil, err
		}
	}
	if packageInfo.PreviousVersionRevision == 0 {
		_, err = tx.QueryOne(pg.Scan(&packageInfo.PreviousVersionRevision), `
		select max(revision) from published_version
			where package_id = ?
			and version = ?`, packageInfo.PreviousVersionPackageId, packageInfo.PreviousVersion)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to calculate previous version revision: %v", err.Error())
		}
	}
	versionComparisonsChanges := make(map[string]interface{}, 0)
	oldVersionComparisons := make([]entity.VersionComparisonEntity, 0)
	versionComparisonSnapshotTable := fmt.Sprintf(`migration."version_comparison_%s"`, packageInfo.MigrationId)
	getVersionComparisonsQuery := fmt.Sprintf(`
		with ref_comparison_ids as (
			select unnest(refs) as comparison_id from %s
				where package_id = ?
				and version = ?
				and revision = ?
				and previous_package_id = ?
				and previous_version = ?
				and previous_revision = ?
		)
		select * from %s
			where package_id = ?
			and version = ?
			and revision = ?
			and previous_package_id = ?
			and previous_version = ?
			and previous_revision = ?
		union
		select * from %s
			where comparison_id in (select comparison_id from ref_comparison_ids)
		`, versionComparisonSnapshotTable, versionComparisonSnapshotTable, versionComparisonSnapshotTable)
	_, err = tx.Query(&oldVersionComparisons, getVersionComparisonsQuery,
		packageInfo.PackageId,
		packageInfo.Version,
		packageInfo.Revision,
		packageInfo.PreviousVersionPackageId,
		packageInfo.PreviousVersion,
		packageInfo.PreviousVersionRevision,
		packageInfo.PackageId,
		packageInfo.Version,
		packageInfo.Revision,
		packageInfo.PreviousVersionPackageId,
		packageInfo.PreviousVersion,
		packageInfo.PreviousVersionRevision,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get version comparisons from db: %v", err.Error())
	}
	matchedComparisons := make(map[string]struct{}, 0)
	versionComparisonIds := make([]string, 0)
	for _, s := range oldVersionComparisons {
		found := false
		for _, t := range versionComparisonEntities {
			if s.ComparisonId == t.ComparisonId {
				found = true
				matchedComparisons[s.ComparisonId] = struct{}{}
				versionComparisonIds = append(versionComparisonIds, s.ComparisonId)
				if versionComparisonChanges := s.GetChanges(*t); len(versionComparisonChanges) > 0 {
					versionComparisonsChanges[s.ComparisonId] = versionComparisonChanges
					changesOverview.setTableChanges(currentTable, versionComparisonChanges)
				}
			}
		}
		if !found {
			fromCache := false
			for _, versionComparisonFromCache := range versionComparisonsFromCache {
				if versionComparisonFromCache == s.ComparisonId {
					fromCache = true
					break
				}
			}
			if !fromCache {
				versionComparisonsChanges[s.ComparisonId] = "version comparison not found in build archive"
				changesOverview.setNotFoundEntry(currentTable)
			}
		}
	}
	for _, t := range versionComparisonEntities {
		if _, matched := matchedComparisons[t.ComparisonId]; !matched {
			versionComparisonsChanges[t.ComparisonId] = "unexpected version comparison (not found in database)"
			changesOverview.setNotFoundEntry(currentTable)
		}
	}
	return versionComparisonsChanges, versionComparisonIds, nil
}

func (p publishedRepositoryImpl) getOperationComparisonsChanges(tx *pg.Tx, packageInfo view.PackageInfoFile, operationComparisonEntities []*entity.OperationComparisonEntity, versionComparisonIds []string, changesOverview *PublishedBuildChangesOverview) (map[string]interface{}, error) {
	var err error
	currentTable := "operation_comparison"
	if len(versionComparisonIds) == 0 && len(operationComparisonEntities) == 0 {
		return nil, nil
	}
	if packageInfo.PreviousVersionPackageId == "" {
		packageInfo.PreviousVersionPackageId = packageInfo.PackageId
	}
	if strings.Contains(packageInfo.Version, `@`) {
		packageInfo.Version, packageInfo.Revision, err = SplitVersionRevision(packageInfo.Version)
		if err != nil {
			return nil, err
		}
	}
	if strings.Contains(packageInfo.PreviousVersion, `@`) {
		packageInfo.PreviousVersion, packageInfo.PreviousVersionRevision, err = SplitVersionRevision(packageInfo.PreviousVersion)
		if err != nil {
			return nil, err
		}
	}
	if packageInfo.PreviousVersionRevision == 0 {
		_, err = tx.QueryOne(pg.Scan(&packageInfo.PreviousVersionRevision), `
		select max(revision) from published_version
			where package_id = ?
			and version = ?`, packageInfo.PreviousVersionPackageId, packageInfo.PreviousVersion)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate previous version revision: %v", err.Error())
		}
	}
	operationComparisonsChanges := make(map[string]interface{}, 0)
	oldOperationComparisons := make([]entity.OperationComparisonEntity, 0)
	matchedOperationComparisons := make(map[string]struct{}, 0)
	if len(versionComparisonIds) > 0 {
		operationComparisonSnapshotTable := fmt.Sprintf(`migration."operation_comparison_%s"`, packageInfo.MigrationId)
		getOperationComparisonsQuery := fmt.Sprintf(`
			select * from %s
				where comparison_id in (?)
			`, operationComparisonSnapshotTable)
		_, err = tx.Query(&oldOperationComparisons, getOperationComparisonsQuery,
			pg.In(versionComparisonIds),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to get operation comparisons from db: %v", err.Error())
		}
		for _, oldComp := range oldOperationComparisons {
			key := fmt.Sprintf(`ComparisonId:%s;OperationId:%s;PreviousOperationId:%s`, oldComp.ComparisonId, oldComp.OperationId, oldComp.PreviousOperationId)
			found := false
			for _, newComp := range operationComparisonEntities {
				if oldComp.ComparisonId == newComp.ComparisonId &&
					oldComp.OperationId == newComp.OperationId &&
					oldComp.PreviousOperationId == newComp.PreviousOperationId {
					found = true
					matchedOperationComparisons[key] = struct{}{}
					if operationComparisonChanges := oldComp.GetChanges(*newComp); len(operationComparisonChanges) > 0 {
						operationComparisonsChanges[key] = operationComparisonChanges
						changesOverview.setTableChanges(currentTable, operationComparisonChanges)
					}
				}
			}
			if !found {
				operationComparisonsChanges[key] = "operation comparison not found in build archive"
				changesOverview.setNotFoundEntry(currentTable)
			}
		}
	}
	for _, newComp := range operationComparisonEntities {
		key := fmt.Sprintf(`ComparisonId:%s;OperationId:%s;PreviousOperationId:%s`, newComp.ComparisonId, newComp.OperationId, newComp.PreviousOperationId)
		if _, matched := matchedOperationComparisons[key]; !matched {
			operationComparisonsChanges[key] = "unexpected operation comparison (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	return operationComparisonsChanges, nil
}

func (p publishedRepositoryImpl) CreateVersionWithData(packageInfo view.PackageInfoFile, buildId string, version *entity.PublishedVersionEntity, content []*entity.PublishedContentEntity,
	data []*entity.PublishedContentDataEntity, refs []*entity.PublishedReferenceEntity, src *entity.PublishedSrcEntity, srcArchive *entity.PublishedSrcArchiveEntity,
	operations []*entity.OperationEntity, operationsData []*entity.OperationDataEntity,
	operationComparisons []*entity.OperationComparisonEntity, builderNotifications []*entity.BuilderNotificationsEntity,
	versionComparisons []*entity.VersionComparisonEntity, serviceName string, pkg *entity.PackageEntity, versionComparisonsFromCache []string) error {
	if len(content) == 0 && len(refs) == 0 {
		return nil
	}

	var err error
	ctx := context.Background()
	err = p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		start := time.Now()
		var ents []entity.BuildEntity
		_, err := tx.Query(&ents, getBuildWithLock, buildId)
		utils.PerfLog(time.Since(start).Milliseconds(), 50, "CreateVersionWithData: getBuildWithLock")
		if err != nil {
			return fmt.Errorf("CreateVersionWithData: failed to get build %s: %w", buildId, err)
		}
		if len(ents) == 0 {
			return fmt.Errorf("CreateVersionWithData: failed to start version publish. Build with buildId='%s' is not found", buildId)
		}
		build := &ents[0]

		//do not allow publish for "complete" builds and builds that are not failed with "Restart count exceeded limit"
		if build.Status == string(view.StatusComplete) ||
			(build.Status == string(view.StatusError) && build.RestartCount < 2) {
			return fmt.Errorf("failed to start version publish. Version with buildId='%v' is already published or failed", buildId)
		}

		start = time.Now()
		_, err = tx.Model(version).OnConflict("(package_id, version, revision) DO UPDATE").Insert()
		if err != nil {
			return fmt.Errorf("failed to insert published_version %+v: %w", version, err)
		}
		utils.PerfLog(time.Since(start).Milliseconds(), 50, "CreateVersionWithData: insert version")

		if packageInfo.MigrationBuild {
			start = time.Now()
			err := p.validateMigrationResult(tx, packageInfo, buildId, version, content, data, refs, src, operations, operationsData, versionComparisons, operationComparisons, versionComparisonsFromCache)
			if err != nil {
				return fmt.Errorf("migration result validation failed: %v", err.Error())
			}
			// ok, it takes pretty long time, but valuable
			utils.PerfLog(time.Since(start).Milliseconds(), 2000, "CreateVersionWithData: migration validation")
		}

		start = time.Now()
		for _, d := range data {
			exists, err := p.contentDataExists(tx, d.PackageId, d.Checksum) // TODO: could be bulk select
			if err != nil {
				return err
			}
			if !exists {
				_, err := tx.Model(d).OnConflict("(package_id, checksum) DO UPDATE").Insert()
				if err != nil {
					return fmt.Errorf("failed to insert published_data %+v: %w", d, err)
				}
			}
		}
		utils.PerfLog(time.Since(start).Milliseconds(), 200, "CreateVersionWithData: content data insert")
		start = time.Now()
		for _, c := range content {
			_, err := tx.Model(c).OnConflict("(package_id, version, revision, file_id) DO UPDATE").Insert()
			if err != nil {
				return fmt.Errorf("failed to insert published_version_revision_content %+v: %w", c, err)
			}
		}
		utils.PerfLog(time.Since(start).Milliseconds(), 200, "CreateVersionWithData: content insert")

		if len(refs) > 0 {
			start = time.Now()
			_, err := tx.Model(&refs).OnConflict(`(package_id, version, revision, reference_id, reference_version, reference_revision, parent_reference_id, parent_reference_version, parent_reference_revision)
			DO UPDATE SET "excluded" = EXCLUDED."excluded"`).Insert()
			if err != nil {
				return fmt.Errorf("failed to insert published_version_reference %+v: %w", refs, err)
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 50, "CreateVersionWithData: refs insert")
		}
		if srcArchive != nil {
			start = time.Now()
			count, err := tx.Model(srcArchive).
				Where("checksum = ?", srcArchive.Checksum).
				Count()
			if err != nil {
				return err
			}
			if count == 0 {
				_, err := tx.Model(srcArchive).OnConflict("(checksum) DO NOTHING").Insert()
				if err != nil {
					return fmt.Errorf("failed to insert published_sources_archive %+v: %w", srcArchive, err)
				}
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 50, "CreateVersionWithData: srcArchive insert")
		}
		if src != nil {
			start = time.Now()
			_, err := tx.Model(src).OnConflict("(package_id, version, revision) DO UPDATE").Insert()
			if err != nil {
				return fmt.Errorf("failed to insert published_sources %+v: %w", src, err)
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 50, "CreateVersionWithData: src insert")
		}
		validationSkipped := true
		if packageInfo.MigrationBuild {
			migrationRun := new(mEntity.MigrationRunEntity)
			err := tx.Model(migrationRun).Where("id = ?", packageInfo.MigrationId).First()
			if err != nil {
				return fmt.Errorf("failed to get migration info: %v", err.Error())
			}
			validationSkipped = migrationRun.SkipValidation
		}
		newOperationsData := make([]entity.OperationDataEntity, 0)
		if len(operationsData) > 0 {
			start = time.Now()
			seachScopeChangesCountQuery := `
				select count(*)
				from migrated_version_changes
				where build_id = ?
				and (changes -> 'operation_data' -> ? -> 'SearchScope' is not null) limit 1;`
			oldOperationDataCountQuery := `
				select count(data_hash)
				from operation_data
				where data_hash = ? limit 1`
			for _, data := range operationsData {
				var count int
				_, err = tx.Query(pg.Scan(&count), oldOperationDataCountQuery, data.DataHash)
				if err != nil {
					return err
				}
				if count != 1 {
					newOperationsData = append(newOperationsData, *data)
					continue
				}
				if validationSkipped {
					oldOperationData := new(entity.OperationDataEntity)
					err = tx.Model(oldOperationData).Column("search_scope").Where("data_hash = ?", data.DataHash).First()
					if err != nil {
						if err == pg.ErrNoRows {
							newOperationsData = append(newOperationsData, *data)
							continue
						}
						return err
					}
					if len(oldOperationData.GetChanges(*data)) > 0 {
						newOperationsData = append(newOperationsData, *data)
					}
				} else {
					var count int
					_, err = tx.Query(pg.Scan(&count), seachScopeChangesCountQuery, buildId, data.DataHash)
					if err != nil {
						return err
					}
					if count > 0 {
						newOperationsData = append(newOperationsData, *data)
						continue
					}
				}
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 100+int64(len(operationsData)*10), fmt.Sprintf("CreateVersionWithData: operationsData calculation (%d items)", len(operationsData)))
		}
		if len(newOperationsData) > 0 {
			start = time.Now()
			_, err := tx.Model(&newOperationsData).OnConflict("(data_hash) DO UPDATE SET search_scope = EXCLUDED.search_scope").Insert()
			if err != nil {
				return fmt.Errorf("failed to insert operation_data: %w", err)
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 50, "CreateVersionWithData: operationsData insert")
		}
		if packageInfo.MigrationBuild {
			// In case of migration list of operations may change due to new builder implementation, so need to cleanup existing list before insert
			start = time.Now()
			_, err := tx.Model(&entity.OperationEntity{}).
				Where("package_id=?", version.PackageId).
				Where("version=?", version.Version).
				Where("revision=?", version.Revision).
				Delete()
			utils.PerfLog(time.Since(start).Milliseconds(), 50+int64(len(operations)*10), "CreateVersionWithData: old operations delete")
			if err != nil {
				return fmt.Errorf("failed to cleanup operations for migration %+v: %w", operations, err)
			}
		}
		if len(operations) != 0 {
			start = time.Now()
			_, err := tx.Model(&operations).OnConflict("(package_id, version, revision, operation_id) DO UPDATE").Insert()
			utils.PerfLog(time.Since(start).Milliseconds(), 50+int64(len(operations)*10), "CreateVersionWithData: new operations insert")
			if err != nil {
				return fmt.Errorf("failed to insert operations %+v: %w", operations, err)
			}
		}
		if len(newOperationsData) > 0 {
			if packageInfo.MigrationBuild {
				//insert versions that require text search recalculation into specific table. These versions will be recalculated at the end of migration
				_, err = tx.Exec(
					fmt.Sprintf(`insert into migration."expired_ts_operation_data_%s" values(?, ?, ?)`, packageInfo.MigrationId),
					version.PackageId, version.Version, version.Revision)
				if err != nil {
					return fmt.Errorf("failed to insert into migration.expired_ts_operation_data: %w", err)
				}
			} else {
				start = time.Now()
				calculateRestTextSearchDataQuery := `
				insert into ts_rest_operation_data
					select data_hash,
					to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_request,
					to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_response,
					to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_annotation,
					to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_properties,
					to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_examples
					from operation_data
					where data_hash in (select distinct data_hash from operation where package_id = ? and version = ? and revision = ? and type = ?)
				on conflict (data_hash) do update
				set scope_request = EXCLUDED.scope_request,
				scope_response = EXCLUDED.scope_response,
				scope_annotation = EXCLUDED.scope_annotation,
				scope_properties = EXCLUDED.scope_properties,
				scope_examples = EXCLUDED.scope_examples;`
				_, err = tx.Exec(calculateRestTextSearchDataQuery,
					view.RestScopeRequest, view.RestScopeResponse, view.RestScopeAnnotation, view.RestScopeProperties, view.RestScopeExamples,
					version.PackageId, version.Version, version.Revision, view.RestApiType)
				if err != nil {
					return fmt.Errorf("failed to insert ts_rest_operation_data: %w", err)
				}
				calculateGraphqlTextSearchDataQuery := `
				insert into ts_graphql_operation_data
					select data_hash,
					to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_argument,
					to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_property,
					to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_annotation
					from operation_data
					where data_hash in (select distinct data_hash from operation where package_id = ? and version = ? and revision = ? and type = ?)
				on conflict (data_hash) do update
				set scope_argument = EXCLUDED.scope_argument,
				scope_property = EXCLUDED.scope_property,
				scope_annotation = EXCLUDED.scope_annotation;`
				_, err = tx.Exec(calculateGraphqlTextSearchDataQuery,
					view.GraphqlScopeArgument, view.GraphqlScopeProperty, view.GraphqlScopeAnnotation,
					version.PackageId, version.Version, version.Revision, view.GraphqlApiType)
				if err != nil {
					return fmt.Errorf("failed to insert ts_grahpql_operation_data: %w", err)
				}
				calculateAllTextSearchDataQuery := `
				insert into ts_operation_data
					select data_hash,
					to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_all
					from operation_data
					where data_hash in (select distinct data_hash from operation where package_id = ? and version = ? and revision = ?)
				on conflict (data_hash) do update
				set scope_all = EXCLUDED.scope_all`
				_, err = tx.Exec(calculateAllTextSearchDataQuery,
					view.ScopeAll,
					version.PackageId, version.Version, version.Revision)
				if err != nil {
					return fmt.Errorf("failed to insert ts_operation_data: %w", err)
				}
				utils.PerfLog(time.Since(start).Milliseconds(), 1000, "CreateVersionWithData: ts_vectors insert")
			}
		}
		if len(versionComparisons) != 0 {
			start = time.Now()
			err = p.saveVersionChangesTx(tx, operationComparisons, versionComparisons)
			if err != nil {
				return err
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 50, "CreateVersionWithData: versionComparisons insert")
		}
		if len(builderNotifications) != 0 {
			start = time.Now()
			_, err := tx.Model(&builderNotifications).Insert()
			if err != nil {
				return fmt.Errorf("failed to insert builder notifications %+v: %w", builderNotifications, err)
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 50, "CreateVersionWithData: builderNotifications insert")
		}
		if !packageInfo.MigrationBuild {
			start = time.Now()
			err = p.propagatePreviousOperationGroups(tx, version)
			if err != nil {
				return fmt.Errorf("failed to propagate previous operation groups: %w", err)
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 50, "CreateVersionWithData: propagatePreviousOperationGroups")
		}

		if serviceName != "" {
			start = time.Now()
			log.Infof("setting serviceName '%s' for package %s", serviceName, version.PackageId)
			_, err := tx.Model(pkg).Where("id = ?", version.PackageId).Set("service_name = ?", serviceName).Update()
			if err != nil {
				return err
			}
			insertServiceOwnerQuery := `
					INSERT INTO package_service (workspace_id, package_id, service_name)
					VALUES (?, ?, ?)`
			_, err = tx.Exec(insertServiceOwnerQuery, utils.GetPackageWorkspaceId(version.PackageId), version.PackageId, serviceName)
			if err != nil {
				return err
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 50, "CreateVersionWithData: set serviceName for package")
		}

		start = time.Now()
		var ent entity.BuildEntity
		query := tx.Model(&ent).
			Where("build_id = ?", buildId).
			Set("status = ?", view.StatusComplete).
			Set("details = ?", "").
			Set("last_active = now()")
		_, err = query.Update()
		if err != nil {
			return fmt.Errorf("failed to update build entity: %w", err)
		}
		utils.PerfLog(time.Since(start).Milliseconds(), 50, "CreateVersionWithData: update build entity")

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) propagatePreviousOperationGroups(tx *pg.Tx, version *entity.PublishedVersionEntity) error {
	previousGroupPackageId := version.PackageId
	previousGroupVersion := version.Version
	previousGroupRevision := version.Revision - 1
	if version.Revision <= 1 {
		if version.PreviousVersion == "" {
			return nil
		}
		if version.PreviousVersionPackageId != "" {
			previousGroupPackageId = version.PreviousVersionPackageId
		}
		previousGroupVersion = version.PreviousVersion
		_, err := tx.QueryOne(pg.Scan(&previousGroupRevision), `
		select max(revision) from published_version
			where package_id = ?
			and version = ?`, previousGroupPackageId, previousGroupVersion)
		if err != nil {
			return err
		}
	}
	previousOperationGroups := make([]entity.OperationGroupEntity, 0)
	getOperationGroupsQuery := `select * from operation_group where package_id = ? and version = ? and revision = ? and autogenerated = false`
	_, err := tx.Query(&previousOperationGroups, getOperationGroupsQuery, previousGroupPackageId, previousGroupVersion, previousGroupRevision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil
		}
		return err
	}
	if len(previousOperationGroups) == 0 {
		return nil
	}
	copyExistingOperationsFromPackageQuery := `
	insert into grouped_operation
	select ?, o.package_id, o.version, o.revision, o.operation_id
	from grouped_operation g
	inner join operation o
	on o.package_id = ?
	and o.version = ?
	and o.revision = ?
	and o.operation_id = g.operation_id
	where g.group_id = ?;
	`
	//this query detects if operation moved to another ref and updates the link in grouped_operation table instead of marking it as deleted
	copyExistingOperationsFromRefsQuery := `
	insert into grouped_operation
	with refs as (
				select distinct reference_id as package_id, reference_version as version, reference_revision as revision from published_version_reference
				where package_id = ?
				and version = ?
				and revision = ?
				and excluded = false
	),
	operations as (
		select o.package_id, o.version, o.revision, o.operation_id from operation o
		inner join refs r
		on r.package_id = o.package_id
		and r.version = o.version
		and r.revision = o.revision
	)
	select ?, o.package_id, o.version, o.revision, o.operation_id from grouped_operation g
	inner join operations o
	on g.package_id = o.package_id
	and g.operation_id = o.operation_id
	where g.group_id = ?;
	`

	for _, group := range previousOperationGroups {
		oldGroupId := group.GroupId
		newGroup := group
		newGroup.PackageId = version.PackageId
		newGroup.Version = version.Version
		newGroup.Revision = version.Revision
		newGroup.GroupId = view.MakeOperationGroupId(newGroup.PackageId, newGroup.Version, newGroup.Revision, newGroup.ApiType, newGroup.GroupName)
		_, err = tx.Model(&newGroup).Insert()
		if err != nil {
			return fmt.Errorf("failed to copy old operation group: %w", err)
		}
		_, err = tx.Model(&entity.OperationGroupHistoryEntity{
			GroupId:   newGroup.GroupId,
			Action:    view.OperationGroupActionCreate,
			Data:      newGroup,
			UserId:    version.CreatedBy,
			Date:      time.Now(),
			Automatic: true,
		}).Insert()
		if err != nil {
			return fmt.Errorf("failed to insert operation group history: %w", err)
		}
		_, err = tx.Exec(copyExistingOperationsFromPackageQuery, newGroup.GroupId, newGroup.PackageId, newGroup.Version, newGroup.Revision, oldGroupId)
		if err != nil {
			return fmt.Errorf("failed to copy existing grouped operations for package: %w", err)
		}
		_, err = tx.Exec(copyExistingOperationsFromRefsQuery,
			version.PackageId, version.Version, version.Revision,
			newGroup.GroupId, oldGroupId)
		if err != nil {
			return fmt.Errorf("failed to copy existing grouped operations for refs: %w", err)
		}
	}

	return err
}

func (p publishedRepositoryImpl) validateChangelogMigrationResult(tx *pg.Tx, packageInfo view.PackageInfoFile, publishId string, versionComparisons []*entity.VersionComparisonEntity, operationComparisons []*entity.OperationComparisonEntity, versionComparisonsFromCache []string) error {
	migrationRun := new(mEntity.MigrationRunEntity)
	err := tx.Model(migrationRun).Where("id = ?", packageInfo.MigrationId).First()
	if err != nil {
		return fmt.Errorf("failed to get migration info: %v", err.Error())
	}
	if migrationRun.SkipValidation {
		return nil
	}
	if packageInfo.PreviousVersion == "" {
		return nil
	}
	changes := make(map[string]interface{}, 0)
	changesOverview := make(PublishedBuildChangesOverview)
	versionComparisonsChanges, versionComparisonIds, err := p.getVersionComparisonsChanges(tx, packageInfo, versionComparisons, versionComparisonsFromCache, &changesOverview)
	if err != nil {
		return err
	}
	if len(versionComparisonsChanges) > 0 {
		changes["version_comparison"] = versionComparisonsChanges
	}
	operationComparisonsChanges, err := p.getOperationComparisonsChanges(tx, packageInfo, operationComparisons, versionComparisonIds, &changesOverview)
	if err != nil {
		return err
	}
	if len(operationComparisonsChanges) > 0 {
		changes["operation_comparison"] = operationComparisonsChanges
	}
	if len(changes) > 0 {
		ent := mEntity.MigratedVersionChangesEntity{
			PackageId:     packageInfo.PackageId,
			Version:       packageInfo.Version,
			Revision:      packageInfo.Revision,
			BuildId:       publishId,
			MigrationId:   packageInfo.MigrationId,
			Changes:       changes,
			UniqueChanges: changesOverview.getUniqueChanges(),
		}
		_, err = tx.Model(&ent).Insert()
		if err != nil {
			return fmt.Errorf("failed to insert migrated version changes: %v", err.Error())
		}
		insertMigrationChangesQuery := `
		insert into migration_changes
		values (?, ?)
		on conflict (migration_id)
		do update
		set changes = coalesce(migration_changes.changes, '{}') || (
			SELECT jsonb_object_agg(key, coalesce((migration_changes.changes ->> key)::int, 0) + 1)
			from jsonb_each_text(EXCLUDED.changes)
			);`
		_, err = tx.Exec(insertMigrationChangesQuery, packageInfo.MigrationId, changesOverview)
		if err != nil {
			return fmt.Errorf("failed to insert migration changes: %v", err.Error())
		}
	}
	return nil
}

func (p publishedRepositoryImpl) SaveVersionChanges(packageInfo view.PackageInfoFile, publishId string, operationComparisons []*entity.OperationComparisonEntity, versionComparisons []*entity.VersionComparisonEntity, versionComparisonsFromCache []string) error {
	ctx := context.Background()
	return p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var ents []entity.BuildEntity
		_, err := tx.Query(&ents, getBuildWithLock, publishId)
		if err != nil {
			return fmt.Errorf("CreateVersionWithData: failed to get build %s: %w", publishId, err)
		}
		if len(ents) == 0 {
			return fmt.Errorf("SaveVersionChanges: failed to start version publish. Build with buildId='%s' is not found", publishId)
		}
		build := &ents[0]

		//do not allow publish for "complete" builds and builds that are not failed with "Restart count exceeded limit"
		if build.Status == string(view.StatusComplete) ||
			(build.Status == string(view.StatusError) && build.RestartCount < 2) {
			return fmt.Errorf("failed to start version publish. Version with buildId='%v' is already published or failed", publishId)
		}
		if packageInfo.MigrationBuild && !packageInfo.NoChangelog {
			start := time.Now()
			err := p.validateChangelogMigrationResult(tx, packageInfo, publishId, versionComparisons, operationComparisons, versionComparisonsFromCache)
			if err != nil {
				return err
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 500, "SaveVersionChanges: validateChangelogMigrationResult")
		}
		err = p.saveVersionChangesTx(tx, operationComparisons, versionComparisons)
		if err != nil {
			return err
		}

		var ent entity.BuildEntity
		query := tx.Model(&ent).
			Where("build_id = ?", publishId).
			Set("status = ?", view.StatusComplete).
			Set("details = ?", "").
			Set("last_active = now()")
		_, err = query.Update()
		if err != nil {
			return fmt.Errorf("failed to update build entity: %w", err)
		}
		return nil
	})
}

func (p publishedRepositoryImpl) saveVersionChangesTx(tx *pg.Tx, operationComparisons []*entity.OperationComparisonEntity, versionComparisons []*entity.VersionComparisonEntity) error {
	_, err := tx.Model(&versionComparisons).
		OnConflict(`(comparison_id) DO UPDATE
		SET operation_types=EXCLUDED.operation_types,
			refs =			EXCLUDED.refs,
			last_active =	EXCLUDED.last_active,
			no_content =	EXCLUDED.no_content,
			open_count =	version_comparison.open_count+1`).Insert()
	if err != nil {
		return fmt.Errorf("failed to insert version comparisons %+v: %w", versionComparisons, err)
	}
	deleteChangelogForComparisonQuery := `
		delete from operation_comparison
		where comparison_id = ?comparison_id
		`
	for _, comparisonEnt := range versionComparisons {
		_, err := tx.Model(comparisonEnt).Exec(deleteChangelogForComparisonQuery)
		if err != nil {
			return fmt.Errorf("failed to delete old operation changes for comparison %+v: %w", *comparisonEnt, err)
		}
	}
	if len(operationComparisons) != 0 {
		_, err = tx.Model(&operationComparisons).Insert()
		if err != nil {
			return fmt.Errorf("failed to insert operation changes %+v: %w", operationComparisons, err)
		}
	}
	return nil
}

func (p publishedRepositoryImpl) GetRevisionContent(packageId string, versionName string, revision int) ([]entity.PublishedContentEntity, error) {
	var ents []entity.PublishedContentEntity
	version, _, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}
	err = p.cp.GetConnection().Model(&ents).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Order("index ASC").
		//Where("deleted_at is ?", nil). // TODO: check that version wasn't deleted or not?
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ents, err
}

func (p publishedRepositoryImpl) GetLatestContent(packageId string, versionName string, fileId string) (*entity.PublishedContentEntity, error) {
	result := new(entity.PublishedContentEntity)
	version, revision, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}
	query := p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("file_id = ?", fileId)
	//Where("deleted_at is ?", nil). // TODO: check that version wasn't deleted or not?

	if revision > 0 {
		query.Where("revision = ?", revision)
	} else if revision == 0 {
		query.Order("revision DESC")
	}
	err = query.First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetLatestContentBySlug(packageId string, versionName string, slug string) (*entity.PublishedContentEntity, error) {
	result := new(entity.PublishedContentEntity)
	version, revision, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}

	query := p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("slug = ?", slug)
	//Where("deleted_at is ?", nil). // TODO: check that version wasn't deleted or not?
	if revision > 0 {
		query.Where("revision = ?", revision)
	} else if revision == 0 {
		query.Order("revision DESC")
	}
	err = query.First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetRevisionContentBySlug(packageId string, versionName string, slug string, revision int) (*entity.PublishedContentEntity, error) {
	result := new(entity.PublishedContentEntity)
	err := p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("version = ?", versionName).
		Where("slug = ?", slug).
		Where("revision = ?", revision).
		//Where("deleted_at is ?", nil). // TODO: check that version wasn't deleted or not?
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetContentData(packageId string, checksum string) (*entity.PublishedContentDataEntity, error) {
	result := new(entity.PublishedContentDataEntity)
	err := p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("checksum = ?", checksum).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetLatestContentByVersion(packageId string, versionName string) ([]entity.PublishedContentEntity, error) {
	var latestVersionRev entity.PublishedVersionEntity
	version, _, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}
	query := `
		SELECT p.*
		FROM (
		    SELECT max(revision) over (partition by package_id, version) AS _max_revision, p.*
		    FROM published_version AS p
		    WHERE p.package_id = ?
		      AND p.version = ?
			  AND p.deleted_at is null
		)  p
		WHERE p.revision = p._max_revision LIMIT 1;`
	_, err = p.cp.GetConnection().Query(&latestVersionRev, query, packageId, version)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return p.GetRevisionContent(packageId, version, latestVersionRev.Revision)
}

func (p publishedRepositoryImpl) GetVersionSources(packageId string, versionName string, revision int) (*entity.PublishedSrcArchiveEntity, error) {
	query := `
		select psa.*
		from published_sources_archives psa, published_sources ps
		where ps.package_id = ?
		and ps.version = ?
		and ps.revision = ?
		and ps.archive_checksum = psa.checksum
		limit 1
	`
	savedSources := new(entity.PublishedSrcArchiveEntity)
	_, err := p.cp.GetConnection().QueryOne(savedSources, query, packageId, versionName, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return savedSources, nil
}

func (p publishedRepositoryImpl) GetPublishedVersionSourceDataConfig(packageId string, versionName string, revision int) (*entity.PublishedSrcDataConfigEntity, error) {
	query := `
		select psa.checksum as archive_checksum, psa.data, ps.config, ps.package_id
		from published_sources_archives psa, published_sources ps
		where ps.package_id = ?
		and ps.version = ?
		and ps.revision = ?
		and ps.archive_checksum = psa.checksum
		limit 1
	`
	savedSources := new(entity.PublishedSrcDataConfigEntity)
	_, err := p.cp.GetConnection().QueryOne(savedSources, query, packageId, versionName, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return savedSources, nil
}

func (p publishedRepositoryImpl) GetPublishedSources(packageId string, versionName string, revision int) (*entity.PublishedSrcEntity, error) {
	src := new(entity.PublishedSrcEntity)
	err := p.cp.GetConnection().Model(src).
		Where("package_id = ?", packageId).
		Where("version = ?", versionName).
		Where("revision = ?", revision).
		Limit(1).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return src, nil
}

func (p publishedRepositoryImpl) contentDataExists(tx *pg.Tx, packageId string, checksum string) (bool, error) {
	result := new(entity.PublishedContentDataEntity)
	err := tx.Model(result).
		Where("package_id = ?", packageId).
		Where("checksum = ?", checksum).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (p publishedRepositoryImpl) GetRevisionRefs(packageId string, versionName string, revision int) ([]entity.PublishedReferenceEntity, error) {
	var ents []entity.PublishedReferenceEntity
	version, _, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}
	err = p.cp.GetConnection().Model(&ents).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Where("excluded = false").
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ents, err
}

func (p publishedRepositoryImpl) GetPackageVersions(packageId string, filter string) ([]entity.PublishedVersionEntity, error) {
	var ents []entity.PublishedVersionEntity

	query := p.cp.GetConnection().Model(&ents).
		Where("package_id = ?", packageId).
		Where("deleted_at is ?", nil)

	if filter != "" {
		filter = "%" + utils.LikeEscaped(filter) + "%"
		query.Where("version ilike ?", filter)
	}

	err := query.Select()
	// TODO: try to get latest via query
	if err != nil {
		return nil, err
	}

	result := make([]entity.PublishedVersionEntity, 0)
	latestRevNums := make(map[string]int)
	latestRevVersions := make(map[string]entity.PublishedVersionEntity)

	for _, version := range ents {
		if version.PackageId == packageId && (version.DeletedAt == nil || version.DeletedAt.IsZero()) {
			if maxRev, ok := latestRevNums[version.Version]; ok {
				if version.Revision > maxRev {
					latestRevNums[version.Version] = version.Revision
					latestRevVersions[version.Version] = version
				}
			} else {
				latestRevNums[version.Version] = version.Revision
				latestRevVersions[version.Version] = version
			}
		}
	}
	for _, v := range latestRevVersions {
		result = append(result, v)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].PublishedAt.Unix() > result[j].PublishedAt.Unix()
	})

	return result, err
}

func (p publishedRepositoryImpl) GetVersionsByPreviousVersion(previousPackageId string, previousVersionName string) ([]entity.PublishedVersionEntity, error) {
	var ents []entity.PublishedVersionEntity
	previousVersion, _, err := SplitVersionRevision(previousVersionName)
	if err != nil {
		return nil, err
	}

	query := `
			select pv.* from published_version pv
				inner join (
                                select package_id, version, max(revision) as revision
                                    from published_version
                                    group by package_id, version
                          ) mx
                on pv.package_id = mx.package_id
                and pv.version = mx.version
                and pv.revision = mx.revision
			where pv.previous_version_package_id = ?
			and pv.previous_version = ?
			and pv.deleted_at is null
			order by pv.published_at desc
 `
	_, err = p.cp.GetConnection().Query(&ents, query, previousPackageId, previousVersion, previousPackageId, previousVersion)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return ents, err
}

func (p publishedRepositoryImpl) GetPackageVersionsWithLimit(searchQuery entity.PublishedVersionSearchQueryEntity, checkRevisions bool) ([]entity.PublishedVersionEntity, error) {
	var ents []entity.PublishedVersionEntity
	if searchQuery.TextFilter != "" {
		searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
	}
	if searchQuery.Status != "" {
		searchQuery.Status = "%" + utils.LikeEscaped(searchQuery.Status) + "%"
	}
	if checkRevisions {
		query := `
		select * from published_version pv
			where pv.deleted_at is null
			and (pv.package_id = ?package_id)
			and (?text_filter = '' or pv.version ilike ?text_filter OR EXISTS(SELECT 1 FROM unnest(pv.labels) as label WHERE label ILIKE ?text_filter))
			and (?status = '' or pv.status ilike ?status)
			and (?label = '' or ?label = any(pv.labels))
			order by pv.published_at desc
			`
		_, err := p.cp.GetConnection().Model(&searchQuery).Query(&ents, query)
		if err != nil {
			if err == pg.ErrNoRows {
				return nil, nil
			}
			return nil, err
		}

		result := make([]entity.PublishedVersionEntity, 0)
		latestRevNums := make(map[string]int)
		latestRevVersions := make(map[string]entity.PublishedVersionEntity)

		for _, version := range ents {
			if version.PackageId == searchQuery.PackageId && (version.DeletedAt == nil || version.DeletedAt.IsZero()) {
				if maxRev, ok := latestRevNums[version.Version]; ok {
					if version.Revision > maxRev {
						latestRevNums[version.Version] = version.Revision
						latestRevVersions[version.Version] = version
					}
				} else {
					latestRevNums[version.Version] = version.Revision
					latestRevVersions[version.Version] = version
				}
			}
		}
		for _, v := range latestRevVersions {
			result = append(result, v)
		}
		sort.Slice(result, func(i, j int) bool {
			return result[i].PublishedAt.Unix() > result[j].PublishedAt.Unix()
		})

		if len(result) <= searchQuery.Offset {
			return make([]entity.PublishedVersionEntity, 0), nil
		} else if len(result) <= searchQuery.Limit+searchQuery.Offset {
			return result[searchQuery.Offset:], nil
		}
		return result[searchQuery.Offset : searchQuery.Limit+searchQuery.Offset], nil
	} else {
		query := `
			select * from published_version pv
			inner join (
							select package_id, version, max(revision) as revision
								from published_version
								where (package_id = ?package_id)
								group by package_id, version
					  ) mx
			on pv.package_id = mx.package_id
			and pv.version = mx.version
			and pv.revision = mx.revision
			where (?text_filter = '' or pv.version ilike ?text_filter OR EXISTS(SELECT 1 FROM unnest(pv.labels) as label WHERE label ILIKE ?text_filter))
			and (?status = '' or pv.status ilike ?status)
			and (?label = '' or ?label = any(pv.labels))
			and pv.deleted_at is null
			order by pv.published_at desc
			limit ?limit
			offset ?offset
 `
		_, err := p.cp.GetConnection().Model(&searchQuery).Query(&ents, query)
		if err != nil {
			if err == pg.ErrNoRows {
				return nil, nil
			}
			return nil, err
		}
	}

	return ents, nil
}

func (p publishedRepositoryImpl) GetReadonlyPackageVersionsWithLimit_deprecated(searchQuery entity.PublishedVersionSearchQueryEntity, checkRevisions bool) ([]entity.ReadonlyPublishedVersionEntity_deprecated, error) {
	var ents []entity.ReadonlyPublishedVersionEntity_deprecated
	if searchQuery.TextFilter != "" {
		searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
	}
	if searchQuery.Status != "" {
		searchQuery.Status = "%" + utils.LikeEscaped(searchQuery.Status) + "%"
	}
	if searchQuery.SortBy == "" {
		searchQuery.SortBy = entity.GetVersionSortByPG(view.VersionSortByCreatedAt)
	}
	if searchQuery.SortOrder == "" {
		searchQuery.SortOrder = entity.GetVersionSortOrderPG(view.VersionSortOrderDesc)
	}
	if checkRevisions {
		query := `
		select pv.*, get_latest_revision(coalesce(pv.previous_version_package_id,pv.package_id), pv.previous_version) as previous_version_revision, coalesce(usr.name, pv.created_by) user_name from published_version pv
			left join user_data usr
			on usr.user_id = pv.created_by
			where pv.deleted_at is null
			and (pv.package_id = ?package_id)
			and (?text_filter = '' or pv.version ilike ?text_filter OR EXISTS(SELECT 1 FROM unnest(pv.labels) as label WHERE label ILIKE ?text_filter))
			and (?status = '' or pv.status ilike ?status)
			and (?label = '' or ?label = any(pv.labels))
			order by pv.published_at desc
			`
		_, err := p.cp.GetConnection().Model(&searchQuery).Query(&ents, query)
		if err != nil {
			if err == pg.ErrNoRows {
				return nil, nil
			}
			return nil, err
		}

		result := make([]entity.ReadonlyPublishedVersionEntity_deprecated, 0)
		latestRevNums := make(map[string]int)
		latestRevVersions := make(map[string]entity.ReadonlyPublishedVersionEntity_deprecated)

		for _, version := range ents {
			if version.PackageId == searchQuery.PackageId && (version.DeletedAt == nil || version.DeletedAt.IsZero()) {
				if maxRev, ok := latestRevNums[version.Version]; ok {
					if version.Revision > maxRev {
						latestRevNums[version.Version] = version.Revision
						latestRevVersions[version.Version] = version
					}
				} else {
					latestRevNums[version.Version] = version.Revision
					latestRevVersions[version.Version] = version
				}
			}
		}
		for _, v := range latestRevVersions {
			result = append(result, v)
		}
		sort.Slice(result, func(i, j int) bool {
			switch searchQuery.SortBy {
			case "published_at", "":
				switch searchQuery.SortOrder {
				case "desc", "":
					return result[i].PublishedAt.Unix() > result[j].PublishedAt.Unix()
				case "asc":
					return result[i].PublishedAt.Unix() < result[j].PublishedAt.Unix()
				}
			case "version":
				switch searchQuery.SortOrder {
				case "desc", "":
					return result[i].Version > result[j].Version
				case "asc":
					return result[i].Version < result[j].Version
				}
			}
			return result[i].PublishedAt.Unix() > result[j].PublishedAt.Unix()
		})

		if len(result) <= searchQuery.Offset {
			return make([]entity.ReadonlyPublishedVersionEntity_deprecated, 0), nil
		} else if len(result) <= searchQuery.Limit+searchQuery.Offset {
			return result[searchQuery.Offset:], nil
		}
		return result[searchQuery.Offset : searchQuery.Limit+searchQuery.Offset], nil
	} else {
		query := `
			select pv.*, get_latest_revision(coalesce(pv.previous_version_package_id,pv.package_id), pv.previous_version) as previous_version_revision, coalesce(usr.name, pv.created_by) user_name from published_version pv
			inner join (
							select package_id, version, max(revision) as revision
								from published_version
								where (package_id = ?package_id)
								group by package_id, version
					  ) mx
			on pv.package_id = mx.package_id
			and pv.version = mx.version
			and pv.revision = mx.revision
			left join user_data usr
			on usr.user_id = pv.created_by
			where (?text_filter = '' or pv.version ilike ?text_filter OR EXISTS(SELECT 1 FROM unnest(pv.labels) as label WHERE label ILIKE ?text_filter))
			and (?status = '' or pv.status ilike ?status)
			and (?label = '' or ?label = any(pv.labels))
			and pv.deleted_at is null
			order by pv.%s %s
			limit ?limit
			offset ?offset
 `
		_, err := p.cp.GetConnection().Model(&searchQuery).
			Query(&ents, fmt.Sprintf(query, searchQuery.SortBy, searchQuery.SortOrder))
		if err != nil {
			if err == pg.ErrNoRows {
				return nil, nil
			}
			return nil, err
		}
	}

	return ents, nil
}
func (p publishedRepositoryImpl) GetReadonlyPackageVersionsWithLimit(searchQuery entity.PublishedVersionSearchQueryEntity, checkRevisions bool) ([]entity.PackageVersionRevisionEntity, error) {
	var ents []entity.PackageVersionRevisionEntity
	if searchQuery.TextFilter != "" {
		searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
	}
	if searchQuery.Status != "" {
		searchQuery.Status = "%" + utils.LikeEscaped(searchQuery.Status) + "%"
	}
	if searchQuery.SortBy == "" {
		searchQuery.SortBy = entity.GetVersionSortByPG(view.VersionSortByCreatedAt)
	}
	if searchQuery.SortOrder == "" {
		searchQuery.SortOrder = entity.GetVersionSortOrderPG(view.VersionSortOrderDesc)
	}
	if checkRevisions {
		query := `
		select pv.*, get_latest_revision(coalesce(pv.previous_version_package_id,pv.package_id), pv.previous_version) as previous_version_revision,
		    usr.name as prl_usr_name, usr.email as prl_usr_email, usr.avatar_url as prl_usr_avatar_url,
			apikey.id as prl_apikey_id, apikey.name as prl_apikey_name,
			case when coalesce(usr.name, apikey.name)  is null then pv.created_by else usr.user_id end prl_usr_id
		    from published_version pv
			left join user_data usr on usr.user_id = pv.created_by
			left join apihub_api_keys apikey on apikey.id = pv.created_by
			where pv.deleted_at is null
			and (pv.package_id = ?package_id)
			and (?text_filter = '' or pv.version ilike ?text_filter OR EXISTS(SELECT 1 FROM unnest(pv.labels) as label WHERE label ILIKE ?text_filter))
			and (?status = '' or pv.status ilike ?status)
			and (?label = '' or ?label = any(pv.labels))
			order by pv.published_at desc
			`
		_, err := p.cp.GetConnection().Model(&searchQuery).Query(&ents, query)
		if err != nil {
			if err == pg.ErrNoRows {
				return nil, nil
			}
			return nil, err
		}

		result := make([]entity.PackageVersionRevisionEntity, 0)
		latestRevNums := make(map[string]int)
		latestRevVersions := make(map[string]entity.PackageVersionRevisionEntity)

		for _, version := range ents {
			if version.PackageId == searchQuery.PackageId && (version.DeletedAt == nil || version.DeletedAt.IsZero()) {
				if maxRev, ok := latestRevNums[version.Version]; ok {
					if version.Revision > maxRev {
						latestRevNums[version.Version] = version.Revision
						latestRevVersions[version.Version] = version
					}
				} else {
					latestRevNums[version.Version] = version.Revision
					latestRevVersions[version.Version] = version
				}
			}
		}
		for _, v := range latestRevVersions {
			result = append(result, v)
		}
		sort.Slice(result, func(i, j int) bool {
			switch searchQuery.SortBy {
			case "published_at", "":
				switch searchQuery.SortOrder {
				case "desc", "":
					return result[i].PublishedAt.Unix() > result[j].PublishedAt.Unix()
				case "asc":
					return result[i].PublishedAt.Unix() < result[j].PublishedAt.Unix()
				}
			case "version":
				switch searchQuery.SortOrder {
				case "desc", "":
					return result[i].Version > result[j].Version
				case "asc":
					return result[i].Version < result[j].Version
				}
			}
			return result[i].PublishedAt.Unix() > result[j].PublishedAt.Unix()
		})

		if len(result) <= searchQuery.Offset {
			return make([]entity.PackageVersionRevisionEntity, 0), nil
		} else if len(result) <= searchQuery.Limit+searchQuery.Offset {
			return result[searchQuery.Offset:], nil
		}
		return result[searchQuery.Offset : searchQuery.Limit+searchQuery.Offset], nil
	} else {
		query := `
			select pv.*, get_latest_revision(coalesce(pv.previous_version_package_id,pv.package_id), pv.previous_version) as previous_version_revision,
			       usr.name as prl_usr_name, usr.email as prl_usr_email, usr.avatar_url as prl_usr_avatar_url,
			       apikey.id as prl_apikey_id, apikey.name as prl_apikey_name,
				   case when coalesce(usr.name, apikey.name) is null then pv.created_by else usr.user_id end prl_usr_id
			       from published_version pv
			inner join (
							select package_id, version, max(revision) as revision
								from published_version
								where (package_id = ?package_id)
								group by package_id, version
					  ) mx
			on pv.package_id = mx.package_id
			and pv.version = mx.version
			and pv.revision = mx.revision
			left join user_data usr on usr.user_id = pv.created_by
			left join apihub_api_keys apikey on apikey.id = pv.created_by
			where (?text_filter = '' or pv.version ilike ?text_filter OR EXISTS(SELECT 1 FROM unnest(pv.labels) as label WHERE label ILIKE ?text_filter))
			and (?status = '' or pv.status ilike ?status)
			and (?label = '' or ?label = any(pv.labels))
			and pv.deleted_at is null
			order by pv.%s %s
			limit ?limit
			offset ?offset
 `
		_, err := p.cp.GetConnection().Model(&searchQuery).
			Query(&ents, fmt.Sprintf(query, searchQuery.SortBy, searchQuery.SortOrder))
		if err != nil {
			if err == pg.ErrNoRows {
				return nil, nil
			}
			return nil, err
		}
	}

	return ents, nil
}

// GetVersionRefs deprecated
func (p publishedRepositoryImpl) GetVersionRefs(searchQuery entity.PackageVersionSearchQueryEntity) ([]entity.PackageVersionPublishedReference, error) {
	var query string
	if searchQuery.TextFilter != "" {
		searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
	}
	if searchQuery.ShowAllDescendants {
		query = `
			with refs as (
				select distinct reference_id as package_id, reference_version as version, reference_revision as revision from published_version_reference
					where package_id = ?package_id
					and version = ?version
					and revision = ?revision
					and excluded = false
			)
		select pg.id as package_id,
		 	pg.name as package_name,
		  	pg.kind as kind,
		   	pub_version.version as version,
		    pub_version.status as version_status,
			pub_version.revision as revision,
			pub_version.deleted_at,
			pub_version.deleted_by
		from package_group as pg, published_version as pub_version, refs
		where refs.package_id = pg.id
			and (?text_filter = '' or pg.name ilike ?text_filter)
			and (?kind = '' or pg.kind = ?kind)
			and refs.package_id = pub_version.package_id
			and refs.version = pub_version.version
			and refs.revision = pub_version.revision
			and not(refs.package_id = ?package_id and refs.version = ?version and refs.revision = ?revision)
		offset ?offset
		limit ?limit;
 		`
	} else {
		query = `
		with refs as (
			select distinct reference_id as package_id, reference_version as version, reference_revision as revision from published_version_reference
				where package_id = ?package_id
				and version = ?version
				and revision = ?revision
				and parent_reference_id = ''
				and excluded = false
		)
			select pg.id as package_id,
			 	pg.name as package_name,
			  	pg.kind as kind,
			   	pub_version.version as version,
			    pub_version.status as version_status,
				pub_version.revision as revision,
				pub_version.deleted_at,
				pub_version.deleted_by
			from package_group as pg, published_version as pub_version,refs
			where pg.id = refs.package_id
				and pub_version.package_id = refs.package_id
				and pub_version.version = refs.version
				and pub_version.revision = refs.revision
				and (?text_filter = '' or pg.name ilike ?text_filter)
				and (?kind = '' or pg.kind = ?kind)
			offset ?offset
			limit ?limit;`
	}

	var ents []entity.PackageVersionPublishedReference
	_, err := p.cp.GetConnection().Model(&searchQuery).Query(&ents, query)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ents, err
}

func (p publishedRepositoryImpl) GetVersionRefsV3(packageId string, version string, revision int) ([]entity.PublishedReferenceEntity, error) {
	var result []entity.PublishedReferenceEntity
	err := p.cp.GetConnection().Model(&result).
		ColumnExpr("published_version_reference.*").
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Order("published_version_reference.reference_id",
			"published_version_reference.reference_version",
			"published_version_reference.reference_revision",
			"published_version_reference.parent_reference_id",
			"published_version_reference.parent_reference_version",
			"published_version_reference.parent_reference_revision").
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}

func (p publishedRepositoryImpl) GetRevisionContentWithLimit(packageId string, versionName string, revision int, skipRefs bool, searchQuery entity.PublishedContentSearchQueryEntity) ([]entity.PublishedContentEntity, error) {
	var ents []entity.PublishedContentEntity
	query := p.cp.GetConnection().Model(&ents).
		ColumnExpr("published_version_revision_content.*")
	if !skipRefs {
		query.Join(`inner join
			(with refs as(
				select s.reference_id as package_id, s.reference_version as version, s.reference_revision as revision
				from published_version_reference s
				inner join published_version pv
				on pv.package_id = s.reference_id
				and pv.version = s.reference_version
				and pv.revision = s.reference_revision
				and pv.deleted_at is null
				where s.package_id = ?
				and s.version = ?
				and s.revision = ?
				and s.excluded = false
			)
			select package_id, version, revision
			from refs
			union
			select ? as package_id, ? as version, ? as revision
			) refs`, packageId, versionName, revision, packageId, versionName, revision)
		query.JoinOn("published_version_revision_content.package_id = refs.package_id").
			JoinOn("published_version_revision_content.version = refs.version").
			JoinOn("published_version_revision_content.revision = refs.revision")
	} else {
		query.Where("package_id = ?", packageId).
			Where("version = ?", versionName).
			Where("revision = ?", revision)
	}

	if searchQuery.TextFilter != "" {
		searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
		query.Where("title ilike ?", searchQuery.TextFilter)
	}
	if len(searchQuery.DocumentTypesFilter) > 0 {
		query.Where("data_type = any(?)", pg.Array(searchQuery.DocumentTypesFilter))
	}
	query.Order("published_version_revision_content.package_id",
		"published_version_revision_content.version",
		"published_version_revision_content.revision",
		"index ASC").
		Offset(searchQuery.Offset).
		Limit(searchQuery.Limit)

	err := query.Select()

	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ents, err
}
func (p publishedRepositoryImpl) GetLastVersions(ids []string) ([]entity.PublishedVersionEntity, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var versions []entity.PublishedVersionEntity
	selectMaxVersionQuery := `
		SELECT p.*
		FROM (
		    SELECT max(published_at) over (partition by package_id) AS _max_published_at, p.*
		    FROM published_version AS p
		    WHERE package_id IN (?) AND deleted_at is null
		)  p
		WHERE p.published_at = p._max_published_at;`
	_, err := p.cp.GetConnection().Query(&versions, selectMaxVersionQuery, pg.In(ids))
	if err != nil {
		if err != pg.ErrNoRows {
			return nil, err
		}
	}
	return versions, nil
}

func (p publishedRepositoryImpl) GetLastVersion(id string) (*entity.PublishedVersionEntity, error) {
	version := new(entity.PublishedVersionEntity)
	selectMaxVersionQuery := `
		SELECT p.*
		FROM (
		    SELECT max(published_at) over (partition by package_id) AS _max_published_at, p.*
		    FROM published_version AS p
		    WHERE package_id = ? AND deleted_at is null
		)  p
		WHERE p.published_at = p._max_published_at LIMIT 1;`
	_, err := p.cp.GetConnection().Query(version, selectMaxVersionQuery, id)
	if err != nil {
		if err != pg.ErrNoRows {
			return nil, err
		}
	}
	return version, nil
}

func (p publishedRepositoryImpl) GetDefaultVersion(packageId string, status string) (*entity.PublishedVersionEntity, error) {
	result := new(entity.PublishedVersionEntity)
	query := `with maxrev as
		(
			select package_id, version, max(revision) as revision
			from published_version
			where package_id = ?
			group by package_id, version
		)
		select * from published_version pv
		inner join maxrev
			on maxrev.package_id = pv.package_id
			and maxrev.version = pv.version
			and maxrev.revision = pv.revision
		where pv.status = ? and pv.deleted_at is null`
	if status == string(view.Release) {
		query += ` order by pv.version desc`
	} else {
		query += ` order by pv.published_at desc`
	}
	query += ` limit 1;`
	_, err := p.cp.GetConnection().QueryOne(result, query, packageId, status)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) CleanupDeleted() error {
	var ents []entity.PublishedVersionEntity
	_, err := p.cp.GetConnection().Model(&ents).
		Where("deleted_at is not ?", nil).
		Delete()
	return err
}

func (p publishedRepositoryImpl) GetFileSharedInfo(packageId string, slug string, versionName string) (*entity.SharedUrlInfoEntity, error) {
	result := new(entity.SharedUrlInfoEntity)
	version, _, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}

	err = p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("file_id = ?", slug).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetFileSharedInfoById(sharedId string) (*entity.SharedUrlInfoEntity, error) {
	result := entity.SharedUrlInfoEntity{SharedId: sharedId}
	err := p.cp.GetConnection().Model(&result).
		WherePK().
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (p publishedRepositoryImpl) CreateFileSharedInfo(newSharedUrlInfo *entity.SharedUrlInfoEntity) error {
	_, err := p.cp.GetConnection().Model(newSharedUrlInfo).Insert()
	if err != nil {
		if pgErr, ok := err.(pg.Error); ok {
			if pgErr.IntegrityViolation() {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.GeneratedSharedIdIsNotUnique,
					Message: exception.GeneratedSharedIdIsNotUniqueMsg,
				}
			}
		}
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) CreatePackage(packageEntity *entity.PackageEntity) error {
	ctx := context.Background()
	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(packageEntity).OnConflict("(id) DO NOTHING").Insert()
		if err != nil {
			return err
		}
		if packageEntity.ServiceName != "" {
			insertServiceOwnerQuery := `
			INSERT INTO package_service (workspace_id, package_id, service_name)
			VALUES (?, ?, ?)
			ON CONFLICT (workspace_id, package_id, service_name) DO NOTHING`
			_, err := tx.Exec(insertServiceOwnerQuery, utils.GetPackageWorkspaceId(packageEntity.Id), packageEntity.Id, packageEntity.ServiceName)
			if err != nil {
				return err
			}
		}
		return err
	})
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) CreatePrivatePackageForUser(packageEntity *entity.PackageEntity, userRoleEntity *entity.PackageMemberRoleEntity) error {
	ctx := context.Background()
	return p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(packageEntity).Insert()
		if err != nil {
			return err
		}
		_, err = tx.Model(userRoleEntity).Insert()
		if err != nil {
			return err
		}
		return nil
	})
}

func (p publishedRepositoryImpl) GetPackage(id string) (*entity.PackageEntity, error) {
	result := new(entity.PackageEntity)
	err := p.cp.GetConnection().Model(result).
		Where("id = ?", id).
		Where("deleted_at is ?", nil).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetPackageGroup(id string) (*entity.PackageEntity, error) {
	result := new(entity.PackageEntity)
	err := p.cp.GetConnection().Model(result).
		Where("id = ?", id).
		Where("kind in (?)", pg.In([]string{entity.KIND_GROUP, entity.KIND_WORKSPACE})).
		Where("deleted_at is ?", nil).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetDeletedPackage(id string) (*entity.PackageEntity, error) {
	result := new(entity.PackageEntity)
	err := p.cp.GetConnection().Model(result).
		Where("id = ?", id).
		Where("deleted_at is not ?", nil).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetDeletedPackageGroup(id string) (*entity.PackageEntity, error) {
	result := new(entity.PackageEntity)
	err := p.cp.GetConnection().Model(result).
		Where("id = ?", id).
		Where("kind in (?)", pg.In([]string{entity.KIND_GROUP, entity.KIND_WORKSPACE})).
		Where("deleted_at is not ?", nil).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetPackageIncludingDeleted(id string) (*entity.PackageEntity, error) {
	result := new(entity.PackageEntity)
	err := p.cp.GetConnection().Model(result).
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

func (p publishedRepositoryImpl) GetAllPackageGroups(name string, onlyFavorite bool, userId string) ([]entity.PackageFavEntity, error) {
	var result []entity.PackageFavEntity
	query := p.cp.GetConnection().Model(&result).
		Where("kind in (?)", pg.In([]string{entity.KIND_GROUP, entity.KIND_WORKSPACE})).
		Where("deleted_at is ?", nil)
	if name != "" {
		name = "%" + utils.LikeEscaped(name) + "%"
		query.Where("name ilike ?", name)
	}
	query.Order("parent_id ASC", "name ASC")

	query.ColumnExpr("package_group.*").
		ColumnExpr("fav.user_id as user_id")
	if onlyFavorite {
		query.Join("INNER JOIN favorite_packages as fav")
	} else {
		query.Join("FULL OUTER JOIN favorite_packages as fav")
	}
	query.JoinOn("package_group.id = fav.package_id").
		JoinOn("fav.user_id = ?", userId)

	err := query.Select()
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (p publishedRepositoryImpl) GetPackagesForPackageGroup(id string) ([]entity.PackageEntity, error) {
	var result []entity.PackageEntity
	err := p.cp.GetConnection().Model(&result).
		Where("parent_id = ?", id).
		Where("kind = ?", entity.KIND_PACKAGE).
		Where("deleted_at is ?", nil).
		Order("name ASC").
		Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetChildPackageGroups(parentId string, name string, onlyFavorite bool, userId string) ([]entity.PackageFavEntity, error) {
	var result []entity.PackageFavEntity
	query := p.cp.GetConnection().Model(&result).
		Where("package_group.kind in (?)", pg.In([]string{entity.KIND_GROUP, entity.KIND_WORKSPACE})).
		Where("package_group.deleted_at is ?", nil).
		Distinct()
	if parentId != "" {
		query.Where("package_group.parent_id = ?", parentId)
	} else {
		query.Where("package_group.parent_id is ?", nil)
	}
	if name != "" {
		name = "%" + utils.LikeEscaped(name) + "%"
		query.Where("package_group.name ilike ?", name)
	}
	query.Order("package_group.parent_id ASC", "package_group.name ASC")

	query.ColumnExpr("package_group.*").
		ColumnExpr("fav.user_id as user_id")
	if onlyFavorite {
		query.Join("INNER JOIN favorite_packages as fav")
	} else {
		query.Join("FULL OUTER JOIN favorite_packages as fav")
	}
	query.JoinOn("package_group.id = fav.package_id").
		JoinOn("fav.user_id = ?", userId)

	query.Join("INNER JOIN project pr").
		JoinOn("pr.id ilike (package_group.id || '%')")

	err := query.Select()

	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetAllChildPackageIdsIncludingParent(parentId string) ([]string, error) {
	var result []string
	var ents []entity.PackageIdEntity

	query := `with recursive children as (
    select id from package_group where id=?
		UNION ALL
		select g.id from package_group g inner join children on children.id = g.parent_id)
	select id from children`
	_, err := p.cp.GetConnection().Query(&ents, query, parentId)
	if err != nil {
		return nil, err
	}
	for _, ent := range ents {
		result = append(result, ent.Id)
	}
	return result, nil
}

func (p publishedRepositoryImpl) updateExcludeFromSearchForAllChildPackages(tx *pg.Tx, parentId string, excludeFromSearch bool) error {
	var ents []entity.PackageIdEntity
	query := `update package_group set exclude_from_search = ? where id like ? || '.%' and exclude_from_search != ?`
	_, err := tx.Query(&ents, query, excludeFromSearch, parentId, excludeFromSearch)
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) GetParentPackageGroups(id string) ([]entity.PackageEntity, error) {
	var result []entity.PackageEntity

	parentIds := utils.GetParentPackageIds(id)
	if len(parentIds) == 0 {
		return result, nil
	}

	err := p.cp.GetConnection().Model(&result).
		Where("kind in (?)", pg.In([]string{entity.KIND_GROUP, entity.KIND_WORKSPACE})).
		Where("deleted_at is ?", nil).
		ColumnExpr("package_group.*").
		Join("JOIN UNNEST(?::text[]) WITH ORDINALITY t(id, ord) USING (id)", pg.Array(parentIds)).
		Order("t.ord").
		Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetParentsForPackage(id string) ([]entity.PackageEntity, error) {
	var parentIds []string
	var result []entity.PackageEntity

	parentIds = utils.GetParentPackageIds(id)
	if len(parentIds) == 0 {
		return result, nil
	}

	err := p.cp.GetConnection().Model(&result).
		Where("deleted_at is ?", nil).
		ColumnExpr("package_group.*").
		Join("JOIN UNNEST(?::text[]) WITH ORDINALITY t(id, ord) USING (id)", pg.Array(parentIds)).
		Order("t.ord").
		Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) UpdatePackage(ent *entity.PackageEntity) (*entity.PackageEntity, error) {
	ctx := context.Background()

	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := p.updatePackage(tx, ent)
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return ent, nil
}

func (p publishedRepositoryImpl) updatePackage(tx *pg.Tx, ent *entity.PackageEntity) (*entity.PackageEntity, error) {
	_, err := tx.Model(ent).Where("id = ?", ent.Id).Update()
	if err != nil {
		return nil, err
	}
	if ent.ServiceName != "" {
		insertServiceOwnerQuery := `
			INSERT INTO package_service (workspace_id, package_id, service_name)
			VALUES (?, ?, ?)
			ON CONFLICT (workspace_id, package_id, service_name) DO NOTHING`
		_, err := tx.Exec(insertServiceOwnerQuery, utils.GetPackageWorkspaceId(ent.Id), ent.Id, ent.ServiceName)
		if err != nil {
			return nil, err
		}
	}
	err = p.updateExcludeFromSearchForAllChildPackages(tx, ent.Id, ent.ExcludeFromSearch)
	if err != nil {
		return nil, err
	}
	return ent, nil
}

func (p publishedRepositoryImpl) deletePackage(tx *pg.Tx, packageId string, userId string) error {
	ent := new(entity.PackageEntity)
	err := tx.Model(ent).
		Where("id = ?", packageId).
		Where("deleted_at is ?", nil).
		First()

	if err != nil {
		if err == pg.ErrNoRows {
			return nil
		}
		return err
	}

	err = p.markAllVersionsDeletedByPackageId(tx, packageId, userId)
	if err != nil {
		return err
	}

	timeNow := time.Now()
	ent.DeletedAt = &timeNow
	ent.DeletedBy = userId
	ent.ServiceName = ""

	_, err = p.updatePackage(tx, ent)
	if err != nil {
		return err
	}
	err = p.deletePackageServiceOwnership(tx, ent.Id)
	if err != nil {
		return err
	}

	return err
}

func (p publishedRepositoryImpl) deletePackageServiceOwnership(tx *pg.Tx, packageId string) error {
	_, err := tx.Exec(`delete from package_service where package_id = ?`, packageId)
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) DeletePackage(id string, userId string) error {
	ctx := context.Background()
	return p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		return p.deleteGroup(tx, id, userId)
	})
}

func (p publishedRepositoryImpl) deleteGroup(tx *pg.Tx, packageId string, userId string) error {
	ent := new(entity.PackageEntity)
	err := tx.Model(ent).
		Where("id = ?", packageId).
		Where("deleted_at is ?", nil).
		First()

	if err != nil {
		if err == pg.ErrNoRows {
			return nil
		}
		return err
	}

	var children []entity.PackageEntity
	err = tx.Model(&children).
		Where("parent_id = ?", packageId).
		Where("deleted_at is ?", nil).
		Select()
	if err != nil {
		if err != pg.ErrNoRows {
			return err
		}
	}
	for _, child := range children {
		if child.Kind == entity.KIND_GROUP || child.Kind == entity.KIND_WORKSPACE {
			err := p.deleteGroup(tx, child.Id, userId)
			if err != nil {
				return err
			}
		} else if child.Kind == entity.KIND_PACKAGE || child.Kind == entity.KIND_DASHBOARD {
			err := p.deletePackage(tx, child.Id, userId)
			if err != nil {
				return err
			}
		}
	}

	err = p.markAllVersionsDeletedByPackageId(tx, packageId, userId)
	if err != nil {
		return err
	}

	timeNow := time.Now()
	ent.DeletedAt = &timeNow
	ent.DeletedBy = userId
	ent.ServiceName = ""

	_, err = p.updatePackage(tx, ent)
	if err != nil {
		return err
	}
	err = p.deletePackageServiceOwnership(tx, ent.Id)
	if err != nil {
		return err
	}

	return err
}

func (p publishedRepositoryImpl) GetPackageGroupsByName(name string) ([]entity.PackageEntity, error) {
	var result []entity.PackageEntity
	err := p.cp.GetConnection().Model(&result).
		Where("name = ?", name).
		Where("kind in (?)", pg.In([]string{entity.KIND_GROUP, entity.KIND_WORKSPACE})).
		Where("deleted_at is ?", nil).
		Order("name ASC").
		Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetFilteredPackages(filter string, parentId string) ([]entity.PackageEntity, error) {
	var result []entity.PackageEntity
	query := p.cp.GetConnection().Model(&result).
		Where("deleted_at is ?", nil).
		Where("kind = ?", entity.KIND_PACKAGE).
		Order("name ASC")

	if filter != "" {
		filter = "%" + utils.LikeEscaped(filter) + "%"
		query.WhereGroup(func(q *pg.Query) (*pg.Query, error) {
			q = q.WhereOr("name ilike ?", filter).WhereOr("id ilike ?", filter)
			return q, nil
		})
	}
	if parentId != "" {
		query.Where("parent_id = ?", parentId)
	}

	err := query.Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetFilteredPackagesWithOffset(searchReq view.PackageListReq, userId string) ([]entity.PackageEntity, error) {
	var result []entity.PackageEntity
	query := p.cp.GetConnection().Model(&result).
		Where("deleted_at is ?", nil)
	if searchReq.OnlyFavorite {
		query.Join("INNER JOIN favorite_packages as fav").
			JoinOn("package_group.id = fav.package_id").
			JoinOn("fav.user_id = ?", userId)
	}
	if searchReq.OnlyShared {
		query.Join("INNER JOIN package_member_role as mem").
			JoinOn("package_group.id = mem.package_id").
			JoinOn("mem.user_id = ?", userId)
	}
	query.Order("name ASC").
		Offset(searchReq.Offset).
		Limit(searchReq.Limit)

	if searchReq.TextFilter != "" {
		searchReq.TextFilter = "%" + utils.LikeEscaped(searchReq.TextFilter) + "%"
		query.WhereGroup(func(q *pg.Query) (*pg.Query, error) {
			q = q.WhereOr("name ilike ?", searchReq.TextFilter).WhereOr("package_group.id ilike ?", searchReq.TextFilter)
			return q, nil
		})
	}
	if searchReq.ParentId != "" {
		if searchReq.ShowAllDescendants {
			query.Where("package_group.id ilike ?", searchReq.ParentId+".%")
		} else {
			query.Where("parent_id = ?", searchReq.ParentId)
		}
	}

	if len(searchReq.Kind) != 0 {
		query.Where("kind in (?)", pg.In(searchReq.Kind))
	}
	if searchReq.ServiceName != "" {
		query.Where("service_name = ?", searchReq.ServiceName)
	}
	if len(searchReq.Ids) > 0 {
		query.Where("id in (?)", pg.In(searchReq.Ids))
	}

	err := query.Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetPackageForServiceName(serviceName string) (*entity.PackageEntity, error) {
	result := new(entity.PackageEntity)
	err := p.cp.GetConnection().Model(result).
		Where("deleted_at is ?", nil).
		Where("service_name = ?", serviceName).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetVersionValidationChanges(packageId string, versionName string, revision int) (*entity.PublishedVersionValidationEntity, error) {
	result := new(entity.PublishedVersionValidationEntity)
	err := p.cp.GetConnection().Model(result).
		ExcludeColumn("spectral").
		Where("package_id = ?", packageId).
		Where("version = ?", versionName).
		Where("revision = ?", revision).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetVersionValidationProblems(packageId string, versionName string, revision int) (*entity.PublishedVersionValidationEntity, error) {
	result := new(entity.PublishedVersionValidationEntity)
	err := p.cp.GetConnection().Model(result).
		ExcludeColumn("changelog", "bwc").
		Where("package_id = ?", packageId).
		Where("version = ?", versionName).
		Where("revision = ?", revision).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func SplitVersionRevision(version string) (string, int, error) {
	if !strings.Contains(version, "@") {
		return version, 0, nil
	}
	versionSplit := strings.Split(version, "@")
	if len(versionSplit) != 2 {
		return "", -1, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidRevisionFormat,
			Message: exception.InvalidRevisionFormatMsg,
			Params:  map[string]interface{}{"version": version},
		}
	}
	versionName := versionSplit[0]
	versionRevisionStr := versionSplit[1]
	versionRevision, err := strconv.Atoi(versionRevisionStr)
	if err != nil {
		return "", -1, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidRevisionFormat,
			Message: exception.InvalidRevisionFormatMsg,
			Params:  map[string]interface{}{"version": version},
			Debug:   err.Error(),
		}
	}
	if versionRevision <= 0 {
		return "", -1, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidRevisionFormat,
			Message: exception.InvalidRevisionFormatMsg,
			Params:  map[string]interface{}{"version": version},
		}
	}
	return versionName, versionRevision, nil
}

func (p publishedRepositoryImpl) SearchForVersions(searchQuery *entity.PackageSearchQuery) ([]entity.PackageSearchResult, error) {
	searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
	var result []entity.PackageSearchResult
	versionsSearchQuery := `
	with    maxrev as
			(
				select package_id, version, revision, bool_or(s.latest_revision) as latest_revision
				from
				(
					select pv.package_id, pv.version, max(revision) as revision, true as latest_revision
					from published_version pv
							inner join package_group pg
								on pg.id = pv.package_id
								and pg.exclude_from_search = false
					--where (?packages = '{}' or pv.package_id = ANY(?packages))
					/*
					for now packages list serves as a list of parents and packages,
					after adding new parents list need to uncomment line above and change condition below to use parents list
					*/
					where (?packages = '{}' or pv.package_id like ANY(
						select id from unnest(?packages::text[]) id
						union
						select id||'.%' from unnest(?packages::text[]) id))
					and (?versions = '{}' or pv.version = ANY(?versions))
					group by pv.package_id, pv.version
					union
					select pv.package_id, pv.version, max(revision) as revision, false as latest_revision
					from published_version pv
						inner join package_group pg
							on pg.id = pv.package_id
							and pg.exclude_from_search = false
					where (?packages = '{}' or pv.package_id = ANY(?packages))
					and (?versions = '{}' or pv.version = ANY(?versions))
					and array_to_string(pv.labels,',') ilike ?text_filter
					group by pv.package_id, pv.version
				) s
				group by package_id, version, revision
			)
		select
		pkg.id as package_id,
		pkg.name,
		pkg.description,
		pkg.service_name,
		pv.version,
		pv.revision,
		pv.status,
		pv.published_at as created_at,
		pv.labels,
		maxrev.latest_revision,
		parent_package_names(pkg.id) parent_names,
		case
			when init_rank > 0 then init_rank + default_version_tf + version_status_tf + version_open_count
			else 0
		end rank,

		--debug
		coalesce(?open_count_weight) open_count_weight,
		pkg_name_tf,
		pkg_description_tf,
		pkg_id_tf,
		pkg_service_name_tf,
		version_tf,
		version_labels_tf,
		default_version_tf,
		version_status_tf,
		version_open_count
		from
		published_version pv
		inner join maxrev
			on pv.package_id = maxrev.package_id
			and pv.version = maxrev.version
			and pv.revision = maxrev.revision
		inner join package_group pkg
			on pv.package_id = pkg.id
		left join published_version_open_count oc
			on oc.package_id = pv.package_id
			and oc.version = pv.version,
		coalesce(?pkg_name_weight * (pkg.name ilike ?text_filter)::int, 0) pkg_name_tf,
		coalesce(?pkg_description_weight * (pkg.description ilike ?text_filter)::int, 0) pkg_description_tf,
		coalesce(?pkg_id_weight * (pkg.id ilike ?text_filter)::int, 0) pkg_id_tf,
		coalesce(?pkg_service_name_weight * (pkg.service_name ilike ?text_filter)::int, 0) pkg_service_name_tf,
		coalesce(?version_weight * (pv.version ilike ?text_filter)::int, 0) version_tf,
		coalesce(?version_label_weight * (array_to_string(pv.labels,',') ilike ?text_filter)::int, 0) version_labels_tf,
		coalesce(?default_version_weight * (pv.version = pkg.default_released_version)::int, 0) default_version_tf,
		coalesce(pkg_name_tf + pkg_description_tf + pkg_id_tf + pkg_service_name_tf + version_tf + version_labels_tf, 0) init_rank,
		coalesce(
			?version_status_release_weight * (pv.status = ?version_status_release)::int +
			?version_status_draft_weight * (pv.status = ?version_status_draft)::int +
			?version_status_archived_weight * (pv.status = ?version_status_archived)::int) version_status_tf,
		coalesce(?open_count_weight * coalesce(oc.open_count), 0) version_open_count
		where pv.deleted_at is null
		and (?statuses = '{}' or pv.status = ANY(?statuses))
		and pv.published_at >= ?start_date
		and pv.published_at <= ?end_date
		and init_rank > 0
		order by rank desc, created_at desc, version
		limit ?limit
		offset ?offset;
	`
	_, err := p.cp.GetConnection().Model(searchQuery).Query(&result, versionsSearchQuery)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}

func (p publishedRepositoryImpl) SearchForDocuments(searchQuery *entity.DocumentSearchQuery) ([]entity.DocumentSearchResult, error) {
	searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
	var result []entity.DocumentSearchResult
	documentsSearchQuery := `
		with	maxrev as
				(
						select pv.package_id, pv.version, max(revision) as revision
						from published_version pv
							inner join package_group pg
								on pg.id = pv.package_id
								and pg.exclude_from_search = false
						--where (?packages = '{}' or pv.package_id = ANY(?packages))
						/*
						for now packages list serves as a list of parents and packages,
						after adding new parents list need to uncomment line above and change condition below to use parents list
						*/
						where (?packages = '{}' or pv.package_id like ANY(
							select id from unnest(?packages::text[]) id
							union
							select id||'.%' from unnest(?packages::text[]) id))
						and (?versions = '{}' or pv.version = ANY(?versions))
						group by pv.package_id, pv.version
				),
				versions as
				(
						select pv.package_id, pv.version, pv.revision, pv.published_at, pv.status
						from published_version pv
						inner join maxrev
								on pv.package_id = maxrev.package_id
								and pv.version = maxrev.version
								and pv.revision = maxrev.revision
						where pv.deleted_at is null
								and (?statuses = '{}' or pv.status = ANY(?statuses))
								and pv.published_at >= ?start_date
								and pv.published_at <= ?end_date
				)
		select
		pg.id as package_id,
		pg.name,
		v.version,
		v.revision,
		v.status,
		v.published_at as created_at,
		c.slug,
		c.title,
		c.data_type as type,
		c.metadata,
		parent_package_names(pg.id) parent_names,
		case
			when init_rank > 0 then init_rank + version_status_tf + document_open_count
			else 0
		end rank,

		--debug
		coalesce(?open_count_weight) open_count_weight,
		content_tf,
		title_tf,
		labels_tf,
		version_status_tf,
		document_open_count
		from published_version_revision_content c
		inner join package_group pg
			on pg.id = c.package_id
		inner join versions v
			on v.package_id = c.package_id
			and v.version = c.version
			and v.revision = c.revision
		left join published_document_open_count oc
			on oc.package_id = c.package_id
			and oc.version = c.version
			and oc.slug = c.slug,
		coalesce(?content_weight * case	when c.data_type = ANY(?unknown_types) then 0
										else (c.metadata->>'description' ilike ?text_filter)::int end, 0) content_tf,
		coalesce(?title_weight * (c.title ilike ?text_filter)::int, 0) title_tf,
		coalesce(?labels_weight * (c.metadata->>'labels' ilike ?text_filter)::int, 0) labels_tf,
		coalesce(content_tf + title_tf + labels_tf, 0) init_rank,
		coalesce(
			?version_status_release_weight * (v.status = ?version_status_release)::int +
			?version_status_draft_weight * (v.status = ?version_status_draft)::int +
			?version_status_archived_weight * (v.status = ?version_status_archived)::int) version_status_tf,
		coalesce(?open_count_weight * coalesce(oc.open_count), 0) document_open_count
		where init_rank > 0
		order by rank desc, v.published_at desc, c.file_id, c.index asc
		limit ?limit
		offset ?offset;
	`
	_, err := p.cp.GetConnection().Model(searchQuery).Query(&result, documentsSearchQuery)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}

func (p publishedRepositoryImpl) RecalculatePackageOperationGroups(packageId string, restGroupingPrefixRegex string, graphqlGroupingPrefixRegex string, userId string) error {
	ctx := context.Background()

	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Exec(`delete from operation_group where package_id = ? and autogenerated = true`, packageId)
		if err != nil {
			return fmt.Errorf("failed to delete autogenerated groups for package %v from operation_group: %w", packageId, err)
		}
		err = p.recalculateOperationsGroupsTx(tx, packageId, "", 0, restGroupingPrefixRegex, graphqlGroupingPrefixRegex, userId)
		if err != nil {
			return fmt.Errorf("failed to insert groups for package %v: %w", packageId, err)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to recalculate package operations groups: %w", err)
	}
	return nil
}

func (p publishedRepositoryImpl) RecalculateOperationGroups(packageId string, version string, revision int, restGroupingPrefixRegex string, graphqlGroupingPrefixRegex string, userId string) error {
	ctx := context.Background()

	return p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		return p.recalculateOperationsGroupsTx(tx, packageId, version, revision, restGroupingPrefixRegex, graphqlGroupingPrefixRegex, userId)
	})
}

func (p publishedRepositoryImpl) recalculateOperationsGroupsTx(tx *pg.Tx, packageId string, version string, revision int, restGroupingPrefixRegex string, graphqlGroupingPrefixRegex string, userId string) error {
	if restGroupingPrefixRegex == "" && graphqlGroupingPrefixRegex == "" {
		return nil
	}
	if version != "" && revision != 0 {
		_, err := tx.Exec(`delete from operation_group where package_id = ? and version = ? and revision = ? and autogenerated = true`, packageId, version, revision)
		if err != nil {
			return fmt.Errorf("failed to delete autogenerated groups for package %v version %v revision %v from operation_group: %w", packageId, version, revision, err)
		}
	}
	var operationGroups []entity.OperationGroupEntity
	operationGroupsQuery := `
	select groups.*, og.template_checksum, og.template_filename, og.description from (
		select distinct
		package_id,
		version,
		revision,
		case
			when type = 'rest'
				then case when ? = '' then null else substring(metadata ->> 'path', ?) end
			when type = 'graphql'
				then case when ? = '' then null else substring(metadata ->> 'method', ?) end
		end group_name,
		type api_type,
		true autogenerated
		from operation
		where
		package_id = ?
		and (? = '' or version = ?)
		and (? = 0 or revision = ?)
	) groups
	left join operation_group og
		on og.package_id = groups.package_id
		and og.version = groups.version
		and og.revision = (groups.revision - 1)
		and og.group_name = groups.group_name
		and og.api_type = groups.api_type
		and og.autogenerated = true
	where groups.group_name is not null and groups.group_name != '';`
	_, err := tx.Query(&operationGroups, operationGroupsQuery,
		restGroupingPrefixRegex, restGroupingPrefixRegex,
		graphqlGroupingPrefixRegex, graphqlGroupingPrefixRegex,
		packageId,
		version, version,
		revision, revision)
	if err != nil {
		return fmt.Errorf("failed to calculate autogenerated groups %+v: %w", operationGroups, err)
	}
	if len(operationGroups) == 0 {
		return nil
	}

	for i, group := range operationGroups {
		operationGroups[i].GroupId = view.MakeOperationGroupId(group.PackageId, group.Version, group.Revision, group.ApiType, group.GroupName)
	}

	//delete manually created groups with the same PK as autogenerated groups
	deleteManualGroupsQuery := tx.Model(&operationGroups).Returning("operation_group_entity.*")
	var deletedManualGroups []entity.OperationGroupEntity
	err = tx.Model(&deletedManualGroups).WithDelete("operation_group", deleteManualGroupsQuery).Select()
	if err != nil {
		return fmt.Errorf("failed to delete not-autogenerated groups %+v: %w", operationGroups, err)
	}
	deletedGroupsHistory := make([]entity.OperationGroupHistoryEntity, len(deletedManualGroups))
	for _, deletedManualGroup := range deletedManualGroups {
		deletedGroupsHistory = append(deletedGroupsHistory, entity.OperationGroupHistoryEntity{
			GroupId:   deletedManualGroup.GroupId,
			Action:    view.OperationGroupActionDelete,
			Data:      deletedManualGroup,
			UserId:    userId,
			Date:      time.Now(),
			Automatic: true,
		})
	}
	if len(deletedGroupsHistory) > 0 {
		_, err = tx.Model(&deletedGroupsHistory).Insert()
		if err != nil {
			return err
		}
	}
	_, err = tx.Model(&operationGroups).
		OnConflict(`
			(package_id, version, revision, api_type, group_name) DO UPDATE
			SET autogenerated = EXCLUDED.autogenerated,
				description = EXCLUDED.description,
				template_checksum = EXCLUDED.template_checksum,
				template_filename = EXCLUDED.template_filename`).
		Insert()
	if err != nil {
		return fmt.Errorf("failed to insert autogenerated groups %+v: %w", operationGroups, err)
	}

	insertGroupedOperationsQuery := `
	insert into grouped_operation
	select ?, package_id, version, revision, operation_id from (
		select * from (
			select distinct
			package_id,
			version,
			revision,
			case
				when type = 'rest'
					then case when ? = '' then null else substring(metadata ->> 'path', ?) end
				when type = 'graphql'
					then case when ? = '' then null else substring(metadata ->> 'method', ?) end
			end group_name,
			operation_id
			from operation
			where
			package_id = ?
			and version = ?
			and revision = ?
			and type = ?
		) groups
		where group_name = ?
	) filtered_groups;`

	for _, group := range operationGroups {
		_, err = tx.Exec(insertGroupedOperationsQuery,
			group.GroupId,
			restGroupingPrefixRegex, restGroupingPrefixRegex,
			graphqlGroupingPrefixRegex, graphqlGroupingPrefixRegex,
			group.PackageId,
			group.Version,
			group.Revision,
			group.ApiType,
			group.GroupName)
		if err != nil {
			return fmt.Errorf("failed to insert autogenerated grouped operations for group %+v: %w", group, err)
		}
	}
	return nil
}

func (p publishedRepositoryImpl) GetVersionComparison(comparisonId string) (*entity.VersionComparisonEntity, error) {
	comparison := new(entity.VersionComparisonEntity)
	err := p.cp.GetConnection().
		Model(comparison).
		Where("comparison_id = ?", comparisonId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return comparison, nil
}

func (p publishedRepositoryImpl) GetVersionRefsComparisons(comparisonId string) ([]entity.VersionComparisonEntity, error) {
	comparisons := make([]entity.VersionComparisonEntity, 0)
	err := p.cp.GetConnection().
		Model(&comparisons).
		Where("comparison_id in (select unnest(refs) from version_comparison where comparison_id = ?)", comparisonId).
		Select()
	if err != nil {
		return nil, err
	}
	return comparisons, nil
}

func (p publishedRepositoryImpl) SaveTransformedDocument(data *entity.TransformedContentDataEntity, publishId string) error {
	ctx := context.Background()
	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var ents []entity.BuildEntity
		_, err := tx.Query(&ents, getBuildWithLock, publishId)
		if err != nil {
			return fmt.Errorf("SaveTransformedDocument: failed to get build %s: %w", publishId, err)
		}
		if len(ents) == 0 {
			return fmt.Errorf("SaveTransformedDocument: failed to start doc transformation publish. Build with buildId='%s' is not found", publishId)
		}
		build := &ents[0]

		//do not allow publish for "complete" builds and builds that are not failed with "Restart count exceeded limit"
		if build.Status == string(view.StatusComplete) ||
			(build.Status == string(view.StatusError) && build.RestartCount < 2) {
			return fmt.Errorf("failed to start document transformation. Build with buildId='%v' is already published or failed", publishId)
		}

		_, err = tx.Model(data).OnConflict("(package_id, version, revision, api_type, group_id, build_type, format) DO UPDATE").Insert()
		if err != nil {
			return fmt.Errorf("failed to insert published_data %+v: %w", data, err)
		}
		var ent entity.BuildEntity
		query := tx.Model(&ent).
			Where("build_id = ?", publishId).
			Set("status = ?", view.StatusComplete).
			Set("details = ?", "").
			Set("last_active = now()")
		_, err = query.Update()
		if err != nil {
			return fmt.Errorf("failed to update build entity: %w", err)
		}
		return nil
	})
	return err
}

func (p publishedRepositoryImpl) GetTransformedDocuments(packageId string, version string, apiType string, groupId string, buildType string, format string) (*entity.TransformedContentDataEntity, error) {
	result := new(entity.TransformedContentDataEntity)
	version, revision, err := SplitVersionRevision(version)
	if err != nil {
		return nil, err
	}
	err = p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Where("api_type = ?", apiType).
		Where("group_id = ?", groupId).
		Where("build_type = ?", buildType).
		Where("format = ?", format).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, err
}

func (p publishedRepositoryImpl) DeleteTransformedDocuments(packageId string, version string, revision int, apiType string, groupId string) error {
	ctx := context.Background()
	return p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		query := `
		delete from transformed_content_data
		where package_id = ? and version = ? and revision = ? and api_type = ? and group_id = ?`
		_, err := tx.Exec(query, packageId, version, revision, apiType, groupId)
		return err
	})
}

func (p publishedRepositoryImpl) GetVersionRevisionContentForDocumentsTransformation(packageId string, versionName string, revision int, searchQuery entity.ContentForDocumentsTransformationSearchQueryEntity) ([]entity.PublishedContentWithDataEntity, error) {
	var ents []entity.PublishedContentWithDataEntity
	query := p.cp.GetConnection().Model(&ents).Distinct().
		ColumnExpr("published_version_revision_content.*").ColumnExpr("pd.*")
	query.Join(`inner join
			(with refs as(
				select s.reference_id as package_id, s.reference_version as version, s.reference_revision as revision
				from published_version_reference s
				inner join published_version pv
				on pv.package_id = s.reference_id
				and pv.version = s.reference_version
				and pv.revision = s.reference_revision
				and pv.deleted_at is null
				where s.package_id = ?
				and s.version = ?
				and s.revision = ?
				and s.excluded = false
			)
			select package_id, version, revision
			from refs
			union
			select ? as package_id, ? as version, ? as revision
			) refs`, packageId, versionName, revision, packageId, versionName, revision)
	query.JoinOn("published_version_revision_content.package_id = refs.package_id").
		JoinOn("published_version_revision_content.version = refs.version").
		JoinOn("published_version_revision_content.revision = refs.revision")

	query.Join("inner join published_data as pd").
		JoinOn("published_version_revision_content.package_id = pd.package_id").
		JoinOn("published_version_revision_content.checksum = pd.checksum")

	if len(searchQuery.DocumentTypesFilter) > 0 {
		query.Where("data_type = any(?)", pg.Array(searchQuery.DocumentTypesFilter))
	}

	if searchQuery.OperationGroup != "" {
		query.Join(`inner join grouped_operation as go
					on go.operation_id = any(published_version_revision_content.operation_ids)
					and published_version_revision_content.package_id = go.package_id
					and published_version_revision_content.version = go.version
 				    and published_version_revision_content.revision = go.revision
					and go.group_id = ?`, searchQuery.OperationGroup)
	}

	query.Order("published_version_revision_content.package_id",
		"published_version_revision_content.version",
		"published_version_revision_content.revision",
		"index ASC").
		Offset(searchQuery.Offset).
		Limit(searchQuery.Limit)

	err := query.Select()

	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ents, err
}

func (p publishedRepositoryImpl) GetPublishedSourcesArchives(offset int) (*entity.PublishedSrcArchiveEntity, error) {
	result := new(entity.PublishedSrcArchiveEntity)
	err := p.cp.GetConnection().Model(result).Offset(offset).Limit(1).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) DeletePublishedSourcesArchives(checksums []string) error {
	ctx := context.Background()
	var deletedRows int
	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		query := `delete from published_sources_archives
		where checksum in (?)`
		result, err := tx.Exec(query, pg.In(checksums))
		if err != nil {
			return err
		}
		deletedRows += result.RowsAffected()
		return nil
	})

	if deletedRows > 0 {
		_, err = p.cp.GetConnection().Exec("vacuum full published_sources_archives")
		if err != nil {
			return errors.Wrap(err, "failed to run vacuum for table published_sources_archives")
		}
	}
	return nil
}

func (p publishedRepositoryImpl) SavePublishedSourcesArchive(ent *entity.PublishedSrcArchiveEntity) error {
	ctx := context.Background()
	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(ent).OnConflict("(checksum) DO NOTHING").Insert()
		if err != nil {
			return fmt.Errorf("failed to insert published_sources_archive %+v: %w", ent, err)
		}
		return nil
	})
	return err
}

func (p publishedRepositoryImpl) DeleteDraftVersionsBeforeDate_deprecated(packageId string, date time.Time, userId string) (int, error) {
	limit, page, deletedItems := 100, 0, 0
	for {
		ents, err := p.GetReadonlyPackageVersionsWithLimit_deprecated(entity.PublishedVersionSearchQueryEntity{
			PackageId: packageId,
			Status:    string(view.Draft),
			Limit:     limit,
			Offset:    limit * page,
		}, false)
		if err != nil {
			return 0, err
		}
		if len(ents) == 0 {
			return deletedItems, nil
		}

		for _, v := range ents {
			if v.PublishedAt.Before(date) { // set id of clean up job in deleted_by column
				err = p.MarkVersionDeleted(packageId, v.Version, userId)
				if err != nil {
					return deletedItems, err
				}
				deletedItems++
			}
		}
		page++
	}
}

func (p publishedRepositoryImpl) DeleteDraftVersionsBeforeDate(packageId string, date time.Time, userId string) (int, error) {
	limit, page, deletedItems := 100, 0, 0
	for {
		ents, err := p.GetReadonlyPackageVersionsWithLimit(entity.PublishedVersionSearchQueryEntity{
			PackageId: packageId,
			Status:    string(view.Draft),
			Limit:     limit,
			Offset:    limit * page,
		}, false)
		if err != nil {
			return 0, err
		}
		if len(ents) == 0 {
			return deletedItems, nil
		}

		for _, v := range ents {
			if v.PublishedAt.Before(date) { // set id of clean up job in deleted_by column
				err = p.MarkVersionDeleted(packageId, v.Version, userId)
				if err != nil {
					return deletedItems, err
				}
				deletedItems++
			}
		}
		page++
	}
}

type PublishedBuildChangesOverview map[string]int

func (p PublishedBuildChangesOverview) setUnexpectedEntry(table string) {
	p[fmt.Sprintf("%v.%v", table, "Unexpected")] = 1
}

func (p PublishedBuildChangesOverview) setNotFoundEntry(table string) {
	p[fmt.Sprintf("%v.%v", table, "NotFound")] = 1
}

func (p PublishedBuildChangesOverview) setTableChanges(table string, changesMap map[string]interface{}) {
	for key := range changesMap {
		p[fmt.Sprintf("%v.%v", table, key)] = 1
	}
}

func (p PublishedBuildChangesOverview) getUniqueChanges() []string {
	keys := make([]string, 0)
	for key := range p {
		keys = append(keys, key)
	}
	return keys
}

func (p publishedRepositoryImpl) GetPublishedVersionsHistory(filter view.PublishedVersionHistoryFilter) ([]entity.PackageVersionHistoryEntity, error) {
	result := make([]entity.PackageVersionHistoryEntity, 0)

	// query := p.cp.GetConnection().Model(&result)
	// if filter.PublishedAfter != nil {
	// 	query.Where("published_version.published_at >= ?", *filter.PublishedAfter)
	// }
	// if filter.PublishedBefore != nil {
	// 	query.Where("published_version.published_at <= ?", *filter.PublishedBefore)
	// }
	// if filter.Status != nil {
	// 	query.Where("published_version.status = ?", *filter.Status)
	// }
	// query.ColumnExpr("published_version.*, coalesce(o.api_types,'{}') api_types").
	// 	Where("deleted_at is null").
	// 	Join(`left join (
	// 		select package_id, version, revision, array_agg(distinct type) api_types
	// 		from operation
	// 		group by package_id, version, revision
	// 		) o`).
	// 	JoinOn("o.package_id = published_version.package_id").
	// 	JoinOn("o.version = published_version.version").
	// 	JoinOn("o.revision = published_version.revision").
	// 	Order("published_version.published_at asc", "published_version.package_id", "published_version.version", "published_version.revision").
	// 	Limit(filter.Limit).
	// 	Offset(filter.Limit * filter.Page)
	_, err := p.cp.GetConnection().Query(&result, `
			with publications as(
				select published_version.package_id,
						published_version.version,
						published_version.revision,
						status,
						published_version.published_at,
						previous_version_package_id,
						previous_version
						from published_version
				where deleted_at is null
				and (? is null or status = ?)
				and (? is null or published_at >= ?)
				and (? is null or published_at <= ?)
				order by published_at asc, package_id, version, revision
				limit ?
				offset ?
			),
			ops as (
				select o.package_id, o.version, o.revision, array_agg(distinct o.type) api_types
				from operation o
				inner join publications p
				on o.package_id = p.package_id
				and o.version = p.version
				and o.revision = p.revision
				group by o.package_id, o.version, o.revision
			)
			select
			p.*, coalesce(api_types,'{}') api_types
			from publications p
			left join ops o
				on o.package_id = p.package_id
				and o.version = p.version
				and o.revision = p.revision;
	`, filter.Status, filter.Status,
		filter.PublishedAfter, filter.PublishedAfter,
		filter.PublishedBefore, filter.PublishedBefore,
		filter.Limit, filter.Limit*filter.Page,
	)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) StoreOperationGroupPublishProcess(ent *entity.OperationGroupPublishEntity) error {
	_, err := p.cp.GetConnection().Model(ent).Insert()
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) UpdateOperationGroupPublishProcess(ent *entity.OperationGroupPublishEntity) error {
	_, err := p.cp.GetConnection().Model(ent).
		WherePK().
		Set("details = ?details").
		Set("status = ?status").
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) GetOperationGroupPublishProcess(publishId string) (*entity.OperationGroupPublishEntity, error) {
	result := new(entity.OperationGroupPublishEntity)
	err := p.cp.GetConnection().Model(result).
		Where("publish_id = ?", publishId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) StoreCSVDashboardPublishProcess(ent *entity.CSVDashboardPublishEntity) error {
	_, err := p.cp.GetConnection().Model(ent).Insert()
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) UpdateCSVDashboardPublishProcess(ent *entity.CSVDashboardPublishEntity) error {
	_, err := p.cp.GetConnection().Model(ent).
		WherePK().
		Set("message = ?message").
		Set("status = ?status").
		Set("csv_report = ?csv_report").
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) GetCSVDashboardPublishProcess(publishId string) (*entity.CSVDashboardPublishEntity, error) {
	result := new(entity.CSVDashboardPublishEntity)
	err := p.cp.GetConnection().Model(result).
		ExcludeColumn("csv_report").
		Where("publish_id = ?", publishId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetCSVDashboardPublishReport(publishId string) (*entity.CSVDashboardPublishEntity, error) {
	result := new(entity.CSVDashboardPublishEntity)
	err := p.cp.GetConnection().Model(result).
		Where("publish_id = ?", publishId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}
