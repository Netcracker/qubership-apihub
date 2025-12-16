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
	"fmt"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mView "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

	"github.com/go-pg/pg/v10"
)

func (d OpsMigration) StageDependentVersionsLastRevs() error {
	round := 1

	_, err := d.waitForBuilds(mView.MigrationStageDependentVersionsLastRevs, round) // for recovery, but round number is not recovered since it's not significant in the whole procedure
	if err != nil {
		return err
	}

	count := 1
	for count > 0 {
		query, params := makeDependentVersionsQuery(d.ent.PackageIds, d.ent.Versions, d.ent.Id, true)

		count, err = d.createBuilds(query, params, d.ent.Id, mView.MigrationStageDependentVersionsLastRevs)
		if err != nil {
			return fmt.Errorf("migration %s stage %s round %d: %w", d.ent.Id, mView.MigrationStageDependentVersionsLastRevs, round, err)
		}

		if count > 0 {
			_, err = d.waitForBuilds(mView.MigrationStageDependentVersionsLastRevs, round)
			if err != nil {
				return err
			}
		}
		round += 1
	}

	return nil
}

func (d OpsMigration) StageDependentVersionsOldRevs() error {
	round := 1

	_, err := d.waitForBuilds(mView.MigrationStageDependentVersionsOldRevs, round) // for recovery, but round number is not recovered since it's not significant in the whole procedure
	if err != nil {
		return err
	}

	count := 1
	for count > 0 {
		query, params := makeDependentVersionsQuery(d.ent.PackageIds, d.ent.Versions, d.ent.Id, false)

		count, err = d.createBuilds(query, params, d.ent.Id, mView.MigrationStageDependentVersionsOldRevs)
		if err != nil {
			return fmt.Errorf("migration %s stage %s round %d: %w", d.ent.Id, mView.MigrationStageDependentVersionsOldRevs, round, err)
		}

		if count > 0 {
			_, err = d.waitForBuilds(mView.MigrationStageDependentVersionsOldRevs, round)
			if err != nil {
				return err
			}
		}
		round += 1
	}

	return nil
}

func makeDependentVersionsQuery(packageIds []string, versionsIn []string, migrationId string, isLatest bool) (string, []interface{}) {
	params := make([]interface{}, 0)
	var wherePackageIn string
	if len(packageIds) > 0 {
		wherePackageIn = " and package_id in (?) "
		params = append(params, pg.In(packageIds))
	}

	var whereVersionIn string
	if len(versionsIn) > 0 {
		extractedVersions := make([]string, 0, len(versionsIn))
		for _, ver := range versionsIn {
			verSplit := strings.Split(ver, "@")
			if len(verSplit) > 0 && verSplit[0] != "" {
				extractedVersions = append(extractedVersions, verSplit[0])
			}
		}
		if len(extractedVersions) > 0 {
			whereVersionIn = " and version in (?) "
			params = append(params, pg.In(extractedVersions))
		}
	}

	query := `
	with maxrev as (
		select package_id, version, max(revision) as revision
			from published_version where deleted_at is null `

	if wherePackageIn != "" {
		query += wherePackageIn
	}
	if whereVersionIn != "" {
		query += whereVersionIn
	}

	var maxrevQueryOperator string
	if isLatest {
		maxrevQueryOperator = "=" // join on latest revision
	} else {
		maxrevQueryOperator = "!=" // join on NOT latest revision
	}

	query +=
		fmt.Sprintf(
			` group by package_id, version
			)
		select pv.* from
			published_version pv
				inner join maxrev
						   on pv.package_id = maxrev.package_id
							   and pv.version = maxrev.version
							   and pv.revision %s maxrev.revision
							   and pv.deleted_at is null
				inner join package_group pkg on pv.package_id = pkg.id
		where
			/*previous version is not empty, i.e. version have depend*/
			pv.previous_version is not null and
			/* previous version is migrated successfully(!), assuming that we're working with the last revision which should be already migrated */
			exists (select 1 from build b
					  where
						  b.package_id=(CASE WHEN (pv.previous_version_package_id IS NULL OR pv.previous_version_package_id = '') THEN pv.package_id ELSE pv.previous_version_package_id END)
						and b.version like pv.previous_version || '@%%' /* simple '=' will not work due to "v@r" format in build's version */
						and b.metadata->>'migration_id' = '%s'
						and b.status='%s'
			) and
			/*version is not migrated yet*/
			not exists(
			select 1 from build b
			where (string_to_array(b.version, '@'))[1] = pv.version /* simple = will not work due to "v@r" format in build */
			  and b.package_id = pv.package_id
			  and (string_to_array(b.version, '@'))[2]::int = pv.revision
			  and b.metadata->>'build_type' = 'build'
			  and b.metadata->>'migration_id' = '%s'
		) and pkg.deleted_at is null and pkg.kind = '%s'
		order by pv.published_at asc, pv.package_id asc, pv.version asc, pv.revision asc
	`, maxrevQueryOperator, migrationId, view.StatusComplete, migrationId, entity.KIND_PACKAGE)
	return query, params
}
