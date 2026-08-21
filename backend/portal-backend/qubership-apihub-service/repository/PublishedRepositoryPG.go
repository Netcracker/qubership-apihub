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

func (p publishedRepositoryImpl) MarkVersionDeleted(ctx context.Context, packageId string, versionName string, userId string) (int, error) {

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

func (p publishedRepositoryImpl) PatchVersion(ctx context.Context, packageId string, versionName string, status *string, versionLabels *[]string) (*entity.PublishedVersionEntity, error) {
	getPackage, errGetPackage := p.GetPackage(ctx, packageId)
	if errGetPackage != nil {
		return nil, errGetPackage
	}
	if getPackage == nil {
		return nil, nil
	}

	ent := new(entity.PublishedVersionEntity)
	found := false

	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		err := tx.Model(ent).
			Where("package_id = ?", packageId).
			Where("version = ?", versionName).
			Where("deleted_at is ?", nil).
			Order("revision DESC").
			First()
		if err != nil {
			if errors.Is(err, pg.ErrNoRows) {
				return nil
			}
			return err
		}
		found = true

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

		if statusChanged {
			updateFtsSearchTextStatusQuery := `UPDATE fts_operation_search_text SET status = ? WHERE package_id = ? AND version = ? AND revision = ?`
			_, err = tx.Exec(updateFtsSearchTextStatusQuery,
				ent.Status, ent.PackageId, ent.Version, ent.Revision)
			if err != nil {
				return fmt.Errorf("failed to update fts_operation_search_text status: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, nil
	}

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

func (p publishedRepositoryImpl) GetVersion(ctx context.Context, packageId string, versionName string) (*entity.PublishedVersionEntity, error) {
	getPackage, errGetPackage := p.GetPackage(ctx, packageId)
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
	query := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetLatestRevision(ctx context.Context, packageId, versionName string) (int, error) {
	result := new(entity.PublishedVersionEntity)
	version, _, err := SplitVersionRevision(versionName)
	if err != nil {
		return -1, err
	}
	query := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetDeletedPackageLatestRevision(ctx context.Context, packageId, versionName string) (int, error) {
	result := new(entity.PublishedVersionEntity)
	version, _, err := SplitVersionRevision(versionName)
	if err != nil {
		return -1, err
	}
	query := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetReadonlyVersion(ctx context.Context, packageId string, versionName string, showOnlyDeleted bool) (*entity.PackageVersionRevisionEntity, error) {
	var getPackage *entity.PackageEntity
	var errGetPackage error
	notCondition := ""

	if showOnlyDeleted {
		getPackage, errGetPackage = p.GetPackageIncludingDeleted(ctx, packageId)
		notCondition = "not"
	} else {
		getPackage, errGetPackage = p.GetPackage(ctx, packageId)
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
	_, err = p.cp.GetConnection().WithContext(ctx).QueryOne(result, fmt.Sprintf(query, notCondition), packageId, version, revision, packageId, version, revision, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetRichPackageVersion(ctx context.Context, packageId string, version string) (*entity.PackageVersionRichEntity, error) {
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
	_, err = p.cp.GetConnection().WithContext(ctx).QueryOne(result, query, packageId, version, revision, revision, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetVersionRevisionsList(ctx context.Context, searchQuery entity.PackageVersionSearchQueryEntity) ([]entity.PackageVersionRevisionEntity, error) {
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
	_, err := p.cp.GetConnection().WithContext(ctx).Model(&searchQuery).Query(&ents, query)
	if err != nil {
		return nil, err
	}
	return ents, nil
}

func (p publishedRepositoryImpl) GetVersionByRevision(ctx context.Context, packageId string, versionName string, revision int) (*entity.PublishedVersionEntity, error) {
	result := new(entity.PublishedVersionEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetVersionIncludingDeleted(ctx context.Context, packageId string, versionName string) (*entity.PublishedVersionEntity, error) {
	result := new(entity.PublishedVersionEntity)
	version, revision, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}
	query := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetServiceOwner(ctx context.Context, workspaceId string, serviceName string) (string, error) {
	var packageId string
	serviceOwnerQuery := `SELECT package_id FROM package_service WHERE workspace_id = ? and service_name = ?`
	_, err := p.cp.GetConnection().WithContext(ctx).QueryOne(pg.Scan(&packageId), serviceOwnerQuery, workspaceId, serviceName)
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
	operationComparisonIdsToRebuild []string,
	versionInternalDocs []*entity.VersionInternalDocumentEntity, versionInternalDocData []*entity.VersionInternalDocumentDataEntity, comparisonInternalDocs []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocData []*entity.ComparisonInternalDocumentDataEntity,
	operationSearchTexts []*entity.OperationSearchTextEntity, maxRevision int, excludeFromSearch bool,
	ddlContractEntities []*entity.DDLContractEntity, ddlContractDataEntities []*entity.DDLContractDataEntity,
	ddlContractSearchTexts []*entity.DDLContractSearchTextEntity, ddlContractComparisonEntities []*entity.DDLContractComparisonEntity, ddlComparisonIdsToRebuild []string,
	mcpContractEntities []*entity.MCPContractEntity, mcpContractDataEntities []*entity.MCPContractDataEntity,
	mcpContractSearchTexts []*entity.MCPContractSearchTextEntity) error {
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
		ColumnExpr("operation_data.data_hash").
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

	currentTable = "ddl_tables"
	oldDdlEntities := make([]entity.DDLContractEntity, 0)
	err = tx.Model(&oldDdlEntities).
		Where("package_id = ?", version.PackageId).
		Where("version = ?", version.Version).
		Where("revision = ?", version.Revision).
		Select()
	if err != nil {
		return err
	}
	ddlEntitiesChanges := make(map[string]interface{}, 0)
	matchedDdlEntities := make(map[string]struct{}, 0)
	for _, s := range oldDdlEntities {
		found := false
		for _, t := range ddlContractEntities {
			if s.DdlEntityId == t.DdlEntityId {
				found = true
				matchedDdlEntities[s.DdlEntityId] = struct{}{}
				if ddlEntityChanges := s.GetChanges(*t); len(ddlEntityChanges) > 0 {
					ddlEntitiesChanges[s.DdlEntityId] = ddlEntityChanges
					changesOverview.setTableChanges(currentTable, ddlEntityChanges)
					continue
				}
			}
		}
		if !found {
			ddlEntitiesChanges[s.DdlEntityId] = "ddl entity not found in build archive"
			changesOverview.setNotFoundEntry(currentTable)
		}
	}
	for _, t := range ddlContractEntities {
		if _, matched := matchedDdlEntities[t.DdlEntityId]; !matched {
			ddlEntitiesChanges[t.DdlEntityId] = "unexpected ddl entity (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	if len(ddlEntitiesChanges) > 0 {
		changes[currentTable] = ddlEntitiesChanges
	}

	currentTable = "ddl_table_data"
	oldDdlEntityData := make([]entity.DDLContractDataEntity, 0)
	err = tx.Model(&oldDdlEntityData).
		ColumnExpr("ddl_table_data.data_hash").
		Join("inner join ddl_tables d").
		JoinOn("d.data_hash = ddl_table_data.data_hash").
		JoinOn("d.package_id = ?", version.PackageId).
		JoinOn("d.version = ?", version.Version).
		JoinOn("d.revision = ?", version.Revision).
		Select()
	if err != nil {
		return err
	}
	ddlEntityDataChanges := make(map[string]interface{}, 0)
	matchedDdlEntityData := make(map[string]struct{}, 0)
	for _, s := range oldDdlEntityData {
		found := false
		for _, t := range ddlContractDataEntities {
			if s.DataHash == t.DataHash {
				found = true
				matchedDdlEntityData[s.DataHash] = struct{}{}
			}
		}
		if !found {
			ddlEntityDataChanges[s.DataHash] = "ddl entity data not found in build archive"
			changesOverview.setNotFoundEntry(currentTable)
		}
	}
	for _, t := range ddlContractDataEntities {
		if _, matched := matchedDdlEntityData[t.DataHash]; !matched {
			ddlEntityDataChanges[t.DataHash] = "unexpected ddl entity data (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	if len(ddlEntityDataChanges) > 0 {
		changes[currentTable] = ddlEntityDataChanges
	}

	currentTable = "mcp_entities"
	oldMcpEntities := make([]entity.MCPContractEntity, 0)
	err = tx.Model(&oldMcpEntities).
		Where("package_id = ?", version.PackageId).
		Where("version = ?", version.Version).
		Where("revision = ?", version.Revision).
		Select()
	if err != nil {
		return err
	}
	mcpEntitiesChanges := make(map[string]interface{}, 0)
	matchedMcpEntities := make(map[string]struct{}, 0)
	for _, s := range oldMcpEntities {
		found := false
		for _, t := range mcpContractEntities {
			if s.McpEntityId == t.McpEntityId {
				found = true
				matchedMcpEntities[s.McpEntityId] = struct{}{}
				if mcpEntityChanges := s.GetChanges(*t); len(mcpEntityChanges) > 0 {
					mcpEntitiesChanges[s.McpEntityId] = mcpEntityChanges
					changesOverview.setTableChanges(currentTable, mcpEntityChanges)
					continue
				}
			}
		}
		if !found {
			mcpEntitiesChanges[s.McpEntityId] = "mcp entity not found in build archive"
			changesOverview.setNotFoundEntry(currentTable)
		}
	}
	for _, t := range mcpContractEntities {
		if _, matched := matchedMcpEntities[t.McpEntityId]; !matched {
			mcpEntitiesChanges[t.McpEntityId] = "unexpected mcp entity (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	if len(mcpEntitiesChanges) > 0 {
		changes[currentTable] = mcpEntitiesChanges
	}

	currentTable = "mcp_entity_data"
	oldMcpEntityData := make([]entity.MCPContractDataEntity, 0)
	err = tx.Model(&oldMcpEntityData).
		ColumnExpr("mcp_entity_data.data_hash").
		Join("inner join mcp_entities m").
		JoinOn("m.data_hash = mcp_entity_data.data_hash").
		JoinOn("m.package_id = ?", version.PackageId).
		JoinOn("m.version = ?", version.Version).
		JoinOn("m.revision = ?", version.Revision).
		Select()
	if err != nil {
		return err
	}
	mcpEntityDataChanges := make(map[string]interface{}, 0)
	matchedMcpEntityData := make(map[string]struct{}, 0)
	for _, s := range oldMcpEntityData {
		found := false
		for _, t := range mcpContractDataEntities {
			if s.DataHash == t.DataHash {
				found = true
				matchedMcpEntityData[s.DataHash] = struct{}{}
			}
		}
		if !found {
			mcpEntityDataChanges[s.DataHash] = "mcp entity data not found in build archive"
			changesOverview.setNotFoundEntry(currentTable)
		}
	}
	for _, t := range mcpContractDataEntities {
		if _, matched := matchedMcpEntityData[t.DataHash]; !matched {
			mcpEntityDataChanges[t.DataHash] = "unexpected mcp entity data (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	if len(mcpEntityDataChanges) > 0 {
		changes[currentTable] = mcpEntityDataChanges
	}

	if !packageInfo.NoChangelog && packageInfo.PreviousVersion != "" {
		versionComparisonsChanges, versionComparisonIds, err := p.getVersionComparisonsChanges(tx, packageInfo, versionComparisons, versionComparisonsFromCache, &changesOverview)
		if err != nil {
			return err
		}
		if len(versionComparisonsChanges) > 0 {
			changes["version_comparison"] = versionComparisonsChanges
		}
		operationComparisonsChanges, err := p.getOperationComparisonsChanges(tx, packageInfo, operationComparisons, intersectComparisonIds(versionComparisonIds, operationComparisonIdsToRebuild), &changesOverview)
		if err != nil {
			return err
		}
		if len(operationComparisonsChanges) > 0 {
			changes["operation_comparison"] = operationComparisonsChanges
		}
		ddlComparisonsChanges, err := p.getDdlComparisonsChanges(tx, packageInfo, ddlContractComparisonEntities, intersectComparisonIds(versionComparisonIds, ddlComparisonIdsToRebuild), &changesOverview)
		if err != nil {
			return err
		}
		if len(ddlComparisonsChanges) > 0 {
			changes["ddl_comparison"] = ddlComparisonsChanges
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
		comparisonInternalDocsChanges, err := p.getComparisonInternalDocumentsChanges(tx, packageInfo, comparisonInternalDocs, comparisonInternalDocData, versionComparisonsFromCache, &changesOverview)
		if err != nil {
			return err
		}
		for tableName, tableChanges := range comparisonInternalDocsChanges {
			changes[tableName] = tableChanges
		}
	}

	// fts_operation_search_text is not populated for packages excluded from search,
	// and is stored only for the latest revision — skip validation in those cases to
	// avoid false suspicious builds
	if !excludeFromSearch && version.Revision == maxRevision {
		currentTable = "fts_operation_search_text"
		oldSearchTexts := make([]entity.FtsOperationSearchTextEntity, 0)
		err = tx.Model(&oldSearchTexts).
			Where("package_id = ?", version.PackageId).
			Where("version = ?", version.Version).
			Where("revision = ?", version.Revision).
			Select()
		if err != nil {
			return err
		}
		searchTextChanges := make(map[string]interface{}, 0)
		matchedSearchTexts := make(map[string]struct{}, 0)
		for _, s := range oldSearchTexts {
			found := false
			for _, t := range operationSearchTexts {
				if s.OperationId == t.OperationId {
					found = true
					matchedSearchTexts[s.OperationId] = struct{}{}
					oldSt := entity.OperationSearchTextEntity{SearchDataHash: s.SearchDataHash}
					if stChanges := oldSt.GetChanges(entity.OperationSearchTextEntity{SearchDataHash: t.SearchDataHash}); len(stChanges) > 0 {
						searchTextChanges[s.OperationId] = stChanges
						changesOverview.setTableChanges(currentTable, stChanges)
						continue
					}
				}
			}
			if !found {
				searchTextChanges[s.OperationId] = "search text not found in build archive"
				changesOverview.setNotFoundEntry(currentTable)
			}
		}
		for _, t := range operationSearchTexts {
			if _, matched := matchedSearchTexts[t.OperationId]; !matched {
				searchTextChanges[t.OperationId] = "unexpected search text (not found in database)"
				changesOverview.setUnexpectedEntry(currentTable)
			}
		}
		if len(searchTextChanges) > 0 {
			changes[currentTable] = searchTextChanges
		}
	}

	// fts_ddl_search_text and fts_mcp_search_text share the same search-exclusion and
	// latest-revision-only constraints as fts_operation_search_text above.
	if !excludeFromSearch && version.Revision == maxRevision {
		currentTable = "fts_ddl_search_text"
		oldDdlSearchTexts := make([]entity.FtsDdlSearchTextEntity, 0)
		err = tx.Model(&oldDdlSearchTexts).
			Where("package_id = ?", version.PackageId).
			Where("version = ?", version.Version).
			Where("revision = ?", version.Revision).
			Select()
		if err != nil {
			return err
		}
		ddlSearchTextChanges := make(map[string]interface{}, 0)
		matchedDdlSearchTexts := make(map[string]struct{}, 0)
		for _, s := range oldDdlSearchTexts {
			found := false
			for _, t := range ddlContractSearchTexts {
				if s.DdlEntityId == t.DdlEntityId {
					found = true
					matchedDdlSearchTexts[s.DdlEntityId] = struct{}{}
					oldSt := entity.DDLContractSearchTextEntity{SearchDataHash: s.SearchDataHash}
					if stChanges := oldSt.GetChanges(entity.DDLContractSearchTextEntity{SearchDataHash: t.SearchDataHash}); len(stChanges) > 0 {
						ddlSearchTextChanges[s.DdlEntityId] = stChanges
						changesOverview.setTableChanges(currentTable, stChanges)
						continue
					}
				}
			}
			if !found {
				ddlSearchTextChanges[s.DdlEntityId] = "search text not found in build archive"
				changesOverview.setNotFoundEntry(currentTable)
			}
		}
		for _, t := range ddlContractSearchTexts {
			if _, matched := matchedDdlSearchTexts[t.DdlEntityId]; !matched {
				ddlSearchTextChanges[t.DdlEntityId] = "unexpected search text (not found in database)"
				changesOverview.setUnexpectedEntry(currentTable)
			}
		}
		if len(ddlSearchTextChanges) > 0 {
			changes[currentTable] = ddlSearchTextChanges
		}

		currentTable = "fts_mcp_search_text"
		oldMcpSearchTexts := make([]entity.FtsMcpSearchTextEntity, 0)
		err = tx.Model(&oldMcpSearchTexts).
			Where("package_id = ?", version.PackageId).
			Where("version = ?", version.Version).
			Where("revision = ?", version.Revision).
			Select()
		if err != nil {
			return err
		}
		mcpSearchTextChanges := make(map[string]interface{}, 0)
		matchedMcpSearchTexts := make(map[string]struct{}, 0)
		for _, s := range oldMcpSearchTexts {
			found := false
			for _, t := range mcpContractSearchTexts {
				if s.McpEntityId == t.McpEntityId {
					found = true
					matchedMcpSearchTexts[s.McpEntityId] = struct{}{}
					oldSt := entity.MCPContractSearchTextEntity{SearchDataHash: s.SearchDataHash}
					if stChanges := oldSt.GetChanges(entity.MCPContractSearchTextEntity{SearchDataHash: t.SearchDataHash}); len(stChanges) > 0 {
						mcpSearchTextChanges[s.McpEntityId] = stChanges
						changesOverview.setTableChanges(currentTable, stChanges)
						continue
					}
				}
			}
			if !found {
				mcpSearchTextChanges[s.McpEntityId] = "search text not found in build archive"
				changesOverview.setNotFoundEntry(currentTable)
			}
		}
		for _, t := range mcpContractSearchTexts {
			if _, matched := matchedMcpSearchTexts[t.McpEntityId]; !matched {
				mcpSearchTextChanges[t.McpEntityId] = "unexpected search text (not found in database)"
				changesOverview.setUnexpectedEntry(currentTable)
			}
		}
		if len(mcpSearchTextChanges) > 0 {
			changes[currentTable] = mcpSearchTextChanges
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

// intersectComparisonIds returns the ids present in both lists, preserving the order of the first.
func intersectComparisonIds(ids []string, allowedIds []string) []string {
	allowed := make(map[string]struct{}, len(allowedIds))
	for _, id := range allowedIds {
		allowed[id] = struct{}{}
	}
	result := make([]string, 0, len(ids))
	for _, id := range ids {
		if _, ok := allowed[id]; ok {
			result = append(result, id)
		}
	}
	return result
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
			return nil, nil, fmt.Errorf("failed to calculate previous version revision: %w", err)
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
		return nil, nil, fmt.Errorf("failed to get version comparisons from db: %w", err)
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

func (p publishedRepositoryImpl) getComparisonInternalDocumentsChanges(tx *pg.Tx, packageInfo view.PackageInfoFile, comparisonInternalDocs []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocData []*entity.ComparisonInternalDocumentDataEntity, versionComparisonsFromCache []string, changesOverview *PublishedBuildChangesOverview) (map[string]interface{}, error) {
	var err error
	allChanges := make(map[string]interface{}, 0)

	var fromCacheComparisonIds map[string]struct{}
	if len(versionComparisonsFromCache) > 0 {
		fromCacheComparisonIds = make(map[string]struct{}, len(versionComparisonsFromCache))
		for _, comparisonId := range versionComparisonsFromCache {
			fromCacheComparisonIds[comparisonId] = struct{}{}
		}
	}

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
			return nil, fmt.Errorf("failed to calculate previous version revision for comparison internal docs: %w", err)
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
		return nil, fmt.Errorf("failed to get comparison internal documents from db: %w", err)
	}
	comparisonInternalDocsChanges := make(map[string]interface{}, 0)
	matchedComparisonInternalDocs := make(map[string]struct{}, 0)
	oldComparisonInternalDocHashes := make(map[string]struct{}, 0)
	for _, s := range oldComparisonInternalDocs {
		if fromCacheComparisonIds != nil {
			comparisonId := view.MakeVersionComparisonId(s.PackageId, s.Version, s.Revision, s.PreviousPackageId, s.PreviousVersion, s.PreviousRevision)
			if _, fromCache := fromCacheComparisonIds[comparisonId]; fromCache {
				// Cached comparisons (dashboard references) carry no internal documents in the
				// build archive, so their documents must not be reported as missing
				continue
			}
		}
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
			return nil, fmt.Errorf("failed to calculate previous version revision: %w", err)
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
			return nil, fmt.Errorf("failed to get operation comparisons from db: %w", err)
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

// getDdlComparisonsChanges mirrors getOperationComparisonsChanges: it diffs the freshly generated
// ddl_comparison rows against a point-in-time snapshot (migration."ddl_comparison_{migrationId}",
// created in migration/stages/Starting.go) rather than the live table, because ddl_comparison rows
// can be shared across builds via package refs and the live table may already reflect a later
// build's migrated state by the time an earlier-queued build's ref is validated.
func (p publishedRepositoryImpl) getDdlComparisonsChanges(tx *pg.Tx, packageInfo view.PackageInfoFile, ddlContractComparisonEntities []*entity.DDLContractComparisonEntity, versionComparisonIds []string, changesOverview *PublishedBuildChangesOverview) (map[string]interface{}, error) {
	var err error
	currentTable := "ddl_comparison"
	if len(versionComparisonIds) == 0 && len(ddlContractComparisonEntities) == 0 {
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
	ddlComparisonsChanges := make(map[string]interface{}, 0)
	oldDdlComparisons := make([]entity.DDLContractComparisonEntity, 0)
	matchedDdlComparisons := make(map[string]struct{}, 0)
	if len(versionComparisonIds) > 0 {
		ddlComparisonSnapshotTable := fmt.Sprintf(`migration."ddl_comparison_%s"`, packageInfo.MigrationId)
		getDdlComparisonsQuery := fmt.Sprintf(`
			select * from %s
				where comparison_id in (?)
			`, ddlComparisonSnapshotTable)
		_, err = tx.Query(&oldDdlComparisons, getDdlComparisonsQuery,
			pg.In(versionComparisonIds),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to get ddl comparisons from db: %v", err.Error())
		}
		for _, oldComp := range oldDdlComparisons {
			key := fmt.Sprintf(`ComparisonId:%s;DdlEntityId:%s;PreviousDdlEntityId:%s`, oldComp.ComparisonId, oldComp.DdlEntityId, oldComp.PreviousDdlEntityId)
			found := false
			for _, newComp := range ddlContractComparisonEntities {
				if oldComp.ComparisonId == newComp.ComparisonId &&
					oldComp.DdlEntityId == newComp.DdlEntityId &&
					oldComp.PreviousDdlEntityId == newComp.PreviousDdlEntityId {
					found = true
					matchedDdlComparisons[key] = struct{}{}
					if ddlComparisonChanges := oldComp.GetChanges(*newComp); len(ddlComparisonChanges) > 0 {
						ddlComparisonsChanges[key] = ddlComparisonChanges
						changesOverview.setTableChanges(currentTable, ddlComparisonChanges)
					}
				}
			}
			if !found {
				ddlComparisonsChanges[key] = "ddl comparison not found in build archive"
				changesOverview.setNotFoundEntry(currentTable)
			}
		}
	}
	for _, newComp := range ddlContractComparisonEntities {
		key := fmt.Sprintf(`ComparisonId:%s;DdlEntityId:%s;PreviousDdlEntityId:%s`, newComp.ComparisonId, newComp.DdlEntityId, newComp.PreviousDdlEntityId)
		if _, matched := matchedDdlComparisons[key]; !matched {
			ddlComparisonsChanges[key] = "unexpected ddl comparison (not found in database)"
			changesOverview.setUnexpectedEntry(currentTable)
		}
	}
	return ddlComparisonsChanges, nil
}

func (p publishedRepositoryImpl) CreateVersionWithData(ctx context.Context, packageInfo view.PackageInfoFile, buildId string, version *entity.PublishedVersionEntity, content []*entity.PublishedContentEntity,
	data []*entity.PublishedContentDataEntity, refs []*entity.PublishedReferenceEntity, src *entity.PublishedSrcEntity, srcArchive *entity.PublishedSrcArchiveEntity,
	operations []*entity.OperationEntity, operationsData []*entity.OperationDataEntity,
	operationComparisons []*entity.OperationComparisonEntity, builderNotifications []*entity.BuilderNotificationsEntity,
	versionComparisons []*entity.VersionComparisonEntity, serviceName string, pkg *entity.PackageEntity, versionComparisonsFromCache []string,
	operationComparisonIdsToRebuild []string, ddlComparisonIdsToRebuild []string,
	versionInternalDocEntities []*entity.VersionInternalDocumentEntity, versionInternalDocDataEntities []*entity.VersionInternalDocumentDataEntity,
	comparisonInternalDocEntities []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocDataEntities []*entity.ComparisonInternalDocumentDataEntity,
	operationSearchTexts []*entity.OperationSearchTextEntity,
	ddlContractEntities []*entity.DDLContractEntity, ddlContractDataEntities []*entity.DDLContractDataEntity,
	ddlContractSearchTexts []*entity.DDLContractSearchTextEntity, ddlContractComparisonEntities []*entity.DDLContractComparisonEntity,
	mcpContractEntities []*entity.MCPContractEntity, mcpContractDataEntities []*entity.MCPContractDataEntity,
	mcpContractSearchTexts []*entity.MCPContractSearchTextEntity) error {
	if len(content) == 0 && len(refs) == 0 {
		return nil
	}

	var err error
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

		var maxRevision int
		if packageInfo.MigrationBuild {
			_, err = tx.Query(pg.Scan(&maxRevision),
				`SELECT COALESCE(MAX(revision), 0) FROM published_version WHERE package_id = ? AND version = ? AND deleted_at IS NULL`,
				version.PackageId, version.Version)
			if err != nil {
				return fmt.Errorf("failed to get max revision: %w", err)
			}

			start = time.Now()
			err := p.validateMigrationResult(tx, packageInfo, buildId, version, content, data, refs, src, operations, operationsData, versionComparisons, operationComparisons, versionComparisonsFromCache, operationComparisonIdsToRebuild, versionInternalDocEntities, versionInternalDocDataEntities, comparisonInternalDocEntities, comparisonInternalDocDataEntities, operationSearchTexts, maxRevision, pkg.ExcludeFromSearch,
				ddlContractEntities, ddlContractDataEntities, ddlContractSearchTexts, ddlContractComparisonEntities, ddlComparisonIdsToRebuild,
				mcpContractEntities, mcpContractDataEntities, mcpContractSearchTexts)
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
			var err error
			if packageInfo.MigrationBuild {
				// exclude "shareability" from the ON CONFLICT update so the database preserves the user-set
				// shareability value instead of overwriting it with the default "unknown"
				_, err = tx.Model(c).OnConflict(`(package_id, version, revision, file_id) DO UPDATE SET
					"checksum" = EXCLUDED."checksum",
					"index" = EXCLUDED."index",
					"slug" = EXCLUDED."slug",
					"name" = EXCLUDED."name",
					"path" = EXCLUDED."path",
					"data_type" = EXCLUDED."data_type",
					"format" = EXCLUDED."format",
					"title" = EXCLUDED."title",
					"metadata" = EXCLUDED."metadata",
					"operation_ids" = EXCLUDED."operation_ids",
					"filename" = EXCLUDED."filename",
					"api_kind" = EXCLUDED."api_kind"`).Insert()
			} else {
				_, err = tx.Model(c).OnConflict("(package_id, version, revision, file_id) DO UPDATE").Insert()
			}
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
		newOperationsData := make([]entity.OperationDataEntity, 0)
		if len(operationsData) > 0 {
			start = time.Now()
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
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 100+int64(len(operationsData)*10), fmt.Sprintf("CreateVersionWithData: operationsData calculation (%d items)", len(operationsData)))
		}
		if len(newOperationsData) > 0 {
			start = time.Now()
			_, err := tx.Model(&newOperationsData).OnConflict("(data_hash) DO NOTHING").Insert()
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

		// Drop fts_operation_search_text rows for operations that no longer exist in this revision
		if packageInfo.MigrationBuild && !pkg.ExcludeFromSearch && version.Revision == maxRevision {
			deleteStaleFtsSearchTextQuery := `
				DELETE FROM fts_operation_search_text fts
				WHERE fts.package_id = ? AND fts.version = ? AND fts.revision = ?
					AND NOT EXISTS (
						SELECT 1 FROM operation o
						WHERE o.package_id = fts.package_id
							AND o.version = fts.version
							AND o.revision = fts.revision
							AND o.operation_id = fts.operation_id
					)`
			_, err = tx.Exec(deleteStaleFtsSearchTextQuery, version.PackageId, version.Version, version.Revision)
			if err != nil {
				return fmt.Errorf("failed to delete stale fts_operation_search_text during migration rebuild: %w", err)
			}
		}

		if len(operationSearchTexts) > 0 && !pkg.ExcludeFromSearch {
			if !packageInfo.MigrationBuild {
				start = time.Now()
				if version.Revision > 1 {
					cleanOldFtsSearchTextQuery := `delete from fts_operation_search_text where package_id = ? and version = ? and revision = ?`
					_, err = tx.Exec(cleanOldFtsSearchTextQuery,
						version.PackageId, version.Version, version.Revision-1)
					if err != nil {
						return fmt.Errorf("failed to cleanup old revision fts_operation_search_text: %w", err)
					}
				}

				for _, st := range operationSearchTexts {
					insertFtsSearchTextQuery := `
						INSERT INTO fts_operation_search_text (package_id, version, revision, operation_id, api_type, status, search_data_hash, data_vector)
						VALUES (?, ?, ?, ?, ?, ?, ?, to_tsvector(convert_from(?, 'UTF-8') || ' ' || coalesce(?, '')))
						ON CONFLICT (package_id, version, revision, operation_id) DO UPDATE
							SET search_data_hash = EXCLUDED.search_data_hash,
								data_vector = EXCLUDED.data_vector`
					_, err = tx.Exec(insertFtsSearchTextQuery,
						version.PackageId, version.Version, version.Revision, st.OperationId,
						st.ApiType, version.Status, st.SearchDataHash, st.SearchTextData, st.Title)
					if err != nil {
						return fmt.Errorf("failed to insert fts_operation_search_text for operation %s: %w", st.OperationId, err)
					}
				}
				utils.PerfLog(time.Since(start).Milliseconds(), 1000, "CreateVersionWithData: fts_operation_search_text insert")
			} else if packageInfo.MigrationBuild {
				// Store search texts in tmp table for selective recalculation at end of migration.
				// Only populate for the latest revision of the version — older revisions are skipped.
				if version.Revision == maxRevision {
					for _, st := range operationSearchTexts {
						insertTmpQuery := fmt.Sprintf(`
							INSERT INTO migration."fts_operation_search_text_tmp_%s"
								(package_id, version, revision, operation_id, api_type, status, search_data_hash, search_text_data, title)
							SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
							WHERE NOT EXISTS (
								SELECT 1 FROM fts_operation_search_text
								WHERE package_id = ? AND version = ? AND revision = ? AND operation_id = ?
									AND search_data_hash = ?
							)
							ON CONFLICT (package_id, version, revision, operation_id) DO UPDATE
								SET search_data_hash = EXCLUDED.search_data_hash,
									search_text_data = EXCLUDED.search_text_data,
									title = EXCLUDED.title`, packageInfo.MigrationId)
						_, err = tx.Exec(insertTmpQuery,
							version.PackageId, version.Version, version.Revision, st.OperationId,
							st.ApiType, version.Status, st.SearchDataHash, st.SearchTextData, st.Title,
							version.PackageId, version.Version, version.Revision, st.OperationId,
							st.SearchDataHash)
						if err != nil {
							return fmt.Errorf("failed to insert into migration.fts_operation_search_text_tmp: %w", err)
						}
					}
				}
			}
		}

		if len(versionComparisons) != 0 {
			start = time.Now()
			err = p.saveVersionChangesTx(tx, operationComparisons, versionComparisons, operationComparisonIdsToRebuild)
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
		if packageInfo.MigrationBuild {
			// In case of migration, list of version internal documents may change
			// so need to cleanup existing list before insert
			_, err := tx.Model(&entity.VersionInternalDocumentEntity{}).
				Where("package_id = ?", version.PackageId).
				Where("version = ?", version.Version).
				Where("revision = ?", version.Revision).
				Delete()
			if err != nil {
				return fmt.Errorf("failed to cleanup version internal documents for migration: %w", err)
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
		err = p.saveComparisonInternalDocumentsTx(tx, comparisonInternalDocEntities, comparisonInternalDocDataEntities, packageInfo.MigrationBuild, versionComparisons)
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

		// DDL contract
		if len(ddlContractDataEntities) > 0 {
			start = time.Now()
			for _, d := range ddlContractDataEntities {
				var count int
				_, err = tx.Query(pg.Scan(&count), `SELECT count(data_hash) FROM ddl_table_data WHERE data_hash = ? LIMIT 1`, d.DataHash)
				if err != nil {
					return err
				}
				if count == 0 {
					_, err = tx.Model(d).OnConflict("(data_hash) DO NOTHING").Insert()
					if err != nil {
						return fmt.Errorf("failed to insert ddl_table_data: %w", err)
					}
				}
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 100, "CreateVersionWithData: ddl_table_data insert")
		}
		if packageInfo.MigrationBuild {
			// In case of migration list of DDL entities may change due to new builder implementation, so need to cleanup existing list before insert
			start = time.Now()
			_, err = tx.Model(&entity.DDLContractEntity{}).
				Where("package_id = ?", version.PackageId).
				Where("version = ?", version.Version).
				Where("revision = ?", version.Revision).
				Delete()
			utils.PerfLog(time.Since(start).Milliseconds(), 50+int64(len(ddlContractEntities)*10), "CreateVersionWithData: old ddl_tables delete")
			if err != nil {
				return fmt.Errorf("failed to cleanup ddl_tables for migration: %w", err)
			}
		}
		if len(ddlContractEntities) > 0 {
			start = time.Now()
			_, err = tx.Model(&ddlContractEntities).OnConflict("(package_id, version, revision, ddl_entity_id) DO UPDATE").Insert()
			if err != nil {
				return fmt.Errorf("failed to insert ddl_tables: %w", err)
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 100, "CreateVersionWithData: ddl_tables insert")
		}

		if packageInfo.MigrationBuild && !pkg.ExcludeFromSearch && version.Revision == maxRevision {
			deleteStaleFtsDdlSearchTextQuery := `
				DELETE FROM fts_ddl_search_text fts
				WHERE fts.package_id = ? AND fts.version = ? AND fts.revision = ?
					AND NOT EXISTS (
						SELECT 1 FROM ddl_tables t
						WHERE t.package_id = fts.package_id
							AND t.version = fts.version
							AND t.revision = fts.revision
							AND t.ddl_entity_id = fts.ddl_entity_id
					)`
			_, err = tx.Exec(deleteStaleFtsDdlSearchTextQuery, version.PackageId, version.Version, version.Revision)
			if err != nil {
				return fmt.Errorf("failed to delete stale fts_ddl_search_text during migration rebuild: %w", err)
			}
		}
		if len(ddlContractSearchTexts) > 0 && !pkg.ExcludeFromSearch {
			if !packageInfo.MigrationBuild {
				start = time.Now()
				if version.Revision > 1 {
					cleanOldFtsSearchTextQuery := `delete from fts_ddl_search_text where package_id = ? and version = ? and revision = ?`
					_, err = tx.Exec(cleanOldFtsSearchTextQuery,
						version.PackageId, version.Version, version.Revision-1)
					if err != nil {
						return fmt.Errorf("failed to cleanup old revision fts_ddl_search_text: %w", err)
					}
				}
				for _, st := range ddlContractSearchTexts {
					_, err = tx.Exec(`
						INSERT INTO fts_ddl_search_text (package_id, version, revision, ddl_entity_id, status, kind, search_data_hash, data_vector)
						VALUES (?, ?, ?, ?, ?, ?, ?, to_tsvector(convert_from(?, 'UTF-8')))
						ON CONFLICT (package_id, version, revision, ddl_entity_id) DO UPDATE
							SET search_data_hash = EXCLUDED.search_data_hash,
								data_vector = EXCLUDED.data_vector`,
						version.PackageId, version.Version, version.Revision, st.DdlEntityId,
						version.Status, st.Kind, st.SearchDataHash, st.SearchTextData)
					if err != nil {
						return fmt.Errorf("failed to insert fts_ddl_search_text for %s: %w", st.DdlEntityId, err)
					}
				}
				utils.PerfLog(time.Since(start).Milliseconds(), 100, "CreateVersionWithData: fts_ddl_search_text insert")
			} else if packageInfo.MigrationBuild {
				// Store search texts in tmp table for selective recalculation at end of migration.
				// Only populate for the latest revision of the version — older revisions are skipped.
				var maxRevision int
				_, err = tx.Query(pg.Scan(&maxRevision),
					`SELECT COALESCE(MAX(revision), 0) FROM published_version WHERE package_id = ? AND version = ? AND deleted_at IS NULL`,
					version.PackageId, version.Version)
				if err != nil {
					return fmt.Errorf("failed to get max revision for fts_ddl_search_text: %w", err)
				}
				if version.Revision == maxRevision {
					for _, st := range ddlContractSearchTexts {
						insertTmpQuery := fmt.Sprintf(`
							INSERT INTO migration."fts_ddl_search_text_tmp_%s"
								(package_id, version, revision, ddl_entity_id, status, kind, search_data_hash, search_text_data)
							SELECT ?, ?, ?, ?, ?, ?, ?, ?
							WHERE NOT EXISTS (
								SELECT 1 FROM fts_ddl_search_text
								WHERE package_id = ? AND version = ? AND revision = ? AND ddl_entity_id = ?
									AND search_data_hash = ?
							)
							ON CONFLICT (package_id, version, revision, ddl_entity_id) DO UPDATE
								SET search_data_hash = EXCLUDED.search_data_hash,
									search_text_data = EXCLUDED.search_text_data`, packageInfo.MigrationId)
						_, err = tx.Exec(insertTmpQuery,
							version.PackageId, version.Version, version.Revision, st.DdlEntityId,
							version.Status, st.Kind, st.SearchDataHash, st.SearchTextData,
							version.PackageId, version.Version, version.Revision, st.DdlEntityId,
							st.SearchDataHash)
						if err != nil {
							return fmt.Errorf("failed to insert into migration.fts_ddl_search_text_tmp: %w", err)
						}
					}
				}
			}
		}
		if len(versionComparisons) != 0 {
			start = time.Now()
			err = p.saveDdlComparisonsTx(tx, ddlContractComparisonEntities, versionComparisons, ddlComparisonIdsToRebuild)
			if err != nil {
				return err
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 100, "CreateVersionWithData: ddl_comparison insert")
		}

		// MCP contract
		if len(mcpContractDataEntities) > 0 {
			start = time.Now()
			for _, d := range mcpContractDataEntities {
				var count int
				_, err = tx.Query(pg.Scan(&count), `SELECT count(data_hash) FROM mcp_entity_data WHERE data_hash = ? LIMIT 1`, d.DataHash)
				if err != nil {
					return err
				}
				if count == 0 {
					_, err = tx.Model(d).OnConflict("(data_hash) DO NOTHING").Insert()
					if err != nil {
						return fmt.Errorf("failed to insert mcp_entity_data: %w", err)
					}
				}
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 100, "CreateVersionWithData: mcp_entity_data insert")
		}
		if packageInfo.MigrationBuild {
			// In case of migration list of MCP entities may change due to new builder implementation, so need to cleanup existing list before insert
			start = time.Now()
			_, err = tx.Model(&entity.MCPContractEntity{}).
				Where("package_id = ?", version.PackageId).
				Where("version = ?", version.Version).
				Where("revision = ?", version.Revision).
				Delete()
			utils.PerfLog(time.Since(start).Milliseconds(), 50+int64(len(mcpContractEntities)*10), "CreateVersionWithData: old mcp_entities delete")
			if err != nil {
				return fmt.Errorf("failed to cleanup mcp_entities for migration: %w", err)
			}
		}
		if len(mcpContractEntities) > 0 {
			start = time.Now()
			_, err = tx.Model(&mcpContractEntities).OnConflict("(package_id, version, revision, mcp_entity_id) DO UPDATE").Insert()
			if err != nil {
				return fmt.Errorf("failed to insert mcp_entities: %w", err)
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 100, "CreateVersionWithData: mcp_entities insert")
		}

		if packageInfo.MigrationBuild && !pkg.ExcludeFromSearch && version.Revision == maxRevision {
			deleteStaleFtsMcpSearchTextQuery := `
				DELETE FROM fts_mcp_search_text fts
				WHERE fts.package_id = ? AND fts.version = ? AND fts.revision = ?
					AND NOT EXISTS (
						SELECT 1 FROM mcp_entities me
						WHERE me.package_id = fts.package_id
							AND me.version = fts.version
							AND me.revision = fts.revision
							AND me.mcp_entity_id = fts.mcp_entity_id
					)`
			_, err = tx.Exec(deleteStaleFtsMcpSearchTextQuery, version.PackageId, version.Version, version.Revision)
			if err != nil {
				return fmt.Errorf("failed to delete stale fts_mcp_search_text during migration rebuild: %w", err)
			}
		}
		if len(mcpContractSearchTexts) > 0 && !pkg.ExcludeFromSearch {
			if !packageInfo.MigrationBuild {
				start = time.Now()
				if version.Revision > 1 {
					cleanOldFtsSearchTextQuery := `delete from fts_mcp_search_text where package_id = ? and version = ? and revision = ?`
					_, err = tx.Exec(cleanOldFtsSearchTextQuery,
						version.PackageId, version.Version, version.Revision-1)
					if err != nil {
						return fmt.Errorf("failed to cleanup old revision fts_mcp_search_text: %w", err)
					}
				}
				for _, st := range mcpContractSearchTexts {
					insertFtsSearchTextQuery := `
						INSERT INTO fts_mcp_search_text (package_id, version, revision, mcp_entity_id, status, kind, search_data_hash, data_vector)
						VALUES (?, ?, ?, ?, ?, ?, ?, to_tsvector(convert_from(?, 'UTF-8') || ' '))
						ON CONFLICT (package_id, version, revision, mcp_entity_id) DO UPDATE
							SET search_data_hash = EXCLUDED.search_data_hash,
								data_vector = EXCLUDED.data_vector`
					_, err = tx.Exec(insertFtsSearchTextQuery,
						version.PackageId, version.Version, version.Revision, st.McpEntityId, version.Status, st.Kind, st.SearchDataHash, st.SearchTextData)
					if err != nil {
						return fmt.Errorf("failed to insert fts_mcp_search_text for entity %s: %w", st.McpEntityId, err)
					}
				}
				utils.PerfLog(time.Since(start).Milliseconds(), 1000, "CreateVersionWithData: fts_mcp_search_text insert")
			} else if packageInfo.MigrationBuild {
				// Store search texts in tmp table for selective recalculation at end of migration.
				// Only populate for the latest revision of the version — older revisions are skipped.
				var maxRevision int
				_, err = tx.Query(pg.Scan(&maxRevision),
					`SELECT COALESCE(MAX(revision), 0) FROM published_version WHERE package_id = ? AND version = ? AND deleted_at IS NULL`,
					version.PackageId, version.Version)
				if err != nil {
					return fmt.Errorf("failed to get max revision for fts_mcp_search_text: %w", err)
				}
				if version.Revision == maxRevision {
					for _, st := range mcpContractSearchTexts {
						insertTmpQuery := fmt.Sprintf(`
							INSERT INTO migration."fts_mcp_search_text_tmp_%s"
								(package_id, version, revision, mcp_entity_id, status, kind, search_data_hash, search_text_data)
							SELECT ?, ?, ?, ?, ?, ?, ?, ?
							WHERE NOT EXISTS (
								SELECT 1 FROM fts_mcp_search_text
								WHERE package_id = ? AND version = ? AND revision = ? AND mcp_entity_id = ?
									AND search_data_hash = ?
							)
							ON CONFLICT (package_id, version, revision, mcp_entity_id) DO UPDATE
								SET search_data_hash = EXCLUDED.search_data_hash,
									search_text_data = EXCLUDED.search_text_data`, packageInfo.MigrationId)
						_, err = tx.Exec(insertTmpQuery,
							version.PackageId, version.Version, version.Revision, st.McpEntityId,
							version.Status, st.Kind, st.SearchDataHash, st.SearchTextData,
							version.PackageId, version.Version, version.Revision, st.McpEntityId,
							st.SearchDataHash)
						if err != nil {
							return fmt.Errorf("failed to insert into migration.fts_mcp_search_text_tmp: %w", err)
						}
					}
				}
			}
		}
		//////////////

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

func (p publishedRepositoryImpl) validateChangelogMigrationResult(tx *pg.Tx, packageInfo view.PackageInfoFile, publishId string, versionComparisons []*entity.VersionComparisonEntity, operationComparisons []*entity.OperationComparisonEntity, versionComparisonsFromCache []string, operationComparisonIdsToRebuild []string, comparisonInternalDocs []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocData []*entity.ComparisonInternalDocumentDataEntity, ddlContractComparisons []*entity.DDLContractComparisonEntity, ddlComparisonIdsToRebuild []string) error {
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
	operationComparisonsChanges, err := p.getOperationComparisonsChanges(tx, packageInfo, operationComparisons, intersectComparisonIds(versionComparisonIds, operationComparisonIdsToRebuild), &changesOverview)
	if err != nil {
		return err
	}
	if len(operationComparisonsChanges) > 0 {
		changes["operation_comparison"] = operationComparisonsChanges
	}
	ddlComparisonsChanges, err := p.getDdlComparisonsChanges(tx, packageInfo, ddlContractComparisons, intersectComparisonIds(versionComparisonIds, ddlComparisonIdsToRebuild), &changesOverview)
	if err != nil {
		return err
	}
	if len(ddlComparisonsChanges) > 0 {
		changes["ddl_comparison"] = ddlComparisonsChanges
	}

	comparisonInternalDocsChanges, err := p.getComparisonInternalDocumentsChanges(tx, packageInfo, comparisonInternalDocs, comparisonInternalDocData, versionComparisonsFromCache, &changesOverview)
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

func (p publishedRepositoryImpl) SaveVersionChanges(ctx context.Context, packageInfo view.PackageInfoFile, publishId string, operationComparisons []*entity.OperationComparisonEntity, versionComparisons []*entity.VersionComparisonEntity, versionComparisonsFromCache []string, operationComparisonIdsToRebuild []string, ddlComparisonIdsToRebuild []string, comparisonInternalDocEntities []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocDataEntities []*entity.ComparisonInternalDocumentDataEntity, ddlContractComparisons []*entity.DDLContractComparisonEntity) error {
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
			err := p.validateChangelogMigrationResult(tx, packageInfo, publishId, versionComparisons, operationComparisons, versionComparisonsFromCache, operationComparisonIdsToRebuild, comparisonInternalDocEntities, comparisonInternalDocDataEntities, ddlContractComparisons, ddlComparisonIdsToRebuild)
			if err != nil {
				return err
			}
			utils.PerfLog(time.Since(start).Milliseconds(), 500, "SaveVersionChanges: validateChangelogMigrationResult")
		}
		err = p.saveVersionChangesTx(tx, operationComparisons, versionComparisons, operationComparisonIdsToRebuild)
		if err != nil {
			return err
		}

		err = p.saveDdlComparisonsTx(tx, ddlContractComparisons, versionComparisons, ddlComparisonIdsToRebuild)
		if err != nil {
			return err
		}

		err = p.saveComparisonInternalDocumentsTx(tx, comparisonInternalDocEntities, comparisonInternalDocDataEntities, packageInfo.MigrationBuild, versionComparisons)
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

// saveVersionChangesTx upserts the merged version_comparison rows and replaces the operation
// changelog. operation_types and contract_types are refreshed by separate, independently-scoped
// writes (this function's operation_types update, saveDdlComparisonsTx's contract_types update) so
// that a row saved because only one side changed does not overwrite the other side's stored value
// with an absent one. Stale operation_comparison rows are deleted only for comparisons whose
// operation side was rebuilt in this publish: a row saved because only its DDL side changed keeps
// the cached operation changelog.
func (p publishedRepositoryImpl) saveVersionChangesTx(tx *pg.Tx, operationComparisons []*entity.OperationComparisonEntity, versionComparisons []*entity.VersionComparisonEntity, operationComparisonIdsToRebuild []string) error {
	_, err := tx.Model(&versionComparisons).
		OnConflict(`(comparison_id) DO UPDATE
		SET refs =			EXCLUDED.refs,
			last_active =	EXCLUDED.last_active,
			no_content =	EXCLUDED.no_content,
			open_count =	version_comparison.open_count+1,
			builder_version = EXCLUDED.builder_version,
			metadata = EXCLUDED.metadata`).Insert()
	if err != nil {
		return fmt.Errorf("failed to insert version comparisons %+v: %w", versionComparisons, err)
	}

	rebuiltOperationComparisons := filterVersionComparisonsByComparisonId(versionComparisons, operationComparisonIdsToRebuild)
	if len(rebuiltOperationComparisons) != 0 {
		_, err = tx.Model(&rebuiltOperationComparisons).
			OnConflict(`(comparison_id) DO UPDATE SET operation_types=EXCLUDED.operation_types`).Insert()
		if err != nil {
			return fmt.Errorf("failed to update operation types for version comparisons %+v: %w", rebuiltOperationComparisons, err)
		}
	}

	for _, comparisonId := range operationComparisonIdsToRebuild {
		_, err := tx.Exec(`delete from operation_comparison where comparison_id = ?`, comparisonId)
		if err != nil {
			return fmt.Errorf("failed to delete old operation changes for comparison %s: %w", comparisonId, err)
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

// filterVersionComparisonsByComparisonId returns the entries of versionComparisons whose
// ComparisonId is in ids.
func filterVersionComparisonsByComparisonId(versionComparisons []*entity.VersionComparisonEntity, ids []string) []*entity.VersionComparisonEntity {
	if len(ids) == 0 {
		return nil
	}
	idSet := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		idSet[id] = struct{}{}
	}
	filtered := make([]*entity.VersionComparisonEntity, 0, len(ids))
	for _, comparison := range versionComparisons {
		if _, ok := idSet[comparison.ComparisonId]; ok {
			filtered = append(filtered, comparison)
		}
	}
	return filtered
}

// saveDdlComparisonsTx persists the DDL changelog for the given comparisons. DDL comparisons share the
// version_comparison rows saved by saveVersionChangesTx, so it must run after it. contract_types is
// refreshed only for comparisons whose DDL side was rebuilt in this publish, so a row saved because
// only its operation side changed keeps its stored contract_types. Stale rows are removed before
// insert only for the same rebuilt set (mirroring the operation_comparison handling), so a comparison
// saved for its operation side keeps the cached DDL changelog.
func (p publishedRepositoryImpl) saveDdlComparisonsTx(tx *pg.Tx, ddlContractComparisons []*entity.DDLContractComparisonEntity, versionComparisons []*entity.VersionComparisonEntity, ddlComparisonIdsToRebuild []string) error {
	rebuiltDdlComparisons := filterVersionComparisonsByComparisonId(versionComparisons, ddlComparisonIdsToRebuild)
	if len(rebuiltDdlComparisons) != 0 {
		_, err := tx.Model(&rebuiltDdlComparisons).
			OnConflict(`(comparison_id) DO UPDATE SET contract_types=EXCLUDED.contract_types`).Insert()
		if err != nil {
			return fmt.Errorf("failed to update contract types for version comparisons %+v: %w", rebuiltDdlComparisons, err)
		}
	}

	for _, comparisonId := range ddlComparisonIdsToRebuild {
		_, err := tx.Exec(`delete from ddl_comparison where comparison_id = ?`, comparisonId)
		if err != nil {
			return fmt.Errorf("failed to delete old ddl changes for comparison %s: %w", comparisonId, err)
		}
	}
	if len(ddlContractComparisons) != 0 {
		_, err := tx.Model(&ddlContractComparisons).OnConflict(
			"(package_id, version, revision, previous_package_id, previous_version, previous_revision, ddl_entity_id, previous_ddl_entity_id) DO UPDATE").Insert()
		if err != nil {
			return fmt.Errorf("failed to insert ddl_comparison %+v: %w", ddlContractComparisons, err)
		}
	}
	return nil
}

func (p publishedRepositoryImpl) saveComparisonInternalDocumentsTx(tx *pg.Tx, comparisonInternalDocEntities []*entity.ComparisonInternalDocumentEntity, comparisonInternalDocDataEntities []*entity.ComparisonInternalDocumentDataEntity, migrationBuild bool, versionComparisons []*entity.VersionComparisonEntity) error {
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
	if migrationBuild {
		// In case of migration, list of comparison internal documents may change
		// so need to cleanup existing list before insert per comparison.
		// Iterate over versionComparisons (not comparisonInternalDocEntities) to ensure
		// that comparisons producing zero internal documents also get their stale rows deleted.
		deletedComparisons := make(map[string]struct{})
		for _, vc := range versionComparisons {
			// Multiple internal documents may share the same comparison key, so dedup
			// to avoid redundant DELETE queries for the same comparison.
			key := fmt.Sprintf("%s|%s|%d|%s|%s|%d", vc.PackageId, vc.Version, vc.Revision, vc.PreviousPackageId, vc.PreviousVersion, vc.PreviousRevision)
			if _, already := deletedComparisons[key]; already {
				continue
			}
			deletedComparisons[key] = struct{}{}
			_, err := tx.Model(&entity.ComparisonInternalDocumentEntity{}).
				Where("package_id = ?", vc.PackageId).
				Where("version = ?", vc.Version).
				Where("revision = ?", vc.Revision).
				Where("previous_package_id = ?", vc.PreviousPackageId).
				Where("previous_version = ?", vc.PreviousVersion).
				Where("previous_revision = ?", vc.PreviousRevision).
				Delete()
			if err != nil {
				return fmt.Errorf("failed to cleanup comparison internal documents for migration: %w", err)
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

func (p publishedRepositoryImpl) GetRevisionContent(ctx context.Context, packageId string, versionName string, revision int) ([]entity.PublishedContentEntity, error) {
	var ents []entity.PublishedContentEntity
	version, _, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}
	err = p.cp.GetConnection().WithContext(ctx).Model(&ents).
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

func (p publishedRepositoryImpl) GetLatestContentBySlug(ctx context.Context, packageId string, versionName string, slug string) (*entity.PublishedContentEntity, error) {
	result := new(entity.PublishedContentEntity)
	version, revision, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}

	query := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetRevisionContentBySlug(ctx context.Context, packageId string, versionName string, slug string, revision int) (*entity.PublishedContentEntity, error) {
	result := new(entity.PublishedContentEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetContentData(ctx context.Context, packageId string, checksum string) (*entity.PublishedContentDataEntity, error) {
	result := new(entity.PublishedContentDataEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetVersionSources(ctx context.Context, packageId string, versionName string, revision int) (*entity.PublishedSrcArchiveEntity, error) {
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
	_, err := p.cp.GetConnection().WithContext(ctx).QueryOne(savedSources, query, packageId, versionName, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return savedSources, nil
}

func (p publishedRepositoryImpl) GetPublishedVersionSourceDataConfig(ctx context.Context, packageId string, versionName string, revision int) (*entity.PublishedSrcDataConfigEntity, error) {
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
	_, err := p.cp.GetConnection().WithContext(ctx).QueryOne(savedSources, query, packageId, versionName, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return savedSources, nil
}

func (p publishedRepositoryImpl) GetPublishedSources(ctx context.Context, packageId string, versionName string, revision int) (*entity.PublishedSrcEntity, error) {
	src := new(entity.PublishedSrcEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(src).
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

func (p publishedRepositoryImpl) GetVersionsByPreviousVersion(ctx context.Context, previousPackageId string, previousVersionName string) ([]entity.PublishedVersionEntity, error) {
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
	_, err = p.cp.GetConnection().WithContext(ctx).Query(&ents, query, previousPackageId, previousPackageId, previousVersion)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return ents, err
}

func (p publishedRepositoryImpl) GetReadonlyPackageVersionsWithLimit(ctx context.Context, searchQuery entity.PublishedVersionSearchQueryEntity, checkRevisions bool, showOnlyDeleted bool) ([]entity.PackageVersionRevisionEntity, error) {
	var ents []entity.PackageVersionRevisionEntity
	if searchQuery.TextFilter != "" {
		searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
	}
	if searchQuery.Statuses == nil {
		searchQuery.Statuses = make([]string, 0)
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
			and (?statuses = '{}' or pv.status = ANY(?statuses))
			and (?label = '' or ?label = any(pv.labels))
			order by pv.published_at desc
			`
		_, err := p.cp.GetConnection().WithContext(ctx).Model(&searchQuery).Query(&ents, query)
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
			and (?statuses = '{}' or pv.status = ANY(?statuses))
			and (?label = '' or ?label = any(pv.labels))
			and pv.deleted_at is %s null
			order by pv.%s %s
			limit ?limit
			offset ?offset
	`
		_, err := p.cp.GetConnection().WithContext(ctx).Model(&searchQuery).
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

func (p publishedRepositoryImpl) GetVersionRefsV3(ctx context.Context, packageId string, version string, revision int) ([]entity.PublishedReferenceEntity, error) {
	var result []entity.PublishedReferenceEntity
	err := p.cp.GetConnection().WithContext(ctx).Model(&result).
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

func (p publishedRepositoryImpl) GetRevisionContentWithLimit(ctx context.Context, packageId string, versionName string, revision int, skipRefs bool, searchQuery entity.PublishedContentSearchQueryEntity) ([]entity.PublishedContentEntity, error) {
	var ents []entity.PublishedContentEntity
	query := p.cp.GetConnection().WithContext(ctx).Model(&ents).
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

func (p publishedRepositoryImpl) GetDefaultVersion(ctx context.Context, packageId string, status string) (*entity.PublishedVersionEntity, error) {
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
	_, err := p.cp.GetConnection().WithContext(ctx).QueryOne(result, query, packageId, status)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetVersionReferencingDashboards(ctx context.Context, packageId string, version string) ([]entity.PublishedVersionKeyEntity, error) {
	result := make([]entity.PublishedVersionKeyEntity, 0)
	query := `
		SELECT DISTINCT ref.package_id, ref.version, ref.revision
		FROM published_version_reference ref
		INNER JOIN published_version dash
			ON dash.package_id = ref.package_id AND dash.version = ref.version AND dash.revision = ref.revision
		INNER JOIN package_group pkg ON pkg.id = ref.package_id
		WHERE ref.reference_id = ? AND ref.reference_version = ?
			AND dash.deleted_at IS NULL
			AND pkg.deleted_at IS NULL
		ORDER BY ref.package_id, ref.version, ref.revision`
	_, err := p.cp.GetConnection().WithContext(ctx).Query(&result, query, packageId, version)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetPackageReferencingDashboards(ctx context.Context, packageId string) ([]entity.DashboardReferenceEntity, error) {
	result := make([]entity.DashboardReferenceEntity, 0)
	query := `
		WITH RECURSIVE subtree AS (
			SELECT id FROM package_group WHERE id = ? AND deleted_at IS NULL
			UNION ALL
			SELECT c.id FROM package_group c
			INNER JOIN subtree s ON c.parent_id = s.id
			WHERE c.deleted_at IS NULL
		)
		SELECT DISTINCT ref.reference_id AS referenced_package_id, ref.package_id, ref.version, ref.revision
		FROM published_version_reference ref
		INNER JOIN published_version dash
			ON dash.package_id = ref.package_id AND dash.version = ref.version AND dash.revision = ref.revision
		INNER JOIN package_group pkg ON pkg.id = ref.package_id
		WHERE ref.reference_id IN (SELECT id FROM subtree)
			AND ref.package_id NOT IN (SELECT id FROM subtree)
			AND dash.deleted_at IS NULL
			AND pkg.deleted_at IS NULL
		ORDER BY ref.reference_id, ref.package_id, ref.version, ref.revision`
	_, err := p.cp.GetConnection().WithContext(ctx).Query(&result, query, packageId)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetFileSharedInfo(ctx context.Context, packageId string, slug string, versionName string) (*entity.SharedUrlInfoEntity, error) {
	result := new(entity.SharedUrlInfoEntity)
	version, _, err := SplitVersionRevision(versionName)
	if err != nil {
		return nil, err
	}

	err = p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetFileSharedInfoById(ctx context.Context, sharedId string) (*entity.SharedUrlInfoEntity, error) {
	result := entity.SharedUrlInfoEntity{SharedId: sharedId}
	err := p.cp.GetConnection().WithContext(ctx).Model(&result).
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

func (p publishedRepositoryImpl) CreateFileSharedInfo(ctx context.Context, newSharedUrlInfo *entity.SharedUrlInfoEntity) error {
	_, err := p.cp.GetConnection().WithContext(ctx).Model(newSharedUrlInfo).Insert()
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

func (p publishedRepositoryImpl) CreatePackage(ctx context.Context, packageEntity *entity.PackageEntity) error {
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

func (p publishedRepositoryImpl) CreatePrivatePackageForUser(ctx context.Context, packageEntity *entity.PackageEntity, userRoleEntity *entity.PackageMemberRoleEntity) error {
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

func (p publishedRepositoryImpl) GetPackage(ctx context.Context, id string) (*entity.PackageEntity, error) {
	result := new(entity.PackageEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetDeletedPackage(ctx context.Context, id string) (*entity.PackageEntity, error) {
	result := new(entity.PackageEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetPackageIncludingDeleted(ctx context.Context, id string) (*entity.PackageEntity, error) {
	result := new(entity.PackageEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetAllChildPackageIdsIncludingParent(ctx context.Context, parentId string) ([]string, error) {
	var result []string
	var ents []entity.PackageIdEntity

	query := `with recursive children as (
	select id from package_group where id=?
		UNION ALL
		select g.id from package_group g inner join children on children.id = g.parent_id)
	select id from children`
	_, err := p.cp.GetConnection().WithContext(ctx).Query(&ents, query, parentId)
	if err != nil {
		return nil, err
	}
	for _, ent := range ents {
		result = append(result, ent.Id)
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetDescendantPackages(ctx context.Context, parentId string) ([]entity.PackageEntity, error) {
	var result []entity.PackageEntity

	query := `with recursive children as (
	select id from package_group where id=?
		UNION ALL
		select g.id from package_group g inner join children on children.id = g.parent_id)
	select * from package_group
	where id in (select id from children)
		and id != ?
		and kind = ?
		and deleted_at is null`
	_, err := p.cp.GetConnection().Query(&result, query, parentId, parentId, entity.KIND_PACKAGE)
	if err != nil {
		return nil, err
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

func (p publishedRepositoryImpl) GetParentsForPackages(ctx context.Context, ids []string, includeDeleted bool) (map[string][]entity.PackageEntity, error) {
	result := make(map[string][]entity.PackageEntity, len(ids))
	if len(ids) == 0 {
		return result, nil
	}

	parentIdSet := make(map[string]struct{})
	for _, id := range ids {
		for _, parentId := range utils.GetParentPackageIds(id) {
			parentIdSet[parentId] = struct{}{}
		}
	}
	if len(parentIdSet) == 0 {
		return result, nil
	}
	parentIds := make([]string, 0, len(parentIdSet))
	for parentId := range parentIdSet {
		parentIds = append(parentIds, parentId)
	}

	var parents []entity.PackageEntity
	query := p.cp.GetConnection().WithContext(ctx).Model(&parents).Where("id in (?)", pg.In(parentIds))
	if !includeDeleted {
		query.Where("deleted_at is ?", nil)
	}
	if err := query.Select(); err != nil {
		return nil, err
	}

	parentsById := make(map[string]entity.PackageEntity, len(parents))
	for _, parent := range parents {
		parentsById[parent.Id] = parent
	}
	for _, id := range ids {
		ordered := make([]entity.PackageEntity, 0)
		for _, parentId := range utils.GetParentPackageIds(id) {
			if parent, exists := parentsById[parentId]; exists {
				ordered = append(ordered, parent)
			}
		}
		result[id] = ordered
	}
	return result, nil
}

func (p publishedRepositoryImpl) GetParentsForPackage(ctx context.Context, id string, includeDeleted bool) ([]entity.PackageEntity, error) {
	var parentIds []string
	var result []entity.PackageEntity

	parentIds = utils.GetParentPackageIds(id)
	if len(parentIds) == 0 {
		return result, nil
	}

	query := p.cp.GetConnection().WithContext(ctx).Model(&result)
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

func (p publishedRepositoryImpl) UpdatePackage(ctx context.Context, ent *entity.PackageEntity, excludeFromSearchChanged bool) (*entity.PackageEntity, error) {

	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := p.updatePackage(tx, ent, excludeFromSearchChanged)
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

func (p publishedRepositoryImpl) updatePackage(tx *pg.Tx, ent *entity.PackageEntity, excludeFromSearchChanged bool) (*entity.PackageEntity, error) {
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
	if excludeFromSearchChanged {
		err = p.updateFtsIndexForExcludeFromSearchChange(tx, ent.Id, ent.ExcludeFromSearch)
		if err != nil {
			return nil, err
		}
	}
	return ent, nil
}

func (p publishedRepositoryImpl) updateFtsIndexForExcludeFromSearchChange(tx *pg.Tx, packageId string, excludeFromSearch bool) error {
	if excludeFromSearch {
		_, err := tx.Exec(`DELETE FROM fts_operation_search_text WHERE package_id = ? OR package_id LIKE ? || '.%'`,
			packageId, packageId)
		if err != nil {
			return fmt.Errorf("failed to delete fts_operation_search_text on exclude_from_search change: %w", err)
		}
	}
	return nil
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

	_, err = p.updatePackage(tx, ent, false)
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

func (p publishedRepositoryImpl) DeletePackage(ctx context.Context, id string, userId string) (int, error) {
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

	_, err = p.updatePackage(tx, ent, false)
	if err != nil {
		return 0, err
	}
	err = p.deletePackageServiceOwnership(tx, ent.Id)
	if err != nil {
		return 0, err
	}

	return totalDeletedReleaseCount, err
}

// GetPackages lists packages with no read authorization at all. It is for the background jobs
// that have to walk the whole catalogue; serve authenticated callers from GetReadablePackages.
func (p publishedRepositoryImpl) GetPackages(ctx context.Context, searchReq view.PackageListReq, userId string) ([]entity.PackageEntity, error) {
	return p.selectPackages(ctx, searchReq, userId, false)
}

// GetDeletedPackages lists deleted packages with no read authorization at all.
func (p publishedRepositoryImpl) GetDeletedPackages(ctx context.Context, searchReq view.PackageListReq, userId string) ([]entity.PackageEntity, error) {
	return p.selectPackages(ctx, searchReq, userId, true)
}

func (p publishedRepositoryImpl) selectPackages(ctx context.Context, searchReq view.PackageListReq, userId string, deleted bool) ([]entity.PackageEntity, error) {
	var result []entity.PackageEntity
	var conditions []string
	if deleted {
		conditions = append(conditions, "deleted_at is not null")
	} else {
		conditions = append(conditions, "deleted_at is null")
	}
	conditions = append(conditions, packageFilters(searchReq)...)
	query := fmt.Sprintf(`
	select pkg.*
	from package_group pkg
	%s
	order by pkg.name asc, pkg.id asc
	%s`,
		utils.WhereClause(conditions), utils.PagingClause(searchReq.Limit))
	params := packagesQueryParams(searchReq, view.PackageReadScope{}, userId)
	if _, err := p.cp.GetConnection().ModelContext(ctx, &params).Query(&result, query); err != nil {
		return nil, err
	}
	return result, nil
}

// GetReadablePackages lists the packages the caller may read, each carrying the caller's effective
// permissions on it and whether the caller favourited it.
func (p publishedRepositoryImpl) GetReadablePackages(ctx context.Context, searchReq view.PackageListReq, scope view.PackageReadScope, userId string) ([]entity.ReadablePackageEntity, error) {
	result := make([]entity.ReadablePackageEntity, 0)

	query, err := readablePackagesSQL(searchReq, scope, userId)
	if err != nil {
		return nil, err
	}
	params := packagesQueryParams(searchReq, scope, userId)
	if _, err := p.cp.GetConnection().ModelContext(ctx, &params).Query(&result, query); err != nil {
		return nil, err
	}
	return result, nil
}

// readablePackagesSQL forms a page on package_group alone so that the permissions lateral, which walks each
// package's ancestors, runs for the page rows rather than for every row that passes the filters.
func readablePackagesSQL(searchReq view.PackageListReq, scope view.PackageReadScope, userId string) (string, error) {
	ctes, condition, err := convertPackageReadScopeToSQL(scope, userId, "pkg.id", "pkg")
	if err != nil {
		return "", err
	}

	livePackagesCondition := "pkg.deleted_at is null"
	conditions := append([]string{livePackagesCondition}, packageFilters(searchReq)...)
	if condition != "" {
		conditions = append(conditions, condition)
	}
	page := fmt.Sprintf(`page as (
	select pkg.id
	from package_group pkg
	%s
	order by pkg.name asc, pkg.id asc
	%s
	)`, utils.WhereClause(conditions), utils.PagingClause(searchReq.Limit))

	permissionsColumn := ""
	userPermissionsLateral := ""
	if scope.Kind == view.PackageReadScopeUser {
		permissionsColumn = `,
		perms.permissions as permissions`
		rolesAtAncestor := `
		select unnest(m.roles) as role_id
		from package_member_role m
		where m.package_id = anc.id and m.user_id = ?user_id
		union all
		select g.default_role as role_id
		from package_group g
		where g.id = anc.id`
		userPermissionsLateral = fmt.Sprintf(`cross join lateral (
		select coalesce(array_agg(distinct perm), array[]::character varying[]) as permissions
		from unnest(package_ancestor_ids(%s)) as anc(id)
		join lateral (%s
		) rl on true
		join role r on r.id = rl.role_id
		cross join lateral unnest(r.permissions) as perm
	) perms`, "pkg.id", rolesAtAncestor)
	}

	return fmt.Sprintf(`
	%s
	select pkg.*,
		exists (
			select 1 from favorite_packages fav
			where fav.user_id = ?user_id and fav.package_id = pkg.id
		) as is_favorite%s
	from page
	join package_group pkg on pkg.id = page.id
	%s
	order by pkg.name asc, pkg.id asc`,
		utils.WithClause(append(ctes, page)), permissionsColumn, userPermissionsLateral), nil
}

// packageFilters renders the conditions every package listing shares
func packageFilters(searchReq view.PackageListReq) []string {
	conditions := make([]string, 0)
	if searchReq.OnlyFavorite {
		favoritePackageCondition := `exists (
			select 1 from favorite_packages fav
			where fav.user_id = ?user_id and fav.package_id = pkg.id
		)`
		conditions = append(conditions, favoritePackageCondition)
	}
	if searchReq.OnlyShared {
		sharedPackageCondition := `exists (
			select 1 from package_member_role mem
			where mem.user_id = ?user_id and mem.package_id = pkg.id
		)`
		conditions = append(conditions, sharedPackageCondition)
	}
	if searchReq.TextFilter != "" {
		conditions = append(conditions, "(pkg.name ilike ?text_filter or pkg.id ilike ?text_filter)")
	}
	if searchReq.ParentId != "" && searchReq.ParentId != view.AllPackagesParentId {
		if searchReq.ShowAllDescendants {
			conditions = append(conditions, utils.DescendantsCondition("pkg.id", "?parent_id"))
		} else {
			conditions = append(conditions, "pkg.parent_id = ?parent_id")
		}
	}
	if len(searchReq.Kind) > 0 {
		conditions = append(conditions, "pkg.kind = any(?kinds::text[])")
	}
	if searchReq.ServiceName != "" {
		conditions = append(conditions, "pkg.service_name = ?service_name")
	}
	if len(searchReq.Ids) > 0 {
		conditions = append(conditions, "pkg.id = any(?ids::text[])")
	}
	return conditions
}

func packagesQueryParams(searchReq view.PackageListReq, scope view.PackageReadScope, userId string) entity.PackagesQueryParams {
	params := entity.PackagesQueryParams{
		UserId:      userId,
		SubtreeRoot: scope.SubtreeRoot,
		ParentId:    searchReq.ParentId,
		ServiceName: searchReq.ServiceName,
		Kinds:       searchReq.Kind,
		Ids:         searchReq.Ids,
		Limit:       searchReq.Limit,
		Offset:      searchReq.Offset,
	}
	if searchReq.TextFilter != "" {
		params.TextFilter = "%" + utils.LikeEscaped(searchReq.TextFilter) + "%"
	}
	return params
}

func (p publishedRepositoryImpl) GetVersionValidationChanges_deprecated(ctx context.Context, packageId string, versionName string, revision int) (*entity.PublishedVersionValidationEntity_deprecated, error) {
	result := new(entity.PublishedVersionValidationEntity_deprecated)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetVersionValidationProblems_deprecated(ctx context.Context, packageId string, versionName string, revision int) (*entity.PublishedVersionValidationEntity_deprecated, error) {
	result := new(entity.PublishedVersionValidationEntity_deprecated)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) SearchForVersions(ctx context.Context, searchQuery *entity.PackageSearchQuery) ([]entity.PackageSearchResult, error) {
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
		and (
			?api_type = ''
			or exists (
				select 1
				from operation o
				where o.package_id = pv.package_id
				and o.version = pv.version
				and o.revision = pv.revision
				and o.type = ?api_type
			)
		)
		order by rank desc, created_at desc, version
		limit ?limit
		offset ?offset;
	`
	_, err := p.cp.GetConnection().WithContext(ctx).Model(searchQuery).Query(&result, versionsSearchQuery)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}

func (p publishedRepositoryImpl) SearchForDocuments(ctx context.Context, searchQuery *entity.DocumentSearchQuery) ([]entity.DocumentSearchResult, error) {
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
		and (
			?api_type = ''
			or exists (
				select 1
				from operation o
				where o.package_id = c.package_id
				and o.version = c.version
				and o.revision = c.revision
				and o.type = ?api_type
				and o.operation_id = any(c.operation_ids)
			)
		)
		order by rank desc, v.published_at desc, c.file_id, c.index asc
		limit ?limit
		offset ?offset;
	`
	_, err := p.cp.GetConnection().WithContext(ctx).Model(searchQuery).Query(&result, documentsSearchQuery)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}

func (p publishedRepositoryImpl) RecalculatePackageOperationGroups(ctx context.Context, packageId string, restGroupingPrefixRegex string, userId string) error {

	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Exec(`delete from operation_group where package_id = ? and autogenerated = true`, packageId)
		if err != nil {
			return fmt.Errorf("failed to delete autogenerated groups for package %v from operation_group: %w", packageId, err)
		}
		err = p.recalculateOperationsGroupsTx(tx, packageId, "", 0, restGroupingPrefixRegex, userId)
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

func (p publishedRepositoryImpl) RecalculateOperationGroups(ctx context.Context, packageId string, version string, revision int, restGroupingPrefixRegex string, userId string) error {

	return p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		return p.recalculateOperationsGroupsTx(tx, packageId, version, revision, restGroupingPrefixRegex, userId)
	})
}

func (p publishedRepositoryImpl) recalculateOperationsGroupsTx(tx *pg.Tx, packageId string, version string, revision int, restGroupingPrefixRegex string, userId string) error {
	if restGroupingPrefixRegex == "" {
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
		case when ? = '' then null else substring(metadata ->> 'path', ?) end group_name,
		type api_type,
		true autogenerated
		from operation
		where
		package_id = ?
		and type = 'rest'
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
			case when ? = '' then null else substring(metadata ->> 'path', ?) end group_name,
			operation_id
			from operation
			where
			package_id = ?
			and version = ?
			and revision = ?
			and type = 'rest'
		) groups
		where group_name = ?
	) filtered_groups;`

	for _, group := range operationGroups {
		_, err = tx.Exec(insertGroupedOperationsQuery,
			group.GroupId,
			restGroupingPrefixRegex, restGroupingPrefixRegex,
			group.PackageId,
			group.Version,
			group.Revision,
			group.GroupName)
		if err != nil {
			return fmt.Errorf("failed to insert autogenerated grouped operations for group %+v: %w", group, err)
		}
	}
	return nil
}

func (p publishedRepositoryImpl) GetVersionComparison(ctx context.Context, comparisonId string) (*entity.VersionComparisonEntity, error) {
	comparison := new(entity.VersionComparisonEntity)
	err := p.cp.GetConnection().WithContext(ctx).
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

func (p publishedRepositoryImpl) GetVersionRefsComparisons(ctx context.Context, comparisonId string) ([]entity.VersionComparisonEntity, error) {
	comparisons := make([]entity.VersionComparisonEntity, 0)
	err := p.cp.GetConnection().WithContext(ctx).
		Model(&comparisons).
		Where("comparison_id in (select unnest(refs) from version_comparison where comparison_id = ?)", comparisonId).
		Select()
	if err != nil {
		return nil, err
	}
	return comparisons, nil
}

func (p publishedRepositoryImpl) GetVersionRevisionContentForDocumentsTransformation(ctx context.Context, packageId string, versionName string, revision int, searchQuery entity.ContentForDocumentsTransformationSearchQueryEntity) ([]entity.PublishedContentWithDataEntity, error) {
	var ents []entity.PublishedContentWithDataEntity
	query := p.cp.GetConnection().WithContext(ctx).Model(&ents).Distinct().
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

func (p publishedRepositoryImpl) GetPublishedSourcesArchives(ctx context.Context, offset int) (*entity.PublishedSrcArchiveEntity, error) {
	result := new(entity.PublishedSrcArchiveEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).Offset(offset).Limit(1).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p publishedRepositoryImpl) DeletePublishedSourcesArchives(ctx context.Context, checksums []string) error {
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
	if err != nil {
		return errors.Wrap(err, "failed to delete rows from table published_sources_archives")
	}

	if deletedRows > 0 {
		_, err = p.cp.GetConnection().WithContext(ctx).Exec("vacuum full published_sources_archives")
		if err != nil {
			return errors.Wrap(err, "failed to run vacuum for table published_sources_archives")
		}
	}
	return nil
}

func (p publishedRepositoryImpl) SavePublishedSourcesArchive(ctx context.Context, ent *entity.PublishedSrcArchiveEntity) error {
	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(ent).OnConflict("(checksum) DO NOTHING").Insert()
		if err != nil {
			return fmt.Errorf("failed to insert published_sources_archive %+v: %w", ent, err)
		}
		return nil
	})
	return err
}

func (p publishedRepositoryImpl) UpdatePublishedSourcesArchive(ctx context.Context, packageId string, version string, revision int, newChecksum string, srcArchive *entity.PublishedSrcArchiveEntity, trackingEntity *entity.SourcesUpdateTrackingEntity) error {
	return p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(srcArchive).OnConflict("(checksum) DO NOTHING").Insert()
		if err != nil {
			return fmt.Errorf("failed to insert published_sources_archive: %w", err)
		}
		_, err = tx.Model((*entity.PublishedSrcEntity)(nil)).
			Set("archive_checksum = ?", newChecksum).
			Where("package_id = ?", packageId).
			Where("version = ?", version).
			Where("revision = ?", revision).
			Update()
		if err != nil {
			return fmt.Errorf("failed to update published_sources checksum: %w", err)
		}
		_, err = tx.Model(trackingEntity).Insert()
		if err != nil {
			return fmt.Errorf("failed to insert sources_update_tracking: %w", err)
		}
		return nil
	})
}

func (p publishedRepositoryImpl) UpdatePublishedSourcesChecksum(ctx context.Context, packageId string, version string, revision int, newChecksum string, trackingEntity *entity.SourcesUpdateTrackingEntity) error {
	return p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model((*entity.PublishedSrcEntity)(nil)).
			Set("archive_checksum = ?", newChecksum).
			Where("package_id = ?", packageId).
			Where("version = ?", version).
			Where("revision = ?", revision).
			Update()
		if err != nil {
			return fmt.Errorf("failed to update published_sources checksum: %w", err)
		}
		_, err = tx.Model(trackingEntity).Insert()
		if err != nil {
			return fmt.Errorf("failed to insert sources_update_tracking: %w", err)
		}
		return nil
	})
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

func (p publishedRepositoryImpl) GetPublishedVersionsHistory(ctx context.Context, filter view.PublishedVersionHistoryFilter) ([]entity.PackageVersionHistoryEntity, error) {
	result := make([]entity.PackageVersionHistoryEntity, 0)

	// query := p.cp.GetConnection().WithContext(ctx).Model(&result)
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
	_, err := p.cp.GetConnection().WithContext(ctx).Query(&result, `
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

func (p publishedRepositoryImpl) StoreOperationGroupPublishProcess(ctx context.Context, ent *entity.OperationGroupPublishEntity) error {
	_, err := p.cp.GetConnection().WithContext(ctx).Model(ent).Insert()
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) UpdateOperationGroupPublishProcess(ctx context.Context, ent *entity.OperationGroupPublishEntity) error {
	_, err := p.cp.GetConnection().WithContext(ctx).Model(ent).
		WherePK().
		Set("details = ?details").
		Set("status = ?status").
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) GetOperationGroupPublishProcess(ctx context.Context, publishId string) (*entity.OperationGroupPublishEntity, error) {
	result := new(entity.OperationGroupPublishEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) StoreCSVDashboardPublishProcess(ctx context.Context, ent *entity.CSVDashboardPublishEntity) error {
	_, err := p.cp.GetConnection().WithContext(ctx).Model(ent).Insert()
	if err != nil {
		return err
	}
	return nil
}

func (p publishedRepositoryImpl) UpdateCSVDashboardPublishProcess(ctx context.Context, ent *entity.CSVDashboardPublishEntity) error {
	_, err := p.cp.GetConnection().WithContext(ctx).Model(ent).
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

func (p publishedRepositoryImpl) GetCSVDashboardPublishProcess(ctx context.Context, publishId string) (*entity.CSVDashboardPublishEntity, error) {
	result := new(entity.CSVDashboardPublishEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
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

func (p publishedRepositoryImpl) GetCSVDashboardPublishReport(ctx context.Context, publishId string) (*entity.CSVDashboardPublishEntity, error) {
	result := new(entity.CSVDashboardPublishEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
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

		logger.Trace(ctx, "Deleting FTS operation search text for packages")
		deleteFtsSearchTextQuery := `DELETE FROM fts_operation_search_text WHERE package_id IN (?)`
		_, err = tx.ExecContext(ctx, deleteFtsSearchTextQuery, pg.In(packageIds))
		if err != nil {
			return fmt.Errorf("failed to delete fts_operation_search_text: %w", err)
		}

		logger.Trace(ctx, "Deleting DDL contract data for packages")
		_, err = tx.ExecContext(ctx, `DELETE FROM fts_ddl_search_text WHERE package_id IN (?)`, pg.In(packageIds))
		if err != nil {
			return fmt.Errorf("failed to delete fts_ddl_search_text: %w", err)
		}
		_, err = tx.ExecContext(ctx, `DELETE FROM ddl_comparison WHERE package_id IN (?)`, pg.In(packageIds))
		if err != nil {
			return fmt.Errorf("failed to delete ddl_comparison: %w", err)
		}
		_, err = tx.ExecContext(ctx, `DELETE FROM ddl_tables WHERE package_id IN (?)`, pg.In(packageIds))
		if err != nil {
			return fmt.Errorf("failed to delete ddl_tables: %w", err)
		}

		logger.Trace(ctx, "Deleting MCP contract data for packages")
		_, err = tx.ExecContext(ctx, `DELETE FROM fts_mcp_search_text WHERE package_id IN (?)`, pg.In(packageIds))
		if err != nil {
			return fmt.Errorf("failed to delete fts_mcp_search_text: %w", err)
		}
		_, err = tx.ExecContext(ctx, `DELETE FROM mcp_entities WHERE package_id IN (?)`, pg.In(packageIds))
		if err != nil {
			return fmt.Errorf("failed to delete mcp_entities: %w", err)
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

		deleteFtsSearchTextQuery := `DELETE FROM fts_operation_search_text WHERE (package_id, version, revision) IN (` + valuesClause + `)`
		_, err = tx.ExecContext(ctx, deleteFtsSearchTextQuery, args...)
		if err != nil {
			return fmt.Errorf("failed to delete fts_operation_search_text: %w", err)
		}

		_, err = tx.ExecContext(ctx, `DELETE FROM fts_ddl_search_text WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
		if err != nil {
			return fmt.Errorf("failed to delete fts_ddl_search_text: %w", err)
		}
		_, err = tx.ExecContext(ctx, `DELETE FROM ddl_comparison WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
		if err != nil {
			return fmt.Errorf("failed to delete ddl_comparison: %w", err)
		}
		_, err = tx.ExecContext(ctx, `DELETE FROM ddl_tables WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
		if err != nil {
			return fmt.Errorf("failed to delete ddl_tables: %w", err)
		}
		_, err = tx.ExecContext(ctx, `DELETE FROM fts_mcp_search_text WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
		if err != nil {
			return fmt.Errorf("failed to delete fts_mcp_search_text: %w", err)
		}
		_, err = tx.ExecContext(ctx, `DELETE FROM mcp_entities WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
		if err != nil {
			return fmt.Errorf("failed to delete mcp_entities: %w", err)
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

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.FtsOperationSearchText),
		`SELECT COUNT(*) FROM fts_operation_search_text WHERE package_id IN (?)`, pg.In(packageIds))
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

	_, err = tx.QueryOneContext(ctx, pg.Scan(&stats.FtsOperationSearchText),
		`SELECT COUNT(*) FROM fts_operation_search_text WHERE (package_id, version, revision) IN (`+valuesClause+`)`, args...)
	if err != nil {
		return err
	}

	return nil
}

func (p publishedRepositoryImpl) GetVersionInternalDocuments(ctx context.Context, packageId string, version string, revision int) ([]entity.VersionInternalDocumentEntity, error) {
	var docs []entity.VersionInternalDocumentEntity
	err := p.cp.GetConnection().WithContext(ctx).Model(&docs).
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

func (p publishedRepositoryImpl) GetVersionInternalDocumentData(ctx context.Context, hash string) (*entity.VersionInternalDocumentDataEntity, error) {
	result := new(entity.VersionInternalDocumentDataEntity)

	err := p.cp.GetConnection().WithContext(ctx).Model(result).
		Where("hash = ?", hash).
		Where("EXISTS (SELECT 1 FROM version_internal_document WHERE hash = ?)", hash).
		Select()
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

func (p publishedRepositoryImpl) GetComparisonInternalDocumentsByComparisons(ctx context.Context, comparisons []entity.VersionComparisonEntity) ([]entity.ComparisonInternalDocumentEntity, error) {
	if len(comparisons) == 0 {
		return []entity.ComparisonInternalDocumentEntity{}, nil
	}

	var docs []entity.ComparisonInternalDocumentEntity
	query := p.cp.GetConnection().WithContext(ctx).Model(&docs)

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

func (p publishedRepositoryImpl) GetComparisonInternalDocumentData(ctx context.Context, hash string) (*entity.ComparisonInternalDocumentDataEntity, error) {
	result := new(entity.ComparisonInternalDocumentDataEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
		Where("hash = ?", hash).
		Where("EXISTS (SELECT 1 FROM comparison_internal_document WHERE hash = ?)", hash).
		Select()
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

func (p publishedRepositoryImpl) UpdateDocumentShareabilityBySlug(ctx context.Context, packageId string, version string, revision int, slug string, shareability string) error {
	_, err := p.cp.GetConnection().WithContext(ctx).Model((*entity.PublishedContentEntity)(nil)).
		Set("shareability_status = ?", shareability).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Where("slug = ?", slug).
		Update()
	return err
}

func (p publishedRepositoryImpl) BulkUpdateDocumentShareability(ctx context.Context, entities []*entity.PublishedContentEntity) error {
	if len(entities) == 0 {
		return nil
	}
	return p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for _, e := range entities {
			_, err := tx.Model(e).Column("shareability_status").WherePK().Update()
			if err != nil {
				return err
			}
		}
		return nil
	})
}
