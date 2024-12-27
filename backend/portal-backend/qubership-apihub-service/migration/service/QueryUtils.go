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
	"fmt"
	"strings"

	"github.com/go-pg/pg/v10"

	log "github.com/sirupsen/logrus"
)

func makeLatestIndependentVersionsQuery(packageIds []string, versionsIn []string) string {
	var wherePackageIn string
	if len(packageIds) > 0 {
		wherePackageIn = " and package_id in ("
		for i, pkg := range packageIds {
			if i > 0 {
				wherePackageIn += ","
			}
			wherePackageIn += fmt.Sprintf("'%s'", pkg)
		}
		wherePackageIn += ") "
	}

	var whereVersionIn string
	if len(versionsIn) > 0 {
		whereVersionIn = " and version in ("
		for i, ver := range versionsIn {
			if i > 0 {
				whereVersionIn += ","
			}
			verSplit := strings.Split(ver, "@")
			whereVersionIn += fmt.Sprintf("'%s'", verSplit[0])
		}
		whereVersionIn += ") "
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
		` group by package_id, version
	)
	select pv.* from 
	published_version pv
	inner join maxrev
		on pv.package_id = maxrev.package_id
		and pv.version = maxrev.version
		and pv.revision = maxrev.revision
		and pv.deleted_at is null
	inner join package_group pkg on pv.package_id = pkg.id
	where
		(pv.previous_version is null
			or (
				exists(
					select 1 from published_version ppv inner join package_group ppg on
						(CASE WHEN (pv.previous_version_package_id IS NULL OR pv.previous_version_package_id = '') THEN pv.package_id ELSE pv.previous_version_package_id END) = ppg.id
					where pv.previous_version=ppv.version and (ppv.deleted_at is not null or ppg.deleted_at is not null)
					)
			and exists(
					select 1 from migrated_version mv
									inner join maxrev
												on (CASE WHEN (pv.previous_version_package_id IS NULL OR pv.previous_version_package_id = '') THEN pv.package_id ELSE pv.previous_version_package_id END) = maxrev.package_id
													and pv.previous_version = maxrev.version
					where mv.version = pv.previous_version
					and mv.revision = maxrev.revision /* prev version max rev */
					and mv.build_type = 'build' 
					and mv.error is null
					and (CASE WHEN (pv.previous_version_package_id IS NULL OR pv.previous_version_package_id = '') THEN pv.package_id ELSE pv.previous_version_package_id END) = mv.package_id
					)
				)
			)
	  and not exists(
			select 1 from migrated_version mv
			where mv.version = pv.version
			  and mv.package_id = pv.package_id
			  and mv.revision = pv.revision
              and mv.build_type = 'build' 
		) and pkg.deleted_at is null
	`
	return getLatestIndependentVersionsQuery
}

func makeNotLatestVersionsQuery(packageIds []string, versionsIn []string) string {
	var wherePackageIn string
	if len(packageIds) > 0 {
		wherePackageIn = " and package_id in ("
		for i, pkg := range packageIds {
			if i > 0 {
				wherePackageIn += ","
			}
			wherePackageIn += fmt.Sprintf("'%s'", pkg)
		}
		wherePackageIn += ") "
	}

	var whereVersionIn string
	if len(versionsIn) > 0 {
		whereVersionIn = " and version in ("
		for i, ver := range versionsIn {
			if i > 0 {
				whereVersionIn += ","
			}
			verSplit := strings.Split(ver, "@")
			whereVersionIn += fmt.Sprintf("'%s'", verSplit[0])
		}
		whereVersionIn += ") "
	}

	getNotLatestVersionsQuery := `
	with maxrev as (
		select package_id, version, max(revision) as revision
			from published_version where deleted_at is null `

	if wherePackageIn != "" {
		getNotLatestVersionsQuery += wherePackageIn
		log.Infof("wherePackageIn=%s", wherePackageIn)
	}
	if whereVersionIn != "" {
		getNotLatestVersionsQuery += whereVersionIn
		log.Infof("whereVersionIn=%s", whereVersionIn)
	}

	getNotLatestVersionsQuery +=
		` group by package_id, version
	)
	select pv.* from 
	published_version pv
	inner join package_group pkg on pv.package_id = pkg.id
	where pv.deleted_at is null
	and not exists(
		select 1 from migrated_version mv
		where mv.version = pv.version
		and mv.package_id = pv.package_id
		and mv.revision = pv.revision
		and mv.build_type = 'build' 
	) 
	and exists(
				select 1 from migrated_version mv
								inner join maxrev
											on (CASE WHEN (pv.previous_version_package_id IS NULL OR pv.previous_version_package_id = '') THEN pv.package_id ELSE pv.previous_version_package_id END) = maxrev.package_id
												and pv.previous_version = maxrev.version
				where mv.version = pv.previous_version
				and mv.revision = maxrev.revision /* prev version max rev */
				and mv.build_type = 'build' 
				and mv.error is null
				and (CASE WHEN (pv.previous_version_package_id IS NULL OR pv.previous_version_package_id = '') THEN pv.package_id ELSE pv.previous_version_package_id END) = mv.package_id
				)
	and pkg.deleted_at is null`

	return getNotLatestVersionsQuery
}

func makeAllChangelogForMigrationQuery(packageIds, versions []string) string {
	query := `SELECT distinct package_id, version, revision, previous_package_id, previous_version, previous_revision 
	FROM version_comparison 
	WHERE package_id != ''
	and version != '' and previous_version != ''`
	if len(packageIds) != 0 || len(versions) != 0 {
		var wherePackageIn string
		if len(packageIds) > 0 {
			wherePackageIn = " and package_id in ("
			for i, pkg := range packageIds {
				if i > 0 {
					wherePackageIn += ","
				}
				wherePackageIn += fmt.Sprintf("'%s'", pkg)
			}
			wherePackageIn += ") "
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
		}
		if wherePackageIn != "" {
			query += wherePackageIn
			log.Infof("wherePackageIn=%s", wherePackageIn)
		}
		if whereVersionIn != "" {
			query += whereVersionIn
			log.Infof("whereVersionIn=%s", whereVersionIn)
		}
	}
	query += " order by package_id, version, revision, previous_package_id, previous_version, previous_revision"
	return query
}

func makeChangelogByMigratedVersionQuery(migrationId string) string {
	query := `SELECT distinct c.package_id, c.version, c.revision, c.previous_package_id, c.previous_version, c.previous_revision FROM version_comparison as c
				inner join migrated_version mv
					on c.package_id = mv.package_id
					and c.version = mv.version
					and c.revision = mv.revision
					and mv.build_type = 'build'
					and mv.no_changelog = true
				where c.version != '' and c.previous_version != ''`

	if migrationId != "" {
		query += fmt.Sprintf(" and mv.migration_id = '%s'", migrationId)
	}

	query += ` order by c.package_id,c.version,c.revision,c.previous_package_id,c.previous_version,c.previous_revision`
	return query
}

const retryAttemptsCount = 5

func queryWithRetry(conn *pg.DB, model, query interface{}, params ...interface{}) (pg.Result, error) {
	var err error
	var result pg.Result
	attempts := retryAttemptsCount
	for attempts >= 0 {
		result, err = conn.Query(model, query, params)
		if err != nil {
			if strings.Contains(err.Error(), "connection pool timeout") {
				attempts--
				continue
			} else {
				return result, err
			}
		}
		return result, nil
	}
	return nil, fmt.Errorf("queryWithRetry: %d attempts failed: %w", retryAttemptsCount, err)
}
