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
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

type ActivityTrackingRepository interface {
	CreateEvent(ent *entity.ActivityTrackingEntity) error

	GetEventsForPackages_deprecated(packageIds []string, limit int, page int, textFilter string, types []string) ([]entity.EnrichedActivityTrackingEntity_deprecated, error)
	GetEventsForPackages(packageIds []string, limit int, page int, textFilter string, types []string) ([]entity.EnrichedActivityTrackingEntity, error)
}

func NewActivityTrackingRepository(cp db.ConnectionProvider) ActivityTrackingRepository {
	return &activityTrackingRepositoryImpl{
		cp: cp,
	}
}

type activityTrackingRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (a activityTrackingRepositoryImpl) CreateEvent(ent *entity.ActivityTrackingEntity) error {
	_, err := a.cp.GetConnection().Model(ent).Insert()
	if err != nil {
		return err
	}
	return nil
}

func (a activityTrackingRepositoryImpl) GetEventsForPackages_deprecated(packageIds []string, limit int, page int, textFilter string, types []string) ([]entity.EnrichedActivityTrackingEntity_deprecated, error) {
	var result []entity.EnrichedActivityTrackingEntity_deprecated

	query := a.cp.GetConnection().Model(&result).
		ColumnExpr("at.*").ColumnExpr("get_latest_revision(at.package_id, at.data #>> '{version}') != (at.data #>> '{revision}')::int as not_latest_revision").ColumnExpr("pkg.name as pkg_name, pkg.kind as pkg_kind, usr.name as usr_name").
		Join("inner join package_group as pkg").JoinOn("at.package_id=pkg.id").
		Join("inner join user_data as usr").JoinOn("at.user_id=usr.user_id")

	if len(packageIds) > 0 {
		query.Where("at.package_id in (?)", pg.In(packageIds))
	}
	if len(types) > 0 {
		query.Where("at.e_type in (?)", pg.In(types))
	}
	if textFilter != "" {
		textFilter = "%" + utils.LikeEscaped(textFilter) + "%"
		query.WhereGroup(func(query *orm.Query) (*orm.Query, error) {
			return query.Where("pkg.name ilike ?", textFilter).WhereOr("usr.name ilike ?", textFilter), nil
		})
	}
	query.Order("date DESC").Limit(limit).Offset(limit * page)

	err := query.Select()
	if err != nil {
		return nil, err
	}

	if err != nil {
		if err != pg.ErrNoRows {
			return nil, err
		}
	}
	return result, nil
}
func (a activityTrackingRepositoryImpl) GetEventsForPackages(packageIds []string, limit int, page int, textFilter string, types []string) ([]entity.EnrichedActivityTrackingEntity, error) {
	var result []entity.EnrichedActivityTrackingEntity

	query := a.cp.GetConnection().Model(&result).
		ColumnExpr("at.*").
		ColumnExpr("get_latest_revision(at.package_id, at.data #>> '{version}') != (at.data #>> '{revision}')::int as not_latest_revision").
		ColumnExpr("pkg.name as pkg_name, pkg.kind as pkg_kind").
		ColumnExpr("usr.name as prl_usr_name, usr.email as prl_usr_email, usr.avatar_url as prl_usr_avatar_url").
		ColumnExpr("apikey.id as prl_apikey_id, apikey.name as prl_apikey_name").
		ColumnExpr("case when coalesce(usr.name, apikey.name) is null then at.user_id else usr.user_id end prl_usr_id").
		Join("inner join package_group as pkg").JoinOn("at.package_id=pkg.id").
		Join("left join user_data as usr").JoinOn("at.user_id=usr.user_id").
		Join("left join apihub_api_keys as apikey").JoinOn("at.user_id=apikey.id")

	if len(packageIds) > 0 {
		query.Where("at.package_id in (?)", pg.In(packageIds))
	}
	if len(types) > 0 {
		query.Where("at.e_type in (?)", pg.In(types))
	}
	if textFilter != "" {
		textFilter = "%" + utils.LikeEscaped(textFilter) + "%"
		query.WhereGroup(func(query *orm.Query) (*orm.Query, error) {
			//TODO: Check if usr is empty bbecause of apikey:: is it corrrect?
			return query.Where("pkg.name ilike ?", textFilter).WhereOr("usr.name ilike ?", textFilter), nil
		})
	}
	query.Order("date DESC").Limit(limit).Offset(limit * page)

	err := query.Select()
	if err != nil {
		return nil, err
	}

	if err != nil {
		if err != pg.ErrNoRows {
			return nil, err
		}
	}
	return result, nil
}
