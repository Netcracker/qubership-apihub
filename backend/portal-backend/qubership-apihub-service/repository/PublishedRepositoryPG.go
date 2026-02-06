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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/cleanup/logger"
	"github.com/google/uuid"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

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

func (p publishedRepositoryImpl) MarkVersionDeleted(packageId string, versionName string, userId string) (int, error) {
	ctx := context.Background()

	releasedRevisionsDeleted := 0
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
			if ent.Status == string(view.Release) {
				releasedRevisionsDeleted++
			}
			tmpEnt := &ent
			tmpEnt.DeletedAt = &timeNow
			tmpEnt.DeletedBy = userId
			_, err := tx.Model(tmpEnt).WherePK().Update()
			if err != nil {
				return err
			}
		}
		err = p.clearDefaultReleaseVersion(tx, packageId, versionName)
		if err != nil {
			return err
		}

		err = p.clearPreviousVersion(tx, packageId, versionName)
		if err != nil {
			return err
		}

		return nil
	})

	return releasedRevisionsDeleted, err
}

func (p publishedRepositoryImpl) clearDefaultReleaseVersion(tx *pg.Tx, packageId string, version string) error {
	_, err := tx.Exec(`
		UPDATE package_group
		SET default_released_version = null
		WHERE default_released_version = ? AND id = ?`, version, packageId)
	return err
}

func (p publishedRepositoryImpl) clearPreviousVersion(tx *pg.Tx, packageId string, version string) error {
	_, err := tx.Exec(`
		UPDATE published_version
		SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('deleted_previous_version', previous_version, 'deleted_previous_version_package_id', previous_version_package_id),
			previous_version = null,
			previous_version_package_id = null
		WHERE previous_version = ? AND (previous_version_package_id = ? OR ((previous_version_package_id = '' or previous_version_package_id is null) and package_id = ?))`,
		version, packageId, packageId)
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

		statusChanged := false
		if status != nil {
			if ent.Status != *status {
				statusChanged = true
			}

			ent.Status = *status
		}
		if versionLabels != nil {
			ent.Labels = *versionLabels
		}

		_, err = tx.Model(ent).Where("package_id = ?", ent.PackageId).Where("version = ?", ent.Version).Where("revision = ?", ent.Revision).Update()
		if err != nil {
			return err
		}

		// recalculate lite search index if status has changed
		if statusChanged && ent.Status == string(view.Draft) {
			cleanOldLiteSearchOperationsQuery := `delete from fts_latest_release_operation_data where package_id = ? and version = ? and revision = ?`
			_, err = tx.Exec(cleanOldLiteSearchOperationsQuery,
				ent.PackageId, ent.Version, ent.Revision)
			if err != nil {
				return fmt.Errorf("failed to delete fts_latest_release_operation_data: %w", err)
			}
		}
		if statusChanged && ent.Status == string(view.Release) {
			calculateLiteSearchOperationsQuery := `
								insert into fts_latest_release_operation_data
								select o.package_id, o.version, o.revision, o.operation_id, o.type, to_tsvector(convert_from(od.data,'UTF-8'))  data_vector from
								operation o inner join operation_data od on o.data_hash=od.data_hash
									where package_id = ? and version = ? and revision = ?
								on conflict (package_id, version, revision, operation_id) do update set data_vector = EXCLUDED.data_vector;`
			_, err = tx.Exec(calculateLiteSearchOperationsQuery,
				ent.PackageId, ent.Version, ent.Revision)
			if err != nil {
				return fmt.Errorf("failed to insert fts_latest_release_operation_data: %w", err)
			}
		}

		return nil
	})

	return ent, nil
}

func (p publishedRepositoryImpl) markAllVersionsDeletedByPackageId(tx *pg.Tx, packageId string, userId string) (int, error) {
	var ents []entity.PublishedVersionEntity
	err := tx.Model(&ents).
		Where("package_id = ?", packageId).
		Where("deleted_at is ?", nil).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return 0, nil
		}
		return 0, err
	}

	releasedRevisionsDeleted := 0
	timeNow := time.Now()
	for _, ent := range ents {
		if ent.Status == string(view.Release) {
			releasedRevisionsDeleted++
		}
		tmpEnt := &ent
		tmpEnt.DeletedAt = &timeNow
		tmpEnt.DeletedBy = userId
		err := p.updateVersion(tx, tmpEnt)
		if err != nil {
			return 0, err
		}
		clearPreviousVersionQuery := `
			UPDATE published_version
			SET previous_version = null, previous_version_package_id = null
			WHERE previous_version = ? AND (previous_version_package_id = ? OR ((previous_version_package_id = '' or previous_version_package_id is null) and package_id = ?))`
		_, err = tx.Exec(clearPreviousVersionQuery, ent.Version, packageId, packageId)
		if err != nil {
			return 0, err
		}
	}
	_, err = tx.Exec(`delete from grouped_operation where package_id = ?`, packageId)
	if err != nil {
		return 0, err
	}
	return releasedRevisionsDeleted, nil
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

func (p publishedRepositoryImpl) GetDeletedPackageLatestRevision(packageId, versionName string) (int, error) {
	result := new(entity.PublishedVersionEntity)
	version, _, err := SplitVersionRevision(versionName)
	if err != nil {
		return -1, err
	}
	query := p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("deleted_at is not ?", nil).
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

func (p publishedRepositoryImpl) GetReadonlyVersion(packageId string, versionName string, showOnlyDeleted bool) (*entity.PackageVersionRevisionEntity, error) {
	var getPackage *entity.PackageEntity
	var errGetPackage error
	notCondition := ""

	if showOnlyDeleted {
		getPackage, errGetPackage = p.GetPackageIncludingDeleted(packageId)
		notCondition = "not"
	} else {
		getPackage, errGetPackage = p.GetPackage(packageId)
	}

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
		and pv.deleted_at is %s null
	limit 1
	`
	_, err = p.cp.GetConnection().QueryOne(result, fmt.Sprintf(query, notCondition), packageId, version, revision, packageId, version, revision, revision)
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
	refs []*entity.PublishedReferenceEntity, src *entity.PublishedSrcEntity, operations []*entity.OperationEntity, operationData []*entity.OperationDataEntity, versionComparisons []*entity.VersionComparisonEntity, operationComparisons []*entity.OperationComparisonEntity, versionComparisonsFromCache []string,
	versionInternalDocs []*entity.VersionInternalDocumentEntity, versionInternalDocData []*entity.VersionInternalDocumentDataEntity, comparisonInternalDocs []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocData []*entity.ComparisonInternalDocumentDataEntity) error {
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

	currentTable = "version_internal_document"
	oldVersionInternalDocs := make([]entity.VersionInternalDocumentEntity, 0)
	err = tx.Model(&oldVersionInternalDocs).
		Where("package_id = ?", version.PackageId).
		Where("version = ?", version.Version).
		Where("revision = ?", version.Revision).
		Select()
	if err != nil {
		return err
	}
	versionInternalDocsChanges := make(map[string]interface{}, 0)
	matchedVersionInternalDocs := make(map[string]struct{}, 0)
	oldVersionInternalDocHashes := make(map[string]struct{}, 0)
	for _, s := range oldVersionInternalDocs {
		found := false
		oldVersionInternalDocHashes[s.Hash] = struct{}{}
		for _, t := range versionInternalDocs {
			if s.DocumentId == t.DocumentId {
				found = true
				matchedVersionInternalDocs[s.DocumentId] = struct{}{}
				if docChanges := s.GetChanges(*t); len(docChanges) > 0 {
					versionInternalDocsChanges[s.DocumentId] = docChanges
					changesOverview.setTableChanges(currentTable, docChanges)
					continue
				}
			}
		}
		if !found {
			versionInternalDocsChanges[s.DocumentId] = "version internal document not found in build archive"
			changesOverview.setNotFoundEntry(currentTable)
		}
	}
	for _, t := range versionInternalDocs {
		if _, matched := matchedVersionInternalDocs[t.DocumentId]; !matched {
			versionInternalDocsChanges[t.DocumentId] = "unexpected version internal document (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	if len(versionInternalDocsChanges) > 0 {
		changes[currentTable] = versionInternalDocsChanges
	}

	currentTable = "version_internal_document_data"
	versionInternalDocDataChanges := make(map[string]interface{}, 0)
	matchedVersionInternalDocHashes := make(map[string]struct{}, 0)
	for oldHash := range oldVersionInternalDocHashes {
		found := false
		for _, newDocData := range versionInternalDocData {
			if oldHash == newDocData.Hash {
				found = true
				matchedVersionInternalDocHashes[oldHash] = struct{}{}
			}
		}
		if !found {
			versionInternalDocDataChanges[oldHash] = "version internal document data not found in build archive"
			changesOverview.setNotFoundEntry(currentTable)
		}
	}
	for _, newDocData := range versionInternalDocData {
		if _, matched := matchedVersionInternalDocHashes[newDocData.Hash]; !matched {
			versionInternalDocDataChanges[newDocData.Hash] = "unexpected version internal document data (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	if len(versionInternalDocDataChanges) > 0 {
		changes[currentTable] = versionInternalDocDataChanges
	}

	if !packageInfo.NoChangelog && packageInfo.PreviousVersion != "" {
		comparisonInternalDocsChanges, err := p.getComparisonInternalDocumentsChanges(tx, packageInfo, comparisonInternalDocs, comparisonInternalDocData, &changesOverview)
		if err != nil {
			return err
		}
		for tableName, tableChanges := range comparisonInternalDocsChanges {
			changes[tableName] = tableChanges
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

func (p publishedRepositoryImpl) getComparisonInternalDocumentsChanges(tx *pg.Tx, packageInfo view.PackageInfoFile, comparisonInternalDocs []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocData []*entity.ComparisonInternalDocumentDataEntity, changesOverview *PublishedBuildChangesOverview) (map[string]interface{}, error) {
	var err error
	allChanges := make(map[string]interface{}, 0)

	currentTable := "comparison_internal_document"
	oldComparisonInternalDocs := make([]entity.ComparisonInternalDocumentEntity, 0)
	if packageInfo.PreviousVersionPackageId == "" {
		packageInfo.PreviousVersionPackageId = packageInfo.PackageId
	}
	if packageInfo.PreviousVersionRevision == 0 {
		_, err = tx.QueryOne(pg.Scan(&packageInfo.PreviousVersionRevision), `
		select max(revision) from published_version
			where package_id = ?
			and version = ?`, packageInfo.PreviousVersionPackageId, packageInfo.PreviousVersion)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate previous version revision for comparison internal docs: %v", err.Error())
		}
	}
	// Fetch comparison internal documents for main comparison and refs
	versionComparisonSnapshotTable := fmt.Sprintf(`migration."version_comparison_%s"`, packageInfo.MigrationId)
	getComparisonInternalDocsQuery := fmt.Sprintf(`
		with ref_comparisons as (
			select
				unnest(refs) as comparison_id
			from %s
			where package_id = ?
				and version = ?
				and revision = ?
				and previous_package_id = ?
				and previous_version = ?
				and previous_revision = ?
		),
		ref_comparison_details as (
			select
				package_id,
				version,
				revision,
				previous_package_id,
				previous_version,
				previous_revision
			from %s
			where comparison_id in (select comparison_id from ref_comparisons)
		)
		select * from comparison_internal_document
		where (package_id, version, revision, previous_package_id, previous_version, previous_revision) in (
			select ?, ?, ?, ?, ?, ?
			union
			select package_id, version, revision, previous_package_id, previous_version, previous_revision
			from ref_comparison_details
		)
		`, versionComparisonSnapshotTable, versionComparisonSnapshotTable)
	_, err = tx.Query(&oldComparisonInternalDocs, getComparisonInternalDocsQuery,
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
		return nil, fmt.Errorf("failed to get comparison internal documents from db: %v", err.Error())
	}
	comparisonInternalDocsChanges := make(map[string]interface{}, 0)
	matchedComparisonInternalDocs := make(map[string]struct{}, 0)
	oldComparisonInternalDocHashes := make(map[string]struct{}, 0)
	for _, s := range oldComparisonInternalDocs {
		found := false
		oldComparisonInternalDocHashes[s.Hash] = struct{}{}
		for _, t := range comparisonInternalDocs {
			if s.DocumentId == t.DocumentId {
				found = true
				matchedComparisonInternalDocs[s.DocumentId] = struct{}{}
				if docChanges := s.GetChanges(*t); len(docChanges) > 0 {
					comparisonInternalDocsChanges[s.DocumentId] = docChanges
					changesOverview.setTableChanges(currentTable, docChanges)
					continue
				}
			}
		}
		if !found {
			comparisonInternalDocsChanges[s.DocumentId] = "comparison internal document not found in build archive"
			changesOverview.setNotFoundEntry(currentTable)
		}
	}
	for _, t := range comparisonInternalDocs {
		if _, matched := matchedComparisonInternalDocs[t.DocumentId]; !matched {
			comparisonInternalDocsChanges[t.DocumentId] = "unexpected comparison internal document (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	if len(comparisonInternalDocsChanges) > 0 {
		allChanges[currentTable] = comparisonInternalDocsChanges
	}

	currentTable = "comparison_internal_document_data"
	comparisonInternalDocDataChanges := make(map[string]interface{}, 0)
	matchedComparisonInternalDocHashes := make(map[string]struct{}, 0)
	for oldHash := range oldComparisonInternalDocHashes {
		found := false
		for _, newDocData := range comparisonInternalDocData {
			if oldHash == newDocData.Hash {
				found = true
				matchedComparisonInternalDocHashes[oldHash] = struct{}{}
			}
		}
		if !found {
			comparisonInternalDocDataChanges[oldHash] = "comparison internal document data not found in build archive"
			changesOverview.setNotFoundEntry(currentTable)
		}
	}
	for _, newDocData := range comparisonInternalDocData {
		if _, matched := matchedComparisonInternalDocHashes[newDocData.Hash]; !matched {
			comparisonInternalDocDataChanges[newDocData.Hash] = "unexpected comparison internal document data (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	if len(comparisonInternalDocDataChanges) > 0 {
		allChanges[currentTable] = comparisonInternalDocDataChanges
	}

	return allChanges, nil
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
	versionComparisons []*entity.VersionComparisonEntity, serviceName string, pkg *entity.PackageEntity, versionComparisonsFromCache []string,
	versionInternalDocEntities []*entity.VersionInternalDocumentEntity, versionInternalDocDataEntities []*entity.VersionInternalDocumentDataEntity,
	comparisonInternalDocEntities []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocDataEntities []*entity.ComparisonInternalDocumentDataEntity) error {
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
			err := p.validateMigrationResult(tx, packageInfo, buildId, version, content, data, refs, src, operations, operationsData, versionComparisons, operationComparisons, versionComparisonsFromCache, versionInternalDocEntities, versionInternalDocDataEntities, comparisonInternalDocEntities, comparisonInternalDocDataEntities)
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

		var existingGroupedOperations []entity.GroupedOperationEntity

		if packageInfo.MigrationBuild {
			// In case of migration list of operations may change due to new builder implementation, so need to cleanup existing list before insert

			start = time.Now()
			// Need to preserve grouped operations, since it will be deleted along with operations
			err = tx.Model(&existingGroupedOperations).
				Where("package_id = ?", version.PackageId).
				Where("version = ?", version.Version).
				Where("revision = ?", version.Revision).Select()
			if err != nil {
				return fmt.Errorf("failed to fetch grouped operations before operations cleanup: %w", err)
			}

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

				calculateFullTextSearchOperationsQuery := `
					insert into fts_operation_data
					select data_hash,
						to_tsvector(convert_from(data,'UTF-8'))  data_vector
					from operation_data where operation_data.data_hash in (select distinct data_hash from operation where package_id = ? and version = ? and revision = ?)
					on conflict (data_hash) do update set data_vector = EXCLUDED.data_vector`
				_, err = tx.Exec(calculateFullTextSearchOperationsQuery,
					version.PackageId, version.Version, version.Revision)
				if err != nil {
					return fmt.Errorf("failed to insert fts_operation_data: %w", err)
				}

				utils.PerfLog(time.Since(start).Milliseconds(), 1000, "CreateVersionWithData: ts_vectors insert")
			}
		}

		if version.Status == string(view.Release) && !packageInfo.MigrationBuild {
			start = time.Now()
			if version.Revision > 1 {
				cleanOldLiteSearchOperationsQuery := `delete from fts_latest_release_operation_data where package_id = ? and version = ? and revision = ?`
				_, err = tx.Exec(cleanOldLiteSearchOperationsQuery,
					version.PackageId, version.Version, version.Revision-1)
				if err != nil {
					return fmt.Errorf("failed to cleanup old revision fts_latest_release_operation_data: %w", err)
				}
			}

			calculateLiteSearchOperationsQuery := `
						insert into fts_latest_release_operation_data
						select o.package_id, o.version, o.revision, o.operation_id, o.type, to_tsvector(convert_from(od.data,'UTF-8'))  data_vector from
						operation o inner join operation_data od on o.data_hash=od.data_hash
							where package_id = ? and version = ? and revision = ?
						on conflict (package_id, version, revision, operation_id) do update set data_vector = EXCLUDED.data_vector;`
			_, err = tx.Exec(calculateLiteSearchOperationsQuery,
				version.PackageId, version.Version, version.Revision)
			if err != nil {
				return fmt.Errorf("failed to insert fts_latest_release_operation_data: %w", err)
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 1000, "CreateVersionWithData: fts_latest_release_operation_data insert")
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

		start = time.Now()
		for _, d := range versionInternalDocDataEntities {
			exists, err := p.versionInternalDocumentDataExists(tx, d.Hash) // TODO: could be bulk select
			if err != nil {
				return err
			}
			if !exists {
				_, err := tx.Model(d).OnConflict("(hash) DO UPDATE").Insert()
				if err != nil {
					return fmt.Errorf("failed to insert version_internal_document_data %+v: %w", d, err)
				}
			}
		}
		for _, c := range versionInternalDocEntities {
			_, err := tx.Model(c).OnConflict("(package_id, version, revision, document_id) DO UPDATE").Insert()
			if err != nil {
				return fmt.Errorf("failed to insert version_internal_document %+v: %w", c, err)
			}
		}
		utils.PerfLog(time.Since(start).Milliseconds(), 200, "CreateVersionWithData: version internal documents insert")
		start = time.Now()
		err = p.saveComparisonInternalDocumentsTx(tx, comparisonInternalDocEntities, comparisonInternalDocDataEntities)
		if err != nil {
			return err
		}
		utils.PerfLog(time.Since(start).Milliseconds(), 200, "CreateVersionWithData: comparison internal documents insert")

		if len(existingGroupedOperations) > 0 {
			// Restore grouped operations
			start = time.Now()

			currentOpIds := make(map[string]struct{})
			oldToNewOpIds := make(map[string][]string)

			for _, op := range operations {
				currentOpIds[op.OperationId] = struct{}{}

				oldOpId := op.Metadata.GetOperationIdV1()
				if oldOpId != "" && oldOpId != op.OperationId {
					// OperationId has changed, add mapping
					oldToNewOpIds[oldOpId] = append(oldToNewOpIds[oldOpId], op.OperationId)
				}
			}

			var groupedOperationsToRestore []entity.GroupedOperationEntity
			for _, groupedOperation := range existingGroupedOperations {
				if _, ok := currentOpIds[groupedOperation.OperationId]; ok {
					// OperationId is not changed, use existing grouped operation for restore
					groupedOperationsToRestore = append(groupedOperationsToRestore, groupedOperation)
					continue
				}

				if newOpIds, ok := oldToNewOpIds[groupedOperation.OperationId]; ok {
					// OperationId has changed, add new grouped operations for restore
					for _, newOpId := range newOpIds {
						groupedOperationsToRestore = append(groupedOperationsToRestore, entity.GroupedOperationEntity{
							GroupId:     groupedOperation.GroupId,
							PackageId:   groupedOperation.PackageId,
							Version:     groupedOperation.Version,
							Revision:    groupedOperation.Revision,
							OperationId: newOpId,
						})
					}
					continue
				}

				log.Warnf("Grouped operation with id %s is not found in the operations list and will not be restored. PackageId=%s, version=%s, revision=%d",
					groupedOperation.OperationId, version.PackageId, version.Version, version.Revision)
			}

			_, err = tx.Model(&groupedOperationsToRestore).Insert()
			if err != nil {
				return fmt.Errorf("failed to restore grouped operations: %w", err)
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 50, "CreateVersionWithData: restore grouped operations")
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

func (p publishedRepositoryImpl) validateChangelogMigrationResult(tx *pg.Tx, packageInfo view.PackageInfoFile, publishId string, versionComparisons []*entity.VersionComparisonEntity, operationComparisons []*entity.OperationComparisonEntity, versionComparisonsFromCache []string, comparisonInternalDocs []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocData []*entity.ComparisonInternalDocumentDataEntity) error {
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

	comparisonInternalDocsChanges, err := p.getComparisonInternalDocumentsChanges(tx, packageInfo, comparisonInternalDocs, comparisonInternalDocData, &changesOverview)
	if err != nil {
		return err
	}
	for tableName, tableChanges := range comparisonInternalDocsChanges {
		changes[tableName] = tableChanges
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

func (p publishedRepositoryImpl) SaveVersionChanges(packageInfo view.PackageInfoFile, publishId string, operationComparisons []*entity.OperationComparisonEntity, versionComparisons []*entity.VersionComparisonEntity, versionComparisonsFromCache []string, comparisonInternalDocEntities []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocDataEntities []*entity.ComparisonInternalDocumentDataEntity) error {
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
			err := p.validateChangelogMigrationResult(tx, packageInfo, publishId, versionComparisons, operationComparisons, versionComparisonsFromCache, comparisonInternalDocEntities, comparisonInternalDocDataEntities)
			if err != nil {
				return err
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 500, "SaveVersionChanges: validateChangelogMigrationResult")
		}
		err = p.saveVersionChangesTx(tx, operationComparisons, versionComparisons)
		if err != nil {
			return err
		}

		err = p.saveComparisonInternalDocumentsTx(tx, comparisonInternalDocEntities, comparisonInternalDocDataEntities)
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
			open_count =	version_comparison.open_count+1,
			builder_version = EXCLUDED.builder_version,
			metadata = EXCLUDED.metadata`).Insert()
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

func (p publishedRepositoryImpl) saveComparisonInternalDocumentsTx(tx *pg.Tx, comparisonInternalDocEntities []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocDataEntities []*entity.ComparisonInternalDocumentDataEntity) error {
	for _, d := range comparisonInternalDocDataEntities {
		exists, err := p.comparisonInternalDocumentDataExists(tx, d.Hash) // TODO: could be bulk select
		if err != nil {
			return err
		}
		if !exists {
			_, err := tx.Model(d).OnConflict("(hash) DO UPDATE").Insert()
			if err != nil {
				return fmt.Errorf("failed to insert comparison_internal_document_data %+v: %w", d, err)
			}
		}
	}
	for _, c := range comparisonInternalDocEntities {
		_, err := tx.Model(c).OnConflict("(package_id, version, revision, previous_package_id, previous_version, previous_revision, document_id) DO UPDATE").Insert()
		if err != nil {
			return fmt.Errorf("failed to insert comparison_internal_document %+v: %w", c, err)
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
			where (pv.previous_version_package_id = ? or (pv.package_id = ? and pv.previous_version_package_id is null))
			and pv.previous_version = ?
			and pv.deleted_at is null
			order by pv.published_at desc
	`
	_, err = p.cp.GetConnection().Query(&ents, query, previousPackageId, previousPackageId, previousVersion)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return ents, err
}

func (p publishedRepositoryImpl) GetReadonlyPackageVersionsWithLimit(searchQuery entity.PublishedVersionSearchQueryEntity, checkRevisions bool, showOnlyDeleted bool) ([]entity.PackageVersionRevisionEntity, error) {
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

	notCondition := ""
	if showOnlyDeleted {
		notCondition = "not"
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
			and pv.deleted_at is %s null
			order by pv.%s %s
			limit ?limit
			offset ?offset
	`
		_, err := p.cp.GetConnection().Model(&searchQuery).
			Query(&ents, fmt.Sprintf(query, notCondition, searchQuery.SortBy, searchQuery.SortOrder))
		if err != nil {
			if err == pg.ErrNoRows {
				return nil, nil
			}
			return nil, err
		}
	}

	return ents, nil
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

func (p publishedRepositoryImpl) GetParentsForPackage(id string, includeDeleted bool) ([]entity.PackageEntity, error) {
	var parentIds []string
	var result []entity.PackageEntity

	parentIds = utils.GetParentPackageIds(id)
	if len(parentIds) == 0 {
		return result, nil
	}

	query := p.cp.GetConnection().Model(&result)
	if !includeDeleted {
		query.Where("deleted_at is ?", nil)
	}

	query.ColumnExpr("package_group.*").
		Join("JOIN UNNEST(?::text[]) WITH ORDINALITY t(id, ord) USING (id)", pg.Array(parentIds)).
		Order("t.ord")

	err := query.Select()
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

func (p publishedRepositoryImpl) deletePackage(tx *pg.Tx, packageId string, userId string) (int, error) {
	ent := new(entity.PackageEntity)
	err := tx.Model(ent).
		Where("id = ?", packageId).
		Where("deleted_at is ?", nil).
		First()

	if err != nil {
		if err == pg.ErrNoRows {
			return 0, nil
		}
		return 0, err
	}

	deletedReleaseCount, err := p.markAllVersionsDeletedByPackageId(tx, packageId, userId)
	if err != nil {
		return 0, err
	}

	timeNow := time.Now()
	ent.DeletedAt = &timeNow
	ent.DeletedBy = userId
	ent.ServiceName = ""

	_, err = p.updatePackage(tx, ent)
	if err != nil {
		return 0, err
	}
	err = p.deletePackageServiceOwnership(tx, ent.Id)
	if err != nil {
		return 0, err
	}

	return deletedReleaseCount, err
}

func (p publishedRepositoryImpl) deletePackageServiceOwnership(tx *pg.Tx, packageId string) error {
	_, err := tx.Exec(`delete from package_service where package_id = ?`, packageId)
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) DeletePackage(id string, userId string) (int, error) {
	ctx := context.Background()
	var deletedReleaseCount int
	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		count, err := p.deleteGroup(tx, id, userId)
		if err != nil {
			return err
		}
		deletedReleaseCount = count
		return nil
	})
	return deletedReleaseCount, err
}

func (p publishedRepositoryImpl) deleteGroup(tx *pg.Tx, packageId string, userId string) (int, error) {
	ent := new(entity.PackageEntity)
	err := tx.Model(ent).
		Where("id = ?", packageId).
		Where("deleted_at is ?", nil).
		First()

	if err != nil {
		if err == pg.ErrNoRows {
			return 0, nil
		}
		return 0, err
	}

	totalDeletedReleaseCount := 0
	var children []entity.PackageEntity
	err = tx.Model(&children).
		Where("parent_id = ?", packageId).
		Where("deleted_at is ?", nil).
		Select()
	if err != nil {
		if err != pg.ErrNoRows {
			return 0, err
		}
	}
	for _, child := range children {
		if child.Kind == entity.KIND_GROUP || child.Kind == entity.KIND_WORKSPACE {
			count, err := p.deleteGroup(tx, child.Id, userId)
			if err != nil {
				return 0, err
			}
			totalDeletedReleaseCount += count
		} else if child.Kind == entity.KIND_PACKAGE || child.Kind == entity.KIND_DASHBOARD {
			count, err := p.deletePackage(tx, child.Id, userId)
			if err != nil {
				return 0, err
			}
			totalDeletedReleaseCount += count
		}
	}

	count, err := p.markAllVersionsDeletedByPackageId(tx, packageId, userId)
	if err != nil {
		return 0, err
	}
	totalDeletedReleaseCount += count

	timeNow := time.Now()
	ent.DeletedAt = &timeNow
	ent.DeletedBy = userId
	ent.ServiceName = ""

	_, err = p.updatePackage(tx, ent)
	if err != nil {
		return 0, err
	}
	err = p.deletePackageServiceOwnership(tx, ent.Id)
	if err != nil {
		return 0, err
	}

	return totalDeletedReleaseCount, err
}

func (p publishedRepositoryImpl) GetFilteredPackagesWithOffset(ctx context.Context, searchReq view.PackageListReq, userId string) ([]entity.PackageEntity, error) {
	var result []entity.PackageEntity
	query := p.cp.GetConnection().ModelContext(ctx, &result).
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
	if searchReq.ParentId != "" && searchReq.ParentId != "*" {
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

func (p publishedRepositoryImpl) GetFilteredDeletedPackages(ctx context.Context, searchReq view.PackageListReq, userId string) ([]entity.PackageEntity, error) {
	var result []entity.PackageEntity

	query := p.cp.GetConnection().ModelContext(ctx, &result).
		Where("deleted_at is not ?", nil)

	query.Order("name ASC").
		Offset(searchReq.Offset).
		Limit(searchReq.Limit)

	if searchReq.ParentId != "" && searchReq.ParentId != "*" {
		if searchReq.ShowAllDescendants {
			query.Where("package_group.id ilike ?", searchReq.ParentId+".%")
		} else {
			query.Where("parent_id = ?", searchReq.ParentId)
		}
	}

	if len(searchReq.Kind) != 0 {
		query.Where("kind in (?)", pg.In(searchReq.Kind))
	}

	err := query.Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetVersionValidationChanges_deprecated(packageId string, versionName string, revision int) (*entity.PublishedVersionValidationEntity_deprecated, error) {
	result := new(entity.PublishedVersionValidationEntity_deprecated)
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

func (p publishedRepositoryImpl) GetVersionValidationProblems_deprecated(packageId string, versionName string, revision int) (*entity.PublishedVersionValidationEntity_deprecated, error) {
	result := new(entity.PublishedVersionValidationEntity_deprecated)
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

func (p publishedRepositoryImpl) GetVersionRevisionContentForDocumentsTransformation(packageId string, versionName string, revision int, searchQuery entity.ContentForDocumentsTransformationSearchQueryEntity) ([]entity.PublishedContentWithDataEntity, error) {
	var ents []entity.PublishedContentWithDataEntity
	query := p.cp.GetConnection().Model(&ents).Distinct().
		ColumnExpr("published_version_revision_content.*").ColumnExpr("pd.*").ColumnExpr("published_version_revision_content.package_id as content_package_id")
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

func (p publishedRepositoryImpl) DeletePackageRevisionsBeforeDate(ctx context.Context, packageId string, deleteBefore time.Time, deleteLastRevision bool, deleteReleaseRevisions bool, deletedBy string) (int, int, error) {
	var totalDeletedCount int
	var totalReleaseDeletedCount int
	var processingErrors []error

	var versions []string
	err := p.cp.GetConnection().ModelContext(ctx, (*entity.PublishedVersionEntity)(nil)).
		Column("version").
		Where("package_id = ? AND deleted_at is null", packageId).
		Order("version ASC").
		Distinct().
		Select(&versions)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to get versions: %w", err)
	}

	for idx, version := range versions {
		logger.Tracef(ctx, "Processing version %d/%d: %s", idx+1, len(versions), version)
		deletedCount, releaseCount, err := p.deleteVersionRevisions(ctx, packageId, version, deleteBefore, deleteLastRevision, deleteReleaseRevisions, deletedBy)
		if err != nil {
			if ctx.Err() != nil {
				return totalDeletedCount, totalReleaseDeletedCount, ctx.Err()
			}
			processingErrors = append(processingErrors, fmt.Errorf("failed to process version %s: %w", version, err))
			continue
		}
		totalDeletedCount += deletedCount
		totalReleaseDeletedCount += releaseCount
	}

	if len(processingErrors) > 0 {
		var combinedErr error
		for _, err := range processingErrors {
			if combinedErr == nil {
				combinedErr = err
			} else {
				combinedErr = fmt.Errorf("%v; %v", combinedErr, err)
			}
		}
		logger.Debugf(ctx, "Package %s revisions cleanup completed with %d errors. Total deleted: %d (%d release)", packageId, len(processingErrors), totalDeletedCount, totalReleaseDeletedCount)
		return totalDeletedCount, totalReleaseDeletedCount, fmt.Errorf("cleanup completed with errors (deleted %d items): %w", totalDeletedCount, combinedErr)
	}

	logger.Debugf(ctx, "Package %s revisions cleanup completed. Total deleted: %d (%d release)", packageId, totalDeletedCount, totalReleaseDeletedCount)
	return totalDeletedCount, totalReleaseDeletedCount, nil
}

func (p publishedRepositoryImpl) deleteVersionRevisions(ctx context.Context, packageId string, version string, deleteBefore time.Time, deleteLastRevision bool, deleteReleaseRevisions bool, deletedBy string) (int, int, error) {
	var deletedCount int
	var deletedReleaseCount int
	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var revisions []entity.PublishedVersionEntity
		err := tx.Model(&revisions).
			Where("package_id = ? AND version = ? AND deleted_at is null", packageId, version).
			Order("revision ASC").
			Select()
		if err != nil {
			return fmt.Errorf("failed to get revisions: %w", err)
		}

		var candidates []*entity.PublishedVersionEntity
		lastRevisionIndex := len(revisions) - 1
		for i, revision := range revisions {
			if !revision.PublishedAt.Before(deleteBefore) {
				logger.Tracef(ctx, "package %s, version %s, revision %d is not before delete threshold %s, skipping", packageId, version, revision.Revision, deleteBefore)
				break
			}
			if i == lastRevisionIndex && !deleteLastRevision {
				logger.Tracef(ctx, "package %s, version %s, last revision %d, skipping because deleteLastRevision=false", packageId, version, revision.Revision)
				break
			}
			if revision.Status == string(view.Release) && !deleteReleaseRevisions {
				logger.Tracef(ctx, "package %s, version %s, release revision %d, skipping because deleteReleaseRevisions=false", packageId, version, revision.Revision)
				break
			}
			candidates = append(candidates, &revision)
		}

		if len(candidates) > 0 {
			for _, revision := range candidates {
				// check for references and update in a single atomic operation
				result, err := tx.Exec(`
					UPDATE published_version
					SET deleted_at = ?, deleted_by = ?
					WHERE package_id = ? AND version = ? AND revision = ? AND deleted_at IS NULL
					AND NOT EXISTS (
						SELECT 1 FROM published_version_reference ref
						INNER JOIN published_version pv ON
								pv.package_id = ref.package_id AND
								pv.version = ref.version AND
								pv.revision = ref.revision
						WHERE ref.reference_id = ? AND ref.reference_version = ? AND ref.reference_revision = ?
						AND pv.deleted_at IS NULL
					)
				`, time.Now(), deletedBy,
					revision.PackageId, revision.Version, revision.Revision,
					revision.PackageId, revision.Version, revision.Revision)

				if err != nil {
					return fmt.Errorf("failed to mark revision %d as deleted: %w", revision.Revision, err)
				}

				if result.RowsAffected() == 0 {
					logger.Tracef(ctx, "package %s, version %s, revision %d has references or was already deleted, skipping", packageId, version, revision.Revision)
					break
				}

				err = p.trackDeletion(tx, packageId, version, revision.Revision, revision.Status, string(view.ATETDeleteRevision), deletedBy)
				if err != nil {
					return fmt.Errorf("failed to track revision deletion: %w", err)
				}

				err = p.clearAdHocComparisons(ctx, tx, packageId, version, revision.Revision)
				if err != nil {
					return fmt.Errorf("failed to clear ad-hoc comparisons for revision %d: %w", revision.Revision, err)
				}

				if revision.Status == string(view.Release) {
					deletedReleaseCount++
				}
				deletedCount++
			}

			if deletedCount == len(revisions) {
				logger.Tracef(ctx, "All revisions for version %s were deleted, cleaning up related data", version)
				err = p.clearDefaultReleaseVersion(tx, packageId, version)
				if err != nil {
					return fmt.Errorf("failed to clear default release version: %w", err)
				}

				err = p.clearPreviousVersion(tx, packageId, version)
				if err != nil {
					return fmt.Errorf("failed to clear %s version as a previous version: %w", version, err)
				}

				lastRevision := revisions[lastRevisionIndex]
				err = p.trackDeletion(tx, packageId, version, lastRevision.Revision, lastRevision.Status, string(view.ATETDeleteVersion), deletedBy)
				if err != nil {
					return fmt.Errorf("failed to track version deletion: %w", err)
				}
			}
		}
		return nil
	})

	if err != nil {
		return 0, 0, err
	}

	logger.Tracef(ctx, "Successfully processed version %s, deleted %d revisions", version, deletedCount)
	return deletedCount, deletedReleaseCount, nil
}

func (p publishedRepositoryImpl) trackDeletion(tx *pg.Tx, packageId string, version string, revision int, status string, eventType string, deletedBy string) error {
	dataMap := map[string]interface{}{}
	dataMap["version"] = version
	dataMap["revision"] = revision
	dataMap["status"] = status
	ent := entity.ActivityTrackingEntity{
		Id:        uuid.New().String(),
		Type:      eventType,
		Data:      dataMap,
		PackageId: packageId,
		Date:      time.Now(),
		UserId:    deletedBy,
	}
	_, err := tx.Model(&ent).Insert()
	if err != nil {
		return fmt.Errorf("failed to track deletion: %w", err)
	}
	return nil
}

func (p publishedRepositoryImpl) clearAdHocComparisons(ctx context.Context, tx *pg.Tx, packageId string, version string, revision int) error {
	logger.Tracef(ctx, "Clearing ad-hoc comparisons for %s/%s@%d", packageId, version, revision)

	var deletedCount int
	page, limit := 0, 100

	for {
		var candidateIds []string
		_, err := tx.Query(&candidateIds, `
			WITH candidate_comparisons AS (
				SELECT
					vc.comparison_id,
					vc.package_id,
					vc.version,
					vc.revision,
					vc.previous_package_id,
					vc.previous_version,
					vc.previous_revision,
					pv.previous_version AS actual_previous_version,
					COALESCE(pv.previous_version_package_id, pv.package_id) AS actual_previous_package_id
				FROM version_comparison vc
				LEFT JOIN published_version pv ON
					pv.package_id = vc.package_id AND
					pv.version = vc.version AND
					pv.revision = vc.revision
				WHERE
					(vc.package_id = ? AND vc.version = ? AND vc.revision = ?) OR
					(vc.previous_package_id = ? AND vc.previous_version = ? AND vc.previous_revision = ?)
				ORDER BY vc.comparison_id
				LIMIT ?
				OFFSET ?
			)
			SELECT comparison_id FROM candidate_comparisons cc
			WHERE
				cc.actual_previous_version IS NULL OR
				(cc.previous_version != cc.actual_previous_version OR
				cc.previous_package_id != cc.actual_previous_package_id)
		`, packageId, version, revision, packageId, version, revision, limit, page*limit)
		if err != nil {
			if err == pg.ErrNoRows {
				break
			}
			return fmt.Errorf("failed to get ad-hoc comparison candidates: %w", err)
		}

		if len(candidateIds) == 0 {
			break
		}

		for _, comparisonId := range candidateIds {
			// check for references and delete in a single atomic operation
			result, err := tx.Exec(`
				DELETE FROM version_comparison
				WHERE comparison_id = ?
				AND NOT EXISTS (
					SELECT 1
					FROM version_comparison
					WHERE ? = ANY(refs)
				)
			`, comparisonId, comparisonId)
			if err != nil {
				return fmt.Errorf("failed to check and delete ad-hoc comparison %s: %w", comparisonId, err)
			}

			if result.RowsAffected() > 0 {
				logger.Tracef(ctx, "Deleted ad-hoc comparison %s", comparisonId)
				deletedCount++
			} else {
				logger.Tracef(ctx, "Skipped ad-hoc comparison %s (referenced or already deleted)", comparisonId)
			}
		}

		if len(candidateIds) < limit {
			break
		}
		page++
	}

	if deletedCount > 0 {
		logger.Tracef(ctx, "Deleted %d ad-hoc comparisons for %s/%s@%d",
			deletedCount, packageId, version, revision)
	}

	return nil
}

func (p publishedRepositoryImpl) GetVersionComparisonsCleanupCandidates(ctx context.Context, limit int, offset int) ([]entity.VersionComparisonCleanupCandidateEntity, error) {
	var candidates []entity.VersionComparisonCleanupCandidateEntity

	_, err := p.cp.GetConnection().QueryContext(ctx, &candidates, `
			SELECT
				vc.comparison_id,
				vc.package_id,
				vc.version,
				vc.revision,
				vc.previous_package_id,
				vc.previous_version,
				vc.previous_revision,
				vc.last_active,
				pv.package_id IS NULL AS revision_not_published,
				pv.previous_version AS actual_previous_version,
				COALESCE(pv.previous_version_package_id, pv.package_id) AS actual_previous_package_id,
				(SELECT MAX(revision)
					FROM published_version
					WHERE package_id = vc.previous_package_id
					AND version = vc.previous_version) AS previous_max_revision
			FROM version_comparison vc
			LEFT JOIN published_version pv ON
				pv.package_id = vc.package_id AND
				pv.version = vc.version AND
				pv.revision = vc.revision
			ORDER BY vc.last_active ASC
			LIMIT ?
			OFFSET ?
	`, limit, offset)
	if err != nil {
		if err == pg.ErrNoRows {
			return []entity.VersionComparisonCleanupCandidateEntity{}, nil
		}
		return nil, fmt.Errorf("failed to get cleanup candidates: %w", err)
	}

	return candidates, nil
}

func (p publishedRepositoryImpl) DeleteVersionComparison(ctx context.Context, comparisonId string) (bool, error) {
	var deleted bool

	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		result, err := tx.ExecContext(ctx, `
			DELETE FROM version_comparison
			WHERE comparison_id = ?
			AND NOT EXISTS (
				SELECT 1
				FROM version_comparison
				WHERE ? = ANY(refs)
			)
		`, comparisonId, comparisonId)
		if err != nil {
			return fmt.Errorf("failed to check and delete comparison %s: %w", comparisonId, err)
		}

		if result.RowsAffected() > 0 {
			logger.Tracef(ctx, "Deleted comparison %s", comparisonId)
			deleted = true
		} else {
			logger.Tracef(ctx, "Skipped comparison %s (referenced or already deleted)", comparisonId)
			deleted = false
		}

		return nil
	})
	if err != nil {
		return false, err
	}

	return deleted, nil
}

func (p publishedRepositoryImpl) DeleteSoftDeletedPackagesBeforeDate(ctx context.Context, runId string, beforeDate time.Time, batchSize int) (int, error) {
	deletedItemsStats := entity.NewDeletedItemsStats()

	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		getPackageIdsQuery := `
			SELECT id FROM package_group
			WHERE deleted_at < ?
			ORDER BY deleted_at ASC
			LIMIT ?`

		var packageIds []string
		_, err := tx.QueryContext(ctx, &packageIds, getPackageIdsQuery, beforeDate, batchSize)
		if err != nil {
			return fmt.Errorf("failed to get package IDs: %w", err)
		}

		if len(packageIds) == 0 {
			return nil
		}
		logger.Debugf(ctx, "Found %d packages to delete in current batch", len(packageIds))

		err = p.countRelatedDataForPackagesTx(ctx, tx, packageIds, deletedItemsStats)
		if err != nil {
			return fmt.Errorf("failed to count package related data: %w", err)
		}

		logger.Trace(ctx, "Deleting related API keys for packages")
		deleteApiKeysQuery := `
			DELETE FROM apihub_api_keys
			WHERE package_id IN (?)`
		_, err = tx.ExecContext(ctx, deleteApiKeysQuery, pg.In(packageIds))
		if err != nil {
			return fmt.Errorf("failed to delete related API keys: %w", err)
		}

		logger.Trace(ctx, "Deleting package transitions for packages")
		deletePackageTransitionsQuery := `
			DELETE FROM package_transition
			WHERE new_package_id IN (?)`
		_, err = tx.ExecContext(ctx, deletePackageTransitionsQuery, pg.In(packageIds))
		if err != nil {
			return fmt.Errorf("failed to delete related package transitions: %w", err)
		}

		logger.Tracef(ctx, "Deleting packages: %v", packageIds)
		deletePackagesQuery := `
			DELETE FROM package_group
			WHERE id IN (?)`
		_, err = tx.ExecContext(ctx, deletePackagesQuery, pg.In(packageIds))
		if err != nil {
			return fmt.Errorf("failed to delete packages: %w", err)
		}

		deletedItemsStats.Packages = packageIds
		deletedItemsStats.CalculateTotal()

		var cleanupRun entity.SoftDeletedDataCleanupEntity
		err = tx.Model(&cleanupRun).
			Where("run_id = ?", runId).
			Select()
		if err != nil {
			return fmt.Errorf("failed to get current state of cleanup run: %w", err)
		}
		if cleanupRun.DeletedItems == nil {
			cleanupRun.DeletedItems = deletedItemsStats
		} else {
			cleanupRun.DeletedItems.Add(deletedItemsStats)
		}
		_, err = tx.Model(&cleanupRun).
			Column("deleted_items").
			WherePK().
			Update()
		if err != nil {
			return fmt.Errorf("failed to update cleanup run state: %w", err)
		}
		logger.Debugf(ctx, "Deleted %d packages with %d total cascade records: %v",
			len(deletedItemsStats.Packages), deletedItemsStats.TotalRecords-len(deletedItemsStats.Packages), deletedItemsStats.Packages)

		return nil
	})

	return deletedItemsStats.TotalRecords, err
}

func (p publishedRepositoryImpl) DeleteSoftDeletedPackageRevisionsBeforeDate(ctx context.Context, runId string, beforeDate time.Time, batchSize int) (int, error) {
	deletedItemsStats := entity.NewDeletedItemsStats()

	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		geRevisionKeysQuery := `
			SELECT package_id, version, revision
			FROM published_version
			WHERE deleted_at < ?
			ORDER BY deleted_at ASC
			LIMIT ?`

		var revisionKeys []entity.PublishedVersionKeyEntity
		_, err := tx.QueryContext(ctx, &revisionKeys, geRevisionKeysQuery, beforeDate, batchSize)
		if err != nil {
			return fmt.Errorf("failed to get revision keys: %w", err)
		}

		if len(revisionKeys) == 0 {
			return nil
		}
		logger.Debugf(ctx, "Found %d package revisions to delete in current batch", len(revisionKeys))

		valuesClause, args := buildRevisionKeysValuesClause(revisionKeys)

		err = p.countRelatedDataForPackageRevisionsTx(ctx, tx, valuesClause, args, deletedItemsStats)
		if err != nil {
			return fmt.Errorf("failed to count related data: %w", err)
		}

		logger.Tracef(ctx, "Deleting package revisions: %v", revisionKeys)
		deleteQuery := `DELETE FROM published_version WHERE (package_id, version, revision) IN (` + valuesClause + `)`
		_, err = tx.ExecContext(ctx, deleteQuery, args...)
		if err != nil {
			return fmt.Errorf("failed to delete package revisions: %w", err)
		}

		deletedItemsStats.PackageRevisions = revisionKeys
		deletedItemsStats.CalculateTotal()

		var cleanupRun entity.SoftDeletedDataCleanupEntity
		err = tx.Model(&cleanupRun).
			Where("run_id = ?", runId).
			Select()
		if err != nil {
			return fmt.Errorf("failed to get current state of cleanup run: %w", err)
		}
		if cleanupRun.DeletedItems == nil {
			cleanupRun.DeletedItems = deletedItemsStats
		} else {
			cleanupRun.DeletedItems.Add(deletedItemsStats)
		}
		_, err = tx.Model(&cleanupRun).
			Column("deleted_items").
			WherePK().
			Update()
		if err != nil {
			return fmt.Errorf("failed to update cleanup run state: %w", err)
		}

		logger.Debugf(ctx, "Deleted %d package revisions with %d total cascade records: %v",
			len(deletedItemsStats.PackageRevisions), deletedItemsStats.TotalRecords-len(deletedItemsStats.PackageRevisions), deletedItemsStats.PackageRevisions)

		return nil
	})

	return deletedItemsStats.TotalRecords, err
}

func (p publishedRepositoryImpl) countRelatedDataForPackagesTx(ctx context.Context, tx *pg.Tx, packageIds []string, stats *entity.DeletedItemsStats) error {
	err := tx.ModelContext(ctx, &stats.PackageRevisions).
		Where("package_id IN (?)", pg.In(packageIds)).
		Select()
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.ActivityTracking),
		`SELECT COUNT(*) FROM activity_tracking WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	err = tx.ModelContext(ctx, &stats.ApiKeys).
		Where("package_id IN (?)", pg.In(packageIds)).
		Select()
	if err != nil {
		return err
	}

	var buildIds []string
	_, err = tx.QueryContext(ctx, &buildIds,
		`SELECT build_id FROM build WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}
	stats.Builds = len(buildIds)
	if stats.Builds == 0 {
		stats.BuildDepends = 0
		stats.BuildResults = 0
		stats.BuildSources = 0
		stats.BuilderNotifications = 0
	} else {
		_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.BuildDepends),
			`SELECT COUNT(*) FROM build_depends WHERE build_id IN (?) or depend_id IN (?)`, pg.In(buildIds), pg.In(buildIds))
		if err != nil {
			return err
		}
		_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.BuildResults),
			`SELECT COUNT(*) FROM build_result WHERE build_id IN (?)`, pg.In(buildIds))
		if err != nil {
			return err
		}
		_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.BuildSources),
			`SELECT COUNT(*) FROM build_src WHERE build_id IN (?)`, pg.In(buildIds))
		if err != nil {
			return err
		}
		_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.BuilderNotifications),
			`SELECT COUNT(*) FROM builder_notifications WHERE build_id IN (?)`, pg.In(buildIds))
		if err != nil {
			return err
		}
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.FavoritePackages),
		`SELECT COUNT(*) FROM favorite_packages WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.Operations),
		`SELECT COUNT(*) FROM operation WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.OperationGroups),
		`SELECT COUNT(*) FROM operation_group WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.GroupedOperations),
		`SELECT COUNT(*) FROM grouped_operation WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.OperationOpenCounts),
		`SELECT COUNT(*) FROM operation_open_count WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.PackageExportConfigs),
		`SELECT COUNT(*) FROM package_export_config WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	err = tx.ModelContext(ctx, &stats.PackageMembersRoles).
		Where("package_id IN (?)", pg.In(packageIds)).
		Select()
	if err != nil {
		return err
	}

	err = tx.ModelContext(ctx, &stats.PackageServices).
		Where("package_id IN (?)", pg.In(packageIds)).
		Select()
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.PublishedData),
		`SELECT COUNT(*) FROM published_data WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.PublishedDocumentOpenCounts),
		`SELECT COUNT(*) FROM published_document_open_count WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.PublishedSources),
		`SELECT COUNT(*) FROM published_sources WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.PublishedVersionOpenCounts),
		`SELECT COUNT(*) FROM published_version_open_count WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.PublishedVersionReferences),
		`SELECT COUNT(*) FROM published_version_reference WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.PublishedVersionRevisionContent),
		`SELECT COUNT(*) FROM published_version_revision_content WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.PublishedVersionValidation),
		`SELECT COUNT(*) FROM published_version_validation WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.SharedUrlInfo),
		`SELECT COUNT(*) FROM shared_url_info WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.TransformedContentData),
		`SELECT COUNT(*) FROM transformed_content_data WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.PackageTransitions),
		`SELECT COUNT(*) FROM package_transition WHERE new_package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.VersionInternalDocument),
		`SELECT COUNT(*) FROM version_internal_document WHERE package_id IN (?)`, pg.In(packageIds))
	if err != nil {
		return err
	}

	return nil
}

func buildRevisionKeysValuesClause(revisionKeys []entity.PublishedVersionKeyEntity) (string, []interface{}) {
	valuesClause := "VALUES "
	args := make([]interface{}, 0, len(revisionKeys)*3)
	for i, key := range revisionKeys {
		if i > 0 {
			valuesClause += ", "
		}
		valuesClause += "(?, ?, ?)"
		args = append(args, key.PackageId, key.Version, key.Revision)
	}
	return valuesClause, args
}

func (p publishedRepositoryImpl) countRelatedDataForPackageRevisionsTx(ctx context.Context, tx *pg.Tx, valuesClause string, args []interface{}, stats *entity.DeletedItemsStats) error {
	if valuesClause == "" {
		return nil
	}

	_, err := tx.QueryOneContext(ctx, pg.Scan(&stats.PublishedVersionRevisionContent),
		`SELECT COUNT(*) FROM published_version_revision_content WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.OperationGroups),
		`SELECT COUNT(*) FROM operation_group WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.PublishedVersionReferences),
		`SELECT COUNT(*) FROM published_version_reference WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.PublishedVersionValidation),
		`SELECT COUNT(*) FROM published_version_validation WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.PublishedSources),
		`SELECT COUNT(*) FROM published_sources WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.Operations),
		`SELECT COUNT(*) FROM operation WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.TransformedContentData),
		`SELECT COUNT(*) FROM transformed_content_data WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.GroupedOperations),
		`SELECT COUNT(*) FROM grouped_operation WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
	if err != nil {
		return err
	}

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.VersionInternalDocument),
		`SELECT COUNT(*) FROM version_internal_document WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
	if err != nil {
		return err
	}

	return nil
}

func (p publishedRepositoryImpl) GetVersionInternalDocuments(packageId string, version string, revision int) ([]entity.VersionInternalDocumentEntity, error) {
	var docs []entity.VersionInternalDocumentEntity
	err := p.cp.GetConnection().Model(&docs).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return []entity.VersionInternalDocumentEntity{}, nil
		}
		return nil, err
	}
	return docs, nil
}

func (p publishedRepositoryImpl) GetVersionInternalDocumentData(hash string) (*entity.EnrichedVersionInternalDocumentDataEntity, error) {
	result := new(entity.EnrichedVersionInternalDocumentDataEntity)

	err := p.cp.GetConnection().Model((*entity.VersionInternalDocumentDataEntity)(nil)).
		TableExpr("version_internal_document_data").
		ColumnExpr("version_internal_document_data.hash").
		ColumnExpr("version_internal_document_data.data").
		ColumnExpr("version_internal_document.filename").
		Join("INNER JOIN version_internal_document ON version_internal_document.hash = version_internal_document_data.hash").
		Where("version_internal_document_data.hash = ?", hash).
		Limit(1).
		Select(result)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) versionInternalDocumentDataExists(tx *pg.Tx, hash string) (bool, error) {
	err := tx.Model(&entity.VersionInternalDocumentDataEntity{}).
		Where("hash = ?", hash).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (p publishedRepositoryImpl) GetComparisonInternalDocumentsByComparisons(comparisons []entity.VersionComparisonEntity) ([]entity.ComparisonInternalDocumentEntity, error) {
	if len(comparisons) == 0 {
		return []entity.ComparisonInternalDocumentEntity{}, nil
	}

	var docs []entity.ComparisonInternalDocumentEntity
	query := p.cp.GetConnection().Model(&docs)

	for i, comparison := range comparisons {
		if i == 0 {
			query = query.WhereGroup(func(q *pg.Query) (*pg.Query, error) {
				return q.Where("package_id = ?", comparison.PackageId).
					Where("version = ?", comparison.Version).
					Where("revision = ?", comparison.Revision).
					Where("previous_package_id = ?", comparison.PreviousPackageId).
					Where("previous_version = ?", comparison.PreviousVersion).
					Where("previous_revision = ?", comparison.PreviousRevision), nil
			})
		} else {
			query = query.WhereOrGroup(func(q *pg.Query) (*pg.Query, error) {
				return q.Where("package_id = ?", comparison.PackageId).
					Where("version = ?", comparison.Version).
					Where("revision = ?", comparison.Revision).
					Where("previous_package_id = ?", comparison.PreviousPackageId).
					Where("previous_version = ?", comparison.PreviousVersion).
					Where("previous_revision = ?", comparison.PreviousRevision), nil
			})
		}
	}

	err := query.Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return []entity.ComparisonInternalDocumentEntity{}, nil
		}
		return nil, err
	}
	return docs, nil
}

func (p publishedRepositoryImpl) GetComparisonInternalDocumentData(hash string) (*entity.EnrichedComparisonInternalDocumentDataEntity, error) {
	result := new(entity.EnrichedComparisonInternalDocumentDataEntity)
	err := p.cp.GetConnection().Model((*entity.ComparisonInternalDocumentEntity)(nil)).
		TableExpr("comparison_internal_document_data").
		ColumnExpr("comparison_internal_document_data.hash").
		ColumnExpr("comparison_internal_document_data.data").
		ColumnExpr("comparison_internal_document.filename").
		Join("INNER JOIN comparison_internal_document ON comparison_internal_document.hash = comparison_internal_document_data.hash").
		Where("comparison_internal_document_data.hash = ?", hash).
		Limit(1).
		Select(result)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) comparisonInternalDocumentDataExists(tx *pg.Tx, hash string) (bool, error) {
	err := tx.Model(&entity.ComparisonInternalDocumentDataEntity{}).
		Where("hash = ?", hash).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
