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

package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type BuildEntity struct {
	tableName struct{} `pg:"build"`

	BuildId     string `pg:"build_id, pk, type:varchar"`
	Status      string `pg:"status, type:varchar"`
	Details     string `pg:"details, type:varchar"`
	ClientBuild bool   `pg:"client_build, type:boolean, use_zero"`

	PackageId string `pg:"package_id, type:varchar"`
	Version   string `pg:"version, type:varchar"`

	CreatedAt  *time.Time `pg:"created_at, type:timestamp without time zone, default:now()"`
	LastActive *time.Time `pg:"last_active, type:timestamp without time zone, default:now()"`
	CreatedBy  string     `pg:"created_by, type:varchar"`

	StartedAt *time.Time `pg:"started_at, type:timestamp without time zone"`

	RestartCount int `pg:"restart_count, type:integer, use_zero"`

	BuilderId string                 `pg:"builder_id, type:varchar"`
	Priority  int                    `pg:"priority, type:integer, use_zero"`
	Metadata  map[string]interface{} `pg:"metadata, type:jsonb"`
}

type BuildSourceEntity struct {
	tableName struct{} `pg:"build_src"`

	BuildId string                 `pg:"build_id, pk, type:varchar"`
	Source  []byte                 `pg:"source, type:bytea"`
	Config  map[string]interface{} `pg:"config, type:jsonb"`
}

type BuildDependencyEntity struct {
	tableName struct{} `pg:"build_depends"`

	BuildId  string `pg:"build_id, type:varchar"`
	DependId string `pg:"depend_id, type:varchar"`
}

type ChangelogBuildSearchQueryEntity struct {
	PackageId                string         `pg:"package_id, type:varchar, use_zero"`
	Version                  string         `pg:"version, type:varchar, use_zero"`
	PreviousVersionPackageId string         `pg:"previous_version_package_id, type:varchar, use_zero"`
	PreviousVersion          string         `pg:"previous_version, type:varchar, use_zero"`
	BuildType                view.BuildType `pg:"build_type, type:varchar, use_zero"`
	ComparisonRevision       int            `pg:"comparison_revision, type:integer, use_zero"`
	ComparisonPrevRevision   int            `pg:"comparison_prev_revision, type:integer, use_zero"`
}

type DocumentGroupBuildSearchQueryEntity struct {
	PackageId string         `pg:"package_id, type:varchar, use_zero"`
	Version   string         `pg:"version, type:varchar, use_zero"`
	BuildType view.BuildType `pg:"build_type, type:varchar, use_zero"`
	Format    string         `pg:"format, type:varchar, use_zero"`
	ApiType   string         `pg:"api_type, type:varchar, use_zero"`
	GroupName string         `pg:"group_name, type:varchar, use_zero"`
}

func MakeBuildView(buildEnt *BuildEntity) *view.BuildView {
	return &view.BuildView{
		PackageId:    buildEnt.PackageId,
		Version:      buildEnt.Version,
		BuildId:      buildEnt.BuildId,
		Status:       buildEnt.Status,
		Details:      buildEnt.Details,
		CreatedAt:    *buildEnt.CreatedAt,
		LastActive:   *buildEnt.LastActive,
		CreatedBy:    buildEnt.CreatedBy,
		RestartCount: buildEnt.RestartCount,
	}
}
