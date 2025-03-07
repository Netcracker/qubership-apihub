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
	"fmt"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"

	context2 "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
	"golang.org/x/net/context"
)

type TransitionRepository interface {
	MoveAllData(fromPkg, toPkg string) (int, error)
	MovePackage(fromPkg, toPkg string, overwriteHistory bool) (int, error)
	MoveGroupingPackage(fromPkg, toPkg string) (int, error)

	TrackTransitionStarted(userCtx context2.SecurityContext, id, trType, fromPkg, toPkg string) error
	TrackTransitionProgress(id, progress int) error
	TrackTransitionFailed(id, details string) error
	TrackTransitionCompleted(id string, affectedObjects int) error

	GetTransitionStatus(id string) (*entity.TransitionActivityEntity, error)
	ListCompletedTransitions(completedSerialOffset int, limit int) ([]entity.TransitionActivityEntity, error)

	addPackageTransitionRecord(tx *pg.Tx, oldPackageId string, newPackageId string, overwriteHistory bool) error
	GetNewPackageId(oldPackageId string) (string, error)
	GetOldPackageIds(newPackageId string) ([]string, error)
	ListPackageTransitions() ([]entity.PackageTransitionEntity, error)
}

func NewTransitionRepository(cp db.ConnectionProvider) TransitionRepository {
	return &transitionRepositoryImpl{
		cp: cp,
	}
}

type transitionRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (t transitionRepositoryImpl) MoveGroupingPackage(fromPkg, toPkg string) (int, error) {
	objAffected := 0
	err := t.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {

		fromPkgEnt := new(entity.PackageEntity)
		err := tx.Model(fromPkgEnt).
			Where("id = ?", fromPkg).
			First()
		if err != nil {
			return fmt.Errorf("failed to get from package: %w", err)
		}
		if !(fromPkgEnt.Kind == entity.KIND_WORKSPACE || fromPkgEnt.Kind == entity.KIND_GROUP) {
			return fmt.Errorf("MoveGroupingPackage: not applicable for (from) api kind %s", fromPkgEnt.Kind)
		}
		// in this case no data is expected, but need to update child packages

		// TODO: implement me!

		// TODO: need to update all child package ids, that's going to be a lot of work

		// TODO: need to handle type change! workspace <-> group

		return fmt.Errorf("MoveGroupingPackage: TODO: not supported yet")
	})

	return objAffected, err
}

func (t transitionRepositoryImpl) MoveAllData(fromPkg, toPkg string) (int, error) {
	objAffected := 0
	err := t.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {
		// Copy version data to satisfy constraints
		affected, err := copyVersions(tx, fromPkg, toPkg)
		if err != nil {
			return err
		}
		objAffected += affected

		affected, err = moveNonVersionsData(tx, fromPkg, toPkg)
		if err != nil {
			return err
		}
		objAffected += affected

		// deleteVersionsData should affect the same rows as copy, so do not append it
		err = deleteVersionsData(tx, fromPkg)
		if err != nil {
			return fmt.Errorf("MoveAllData: failed to delete orig pkg data: %w", err)
		}

		return nil
	})
	if err != nil {
		return 0, err // transaction should be rolled back
	} else {
		return objAffected, nil
	}
}

func (t transitionRepositoryImpl) MovePackage(fromPkg, toPkg string, overwriteHistory bool) (int, error) {
	objAffected := 0
	err := t.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {
		fromPkgEnt := new(entity.PackageEntity)
		err := tx.Model(fromPkgEnt).
			Where("id = ?", fromPkg).
			First()
		if err != nil {
			return fmt.Errorf("failed to get from package: %w", err)
		}
		if !(fromPkgEnt.Kind == entity.KIND_PACKAGE || fromPkgEnt.Kind == entity.KIND_DASHBOARD) {
			return fmt.Errorf("MovePackage: not applicable for (from) api kind %s", fromPkgEnt.Kind)
		}
		// in this case no child packages expected, but need to update data

		toParts := strings.Split(toPkg, ".")
		newAlias := toParts[len(toParts)-1]
		newParent := strings.Join(toParts[:len(toParts)-1], ".")

		fromPkgEnt.Id = toPkg
		fromPkgEnt.Alias = newAlias
		fromPkgEnt.ParentId = newParent
		toPkgCount, errCount := tx.Model(&entity.PackageEntity{}).
			Where("id = ?", toPkg).
			Count()
		if errCount != nil {
			return fmt.Errorf("unable to move: failed to count destination packages")
		}
		if toPkgCount != 0 {
			// no updates possible due to currently implemented data retention policy
			return fmt.Errorf("unable to move: destination package %s already exists", toPkg)
		}
		_, err = tx.Model(fromPkgEnt).Insert()
		if err != nil {
			return fmt.Errorf("failed to create new package %s: %w", toPkg, err)
		}

		// Copy version data to satisfy constraints
		affected, err := copyVersions(tx, fromPkg, toPkg)
		if err != nil {
			return err
		}
		objAffected += affected

		affected, err = moveNonVersionsData(tx, fromPkg, toPkg)
		if err != nil {
			return err
		}
		objAffected += affected

		updatePS := "update package_service set package_id = ? where package_id=?"
		res, err := tx.Exec(updatePS, toPkg, fromPkg)
		if err != nil {
			return fmt.Errorf("MovePackage: failed to update package_id in package_service from %s to %s: %w", fromPkg, toPkg, err)
		}
		objAffected += res.RowsAffected()

		err = deleteVersionsData(tx, fromPkg)
		if err != nil {
			return fmt.Errorf("MoveAllData: failed to delete orig pkg data: %w", err)
		}

		deleteFromPkg := "delete from package_group where id = ?"
		res, err = tx.Exec(deleteFromPkg, fromPkg)
		if err != nil {
			return fmt.Errorf("failed to delete orig(%s) from package_group: %w", fromPkg, err)
		}
		objAffected += res.RowsAffected()

		err = t.addPackageTransitionRecord(tx, fromPkg, toPkg, overwriteHistory)
		if err != nil {
			return fmt.Errorf("MoveAllData: failed to add transition record: %w", err)
		}

		return nil
	})
	return objAffected, err
}

// copyVersions copy data related to all versions/revisions
func copyVersions(tx *pg.Tx, fromPkg, toPkg string) (int, error) {
	objAffected := 0
	versionsCount, err := tx.Model(&entity.PublishedVersionEntity{}).
		Where("package_id = ?", fromPkg).
		Count()
	if err != nil {
		return 0, fmt.Errorf("failed to query from pkg version count: %w", err)
	}
	if versionsCount == 0 {
		return 0, nil
	}

	copyVer := "insert into published_version (package_id, version, revision, status, published_at, deleted_at, metadata, " +
		"previous_version, previous_version_package_id, labels, created_by, deleted_by) " +
		"(select ?, version, revision, status, published_at, deleted_at, metadata, " +
		"previous_version, previous_version_package_id, labels, created_by, deleted_by FROM " +
		"published_version orig WHERE orig.package_id = ?) on conflict do nothing"
	res, err := tx.Exec(copyVer, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("failed to copy versions from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	copyDocsData := "insert into published_data (package_id, checksum, media_type, data) (select ?, checksum, media_type, data from published_data orig where orig.package_id = ?) on conflict do nothing"
	res, err = tx.Exec(copyDocsData, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("failed to copy versions docs data from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	copyVerDocs := "insert into published_version_revision_content (package_id, version, revision, checksum, index, file_id, path, slug, data_type, name, metadata, title, format, operation_ids, filename) " +
		"(select ?, version, revision, checksum, index, file_id, path, slug, data_type, name, metadata, title, format, operation_ids, filename from published_version_revision_content orig where orig.package_id = ?) on conflict do nothing"
	res, err = tx.Exec(copyVerDocs, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("failed to copy versions docs from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	copyRefsMain := "insert into published_version_reference (package_id, version, revision, reference_id, reference_version, reference_revision, parent_reference_id, parent_reference_version, parent_reference_revision, excluded) " +
		"(select ?, version, revision, reference_id, reference_version, reference_revision, parent_reference_id, parent_reference_version, parent_reference_revision, excluded from published_version_reference orig where orig.package_id = ?)  on conflict do nothing"
	res, err = tx.Exec(copyRefsMain, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("failed to copy versions refs from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	copyPSD := "insert into published_sources (package_id, version, revision, config, metadata, archive_checksum) " +
		"(select ?, version, revision, config, metadata, archive_checksum from published_sources orig where orig.package_id = ?) on conflict do nothing"
	res, err = tx.Exec(copyPSD, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("failed to copy published sources from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updPSD := "update published_sources set config=convert_to((convert_from(config,'UTF8')::jsonb||'{\"packageId\": \"" + toPkg + "\"}')::varchar, 'UTF8')::bytea where package_id='" + toPkg + "'" // toPkg twice here since the record is already inserted for new package id
	res, err = tx.Exec(updPSD)
	if err != nil {
		return 0, fmt.Errorf("failed to update published sources packageId for %s: %w", toPkg, err)
	}
	objAffected += res.RowsAffected()

	updPSD2 := "update published_sources set config=convert_to((convert_from(config,'UTF8')::jsonb||'{\"previousVersionPackageId\": \"" + toPkg + "\"}')::varchar, 'UTF8')::bytea where (convert_from(config,'UTF8')::jsonb)->>'previousVersionPackageId'='" + fromPkg + "'"
	res, err = tx.Exec(updPSD2)
	if err != nil {
		return 0, fmt.Errorf("failed to update published sources previousVersionPackageId for %s: %w", toPkg, err)
	}
	objAffected += res.RowsAffected()

	copyOps := "insert into operation (package_id, version, revision, operation_id, data_hash, deprecated, kind, title, metadata, type, deprecated_info, deprecated_items, previous_release_versions) " +
		"(select ?, version, revision, operation_id, data_hash, deprecated, kind, title, metadata, type, deprecated_info, deprecated_items, previous_release_versions from operation orig where orig.package_id = ?)  on conflict do nothing"
	res, err = tx.Exec(copyOps, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("failed to copy operations from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	copyOpsGroups := "insert into grouped_operation (group_id, package_id, version, revision, operation_id) (select group_id, ?, version, revision, operation_id from grouped_operation orig where orig.package_id = ?)  on conflict do nothing"
	res, err = tx.Exec(copyOpsGroups, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("failed to copy operation groups from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	copyMigratedVersion := "insert into migrated_version (package_id, version, revision, error, build_id, migration_id, build_type, no_changelog) " +
		"(select ?, version, revision, error, build_id, migration_id, build_type, no_changelog from migrated_version orig where orig.package_id = ?)  on conflict do nothing"
	res, err = tx.Exec(copyMigratedVersion, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("failed to copy migrated version from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	copyPVOC := "insert into published_version_open_count (package_id, version, open_count) " +
		"(select ?, version, open_count from " +
		"published_version_open_count orig where orig.package_id = ?) on conflict do nothing"
	res, err = tx.Exec(copyPVOC, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("failed to insert published_version_open_count copy to pkg %s: %w", toPkg, err)
	}
	objAffected += res.RowsAffected()

	copyPDOC := "insert into published_document_open_count (package_id, version, slug, open_count) " +
		"(select ?, version, slug, open_count from " +
		"published_document_open_count orig where orig.package_id = ?)  on conflict do nothing"
	res, err = tx.Exec(copyPDOC, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("failed to insert published_document_open_count copy to pkg %s: %w", toPkg, err)
	}
	objAffected += res.RowsAffected()

	copyOOC := "insert into operation_open_count (package_id, version, operation_id, open_count) " +
		"(select ?, version, operation_id, open_count from operation_open_count orig where orig.package_id = ?) on conflict do nothing"
	res, err = tx.Exec(copyOOC, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("failed to insert operation_open_count copy to pkg %s: %w", toPkg, err)
	}
	objAffected += res.RowsAffected()

	return objAffected, nil
}

// deleteVersionsData move non-version data without strong relations
func moveNonVersionsData(tx *pg.Tx, fromPkg, toPkg string) (int, error) {
	objAffected := 0

	updateAT := "update activity_tracking set package_id = ? where package_id=?"
	res, err := tx.Exec(updateAT, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update package_id in activity tracking from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateApiKeys := "update apihub_api_keys set package_id = ? where package_id=?;"
	res, err = tx.Exec(updateApiKeys, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update package_id in apihub_api_keys from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateBuild := "update build set package_id = ? where package_id=?;"
	res, err = tx.Exec(updateBuild, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update package_id in build from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateFavs := "update favorite_packages set package_id = ? where package_id=?"
	res, err = tx.Exec(updateFavs, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update package_id in favorite_packages from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateShared := "update shared_url_info set package_id = ? where package_id=?"
	res, err = tx.Exec(updateShared, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update package_id in shared_url_info from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updatePrevVer := "update published_version set previous_version_package_id = ? where previous_version_package_id = ?;"
	res, err = tx.Exec(updatePrevVer, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update prev ver package_id in published_version from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateRefs := "update published_version_reference set reference_id = ? where reference_id = ?;"
	res, err = tx.Exec(updateRefs, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update ref package_id in published_version_reference from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()
	// TODO: what about parent reference id?

	updateVersComp := "update version_comparison set package_id  = ? where package_id = ?;"
	res, err = tx.Exec(updateVersComp, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update package_id in version_comparison from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateVersCompPrev := "update version_comparison set previous_package_id  = ? where previous_package_id = ?;"
	res, err = tx.Exec(updateVersCompPrev, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update prev package_id in version_comparison from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateVersCompIdForRefs := `
		with comp as (
			select 
			comparison_id,
			md5(package_id||'@'||version||'@'||revision||'@'||previous_package_id||'@'||previous_version||'@'||previous_revision) as new_comparison_id 
			from version_comparison 
			where package_id = ? or previous_package_id = ?
		)
		update version_comparison b set refs = array_replace(refs, c.comparison_id, c.new_comparison_id::varchar)
		from comp c
		where c.comparison_id = any(refs);`
	res, err = tx.Exec(updateVersCompIdForRefs, toPkg, toPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update comparison_id for refs in version_comparison for package_id update from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateVersCompId := `
		with comp as (
			select 
			comparison_id,
			md5(package_id||'@'||version||'@'||revision||'@'||previous_package_id||'@'||previous_version||'@'||previous_revision) as new_comparison_id 
			from version_comparison 
			where package_id = ? or previous_package_id = ?
		)
		update version_comparison b set comparison_id = c.new_comparison_id::varchar
		from comp c
		where c.comparison_id = b.comparison_id;`
	res, err = tx.Exec(updateVersCompId, toPkg, toPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update comparison_id in version_comparison for package_id update from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateOperationComp := "update operation_comparison set package_id  = ? where package_id = ?;"
	res, err = tx.Exec(updateOperationComp, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update package_id in operation_comparison from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateOperationGroups := "update operation_group set package_id  = ? where package_id = ?;"
	res, err = tx.Exec(updateOperationGroups, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update package_id in operation_group from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateOperationGroup := "update operation_group " +
		"set group_id=MD5(CONCAT_WS('@', package_id, version, revision, api_type, group_name)) " +
		"where MD5(CONCAT_WS('@', package_id, version, revision, api_type, group_name))!= operation_group.group_id;"
	res, err = tx.Exec(updateOperationGroup)
	if err != nil {
		return 0, fmt.Errorf("failed to update operation group ids: %w", err)
	}
	objAffected += res.RowsAffected()

	updateOperationCompPrev := "update operation_comparison set previous_package_id  = ? where previous_package_id = ?;"
	res, err = tx.Exec(updateOperationCompPrev, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update prev package_id in operation_comparison from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updatePkgSvc := "update package_service set package_id = ? where package_id=?;"
	res, err = tx.Exec(updatePkgSvc, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update package_id in package_service from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateProject := "update project set package_id = ? where package_id=?;"
	res, err = tx.Exec(updateProject, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update package_id in project from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateUserRoles := "update package_member_role set package_id = ? where package_id=?;"
	res, err = tx.Exec(updateUserRoles, toPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update package_member_role package_id from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	updateMetrics := `update business_metric set data = business_metric.data - ? || jsonb_build_object(?, business_metric.data -> ?)
	where data -> ? is not null;`
	res, err = tx.Exec(updateMetrics, fromPkg, toPkg, fromPkg, fromPkg)
	if err != nil {
		return 0, fmt.Errorf("MoveAllData: failed to update package_id in business_metric from %s to %s: %w", fromPkg, toPkg, err)
	}
	objAffected += res.RowsAffected()

	return objAffected, nil
}

// deleteVersionsData delete data related to all versions/revisions
func deleteVersionsData(tx *pg.Tx, fromPkg string) error {
	query := "delete from published_version where package_id = ?"
	_, err := tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from published_version: %w", fromPkg, err)
	}

	query = "delete from published_data where package_id = ?"
	_, err = tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from published_data: %w", fromPkg, err)
	}

	query = "delete from published_version_revision_content where package_id = ?"
	_, err = tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from published_version_revision_content: %w", fromPkg, err)
	}

	query = "delete from published_version_reference where package_id = ?"
	_, err = tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from published_version_reference: %w", fromPkg, err)
	}

	query = "delete from published_sources where package_id = ?"
	_, err = tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from published_sources: %w", fromPkg, err)
	}

	query = "delete from grouped_operation where package_id = ?"
	_, err = tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from grouped_operation: %w", fromPkg, err)
	}

	query = "delete from operation where package_id = ?"
	_, err = tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from operation: %w", fromPkg, err)
	}

	query = "delete from migrated_version where package_id = ?"
	_, err = tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from migrated_version: %w", fromPkg, err)
	}

	query = "delete from operation_comparison where package_id = ?"
	_, err = tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from operation_comparison: %w", fromPkg, err)
	}

	query = "delete from version_comparison where package_id = ?"
	_, err = tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from version_comparison: %w", fromPkg, err)
	}

	query = "delete from published_version_open_count where package_id = ?"
	_, err = tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from published_version_open_count: %w", fromPkg, err)
	}

	query = "delete from operation_open_count where package_id = ?"
	_, err = tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from operation_open_count: %w", fromPkg, err)
	}

	query = "delete from published_document_open_count where package_id = ?"
	_, err = tx.Exec(query, fromPkg)
	if err != nil {
		return fmt.Errorf("failed to delete orig(%s) from published_document_open_count: %w", fromPkg, err)
	}

	return nil
}

func (t transitionRepositoryImpl) TrackTransitionStarted(userCtx context2.SecurityContext, id, trType, fromPkg, toPkg string) error {
	ent := entity.TransitionActivityEntity{
		Id:              id,
		TrType:          trType,
		FromId:          fromPkg,
		ToId:            toPkg,
		Status:          string(view.StatusRunning),
		Details:         "",
		StartedBy:       userCtx.GetUserId(),
		StartedAt:       time.Now(),
		FinishedAt:      time.Time{},
		ProgressPercent: 0,
		AffectedObjects: 0,
	}

	_, err := t.cp.GetConnection().Model(&ent).Insert()
	if err != nil {
		return fmt.Errorf("failed to insert transition activity entity %+v: %w", ent, err)
	}

	return nil
}

func (t transitionRepositoryImpl) TrackTransitionProgress(id, progress int) error {
	ent := entity.TransitionActivityEntity{}
	err := t.cp.GetConnection().Model(&ent).Where("id=?", id).First()
	if err != nil {
		return err
	}
	ent.ProgressPercent = progress

	_, err = t.cp.GetConnection().Model(&ent).Where("id=?", id).Update()
	return err
}

func (t transitionRepositoryImpl) TrackTransitionFailed(id, details string) error {
	ent := entity.TransitionActivityEntity{}
	err := t.cp.GetConnection().Model(&ent).Where("id=?", id).First()
	if err != nil {
		return err
	}
	ent.Status = string(view.StatusError)
	ent.Details = details
	ent.FinishedAt = time.Now()

	_, err = t.cp.GetConnection().Model(&ent).Where("id=?", id).Update()
	return err
}

func (t transitionRepositoryImpl) TrackTransitionCompleted(id string, affectedObjects int) error {
	updateQuery := `update activity_tracking_transition 
	set status = ?, affected_objects = ?, finished_at = ?, progress_percent = 100, completed_serial_number = nextval('activity_tracking_transition_completed_seq')
	where id=?;`
	_, err := t.cp.GetConnection().Exec(updateQuery, string(view.StatusComplete), affectedObjects, time.Now(), id)
	return err
}

func (t transitionRepositoryImpl) GetTransitionStatus(id string) (*entity.TransitionActivityEntity, error) {
	ent := entity.TransitionActivityEntity{}
	err := t.cp.GetConnection().Model(&ent).Where("id=?", id).First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &ent, nil
}

func (t transitionRepositoryImpl) ListCompletedTransitions(completedSerialOffset int, limit int) ([]entity.TransitionActivityEntity, error) {
	var result []entity.TransitionActivityEntity
	err := t.cp.GetConnection().Model(&result).
		Where("status = ?", string(view.StatusComplete)).
		Order("completed_serial_number ASC").
		Offset(completedSerialOffset).
		Limit(limit).
		Select()
	return result, err
}

func (t transitionRepositoryImpl) addPackageTransitionRecord(tx *pg.Tx, oldPackageId string, newPackageId string, overwriteHistory bool) error {
	if overwriteHistory {
		// Delete record from transition history that is reserving `newPackageId` place
		res, err := tx.Model(&entity.PackageTransitionEntity{}).Where("old_package_id = ?", newPackageId).Delete()
		if err != nil {
			return fmt.Errorf("failed to delete historical transition for package %s: %w", newPackageId, err)
		}
		if res.RowsAffected() >= 0 {
			log.Infof("Deleted historical transition for package %s", newPackageId)
		}
	}
	var existingTransitions []entity.PackageTransitionEntity // existing transitions to old id, i.e. package move history
	err := tx.Model(&existingTransitions).Where("new_package_id = ?", oldPackageId).Select()
	if err != nil {
		if err != pg.ErrNoRows {
			return fmt.Errorf("failed to list existing transitions for package id = %s: %w", oldPackageId, err)
		}
	}

	newTransition := entity.PackageTransitionEntity{
		OldPackageId: oldPackageId,
		NewPackageId: newPackageId,
	}
	_, err = tx.Model(&newTransition).Insert()
	if err != nil {
		return fmt.Errorf("failed to insert new transition %+v: %w", newTransition, err)
	}

	for _, tr := range existingTransitions {
		if tr.OldPackageId == newPackageId {
			// it doesn't make sense to redirect pkg to itself, delete the record
			res, err := tx.Model(&tr).Where("old_package_id = ?", tr.OldPackageId).Delete()
			if err != nil {
				return fmt.Errorf("failed to delete self transition %+v: %w", tr, err)
			}
			if res.RowsAffected() != 1 {
				return fmt.Errorf("failed to delete self transition %+v: incorrect affected row count = %d", tr, res.RowsAffected())
			}
		} else {
			res, err := tx.Model(&tr).Where("old_package_id = ?", tr.OldPackageId).Set("new_package_id = ?", newPackageId).Update()
			if err != nil {
				return fmt.Errorf("failed to update transition %+v: %w", tr, err)
			}
			if res.RowsAffected() != 1 {
				return fmt.Errorf("failed to update transition %+v: incorrect affected row count = %d", tr, res.RowsAffected())
			}
		}
	}

	return nil
}

func (t transitionRepositoryImpl) GetNewPackageId(oldPackageId string) (string, error) {
	transition := &entity.PackageTransitionEntity{}
	err := t.cp.GetConnection().Model(transition).Where("old_package_id = ?", oldPackageId).Select()
	if err != nil {
		if err != pg.ErrNoRows {
			return "", fmt.Errorf("failed to get transition for package id = %s: %w", oldPackageId, err)
		}
	}
	return transition.NewPackageId, nil
}

func (t transitionRepositoryImpl) GetOldPackageIds(newPackageId string) ([]string, error) {
	var result []string
	var existingTransitions []entity.PackageTransitionEntity
	err := t.cp.GetConnection().Model(&existingTransitions).Where("new_package_id = ?", newPackageId).Select()
	if err != nil {
		if err != pg.ErrNoRows {
			return nil, fmt.Errorf("failed to list existing transiotions for package id = %s: %w", newPackageId, err)
		}
	}
	for _, tr := range existingTransitions {
		result = append(result, tr.OldPackageId)
	}
	return result, nil
}

func (t transitionRepositoryImpl) ListPackageTransitions() ([]entity.PackageTransitionEntity, error) {
	var result []entity.PackageTransitionEntity
	err := t.cp.GetConnection().Model(&result).Select()
	return result, err
}
