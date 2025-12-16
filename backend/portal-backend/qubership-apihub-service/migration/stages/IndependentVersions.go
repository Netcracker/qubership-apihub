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

	"github.com/go-pg/pg/v10"
)

func (d OpsMigration) StageIndependentVersionsLastRevisions() error {
	_, err := d.waitForBuilds(mView.MigrationStageIndependentVersionsLastRevs, 1) // for recovery
	if err != nil {
		return err
	}

	getLatestIndependentVersionsQuery, params := makeIndependentVersionsQuery(d.ent.PackageIds, d.ent.Versions, true)

	count, err := d.createBuilds(getLatestIndependentVersionsQuery, params, d.ent.Id, mView.MigrationStageIndependentVersionsLastRevs)
	if err != nil {
		return fmt.Errorf("migration %s stage %s round %d: %w", d.ent.Id, mView.MigrationStageIndependentVersionsLastRevs, 1, err)
	}

	if count > 0 {
		_, err = d.waitForBuilds(mView.MigrationStageIndependentVersionsLastRevs, 1)
		if err != nil {
			return err
		}
	}

	return nil
}

func (d OpsMigration) StageIndependentVersionsOldRevisions() error {
	_, err := d.waitForBuilds(mView.MigrationStageIndependentVersionsOldRevs, 1) // for recovery, but round number is not recovered since it's not significant in the whole procedure
	if err != nil {
		return err
	}

	getOldIndependentVersionsQuery, params := makeIndependentVersionsQuery(d.ent.PackageIds, d.ent.Versions, false)

	count, err := d.createBuilds(getOldIndependentVersionsQuery, params, d.ent.Id, mView.MigrationStageIndependentVersionsOldRevs)
	if err != nil {
		return fmt.Errorf("migration %s stage %s round %d: %w", d.ent.Id, mView.MigrationStageIndependentVersionsOldRevs, 1, err)
	}

	if count > 0 {
		_, err = d.waitForBuilds(mView.MigrationStageIndependentVersionsOldRevs, 1)
		if err != nil {
			return err
		}
	}

	return nil
}

func makeIndependentVersionsQuery(packageIds []string, versionsIn []string, isLatest bool) (string, []interface{}) {
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

	var maxrevQueryOperator string
	if isLatest {
		maxrevQueryOperator = "=" // join on latest revision
	} else {
		maxrevQueryOperator = "!=" // join on NOT latest revision
	}

	getLatestIndependentVersionsQuery := `
	with maxrev as (
		select package_id, version, max(revision) as revision
			from published_version where deleted_at is null `

	if wherePackageIn != "" {
		getLatestIndependentVersionsQuery += wherePackageIn
	}
	if whereVersionIn != "" {
		getLatestIndependentVersionsQuery += whereVersionIn
	}

	getLatestIndependentVersionsQuery +=
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
		pv.previous_version is null and pkg.deleted_at is null and pkg.kind = '%s'
    order by pv.published_at asc, pv.package_id asc, pv.version asc, pv.revision asc
	`, maxrevQueryOperator, entity.KIND_PACKAGE) // published_at is a first order to avoid paging breakage by new entries
	return getLatestIndependentVersionsQuery, params
}
