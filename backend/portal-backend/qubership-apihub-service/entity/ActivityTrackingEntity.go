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
	"github.com/google/uuid"
)

type ActivityTrackingEntity struct {
	tableName struct{} `pg:"activity_tracking"`

	Id        string                 `pg:"id, pk, type:varchar"`
	Type      string                 `pg:"e_type, type:varchar"`
	Data      map[string]interface{} `pg:"data, type:jsonb"`
	PackageId string                 `pg:"package_id, type:varchar"`
	Date      time.Time              `pg:"date, type:varchar"`
	UserId    string                 `pg:"user_id, type:timestamp without time zone"`
}

type EnrichedActivityTrackingEntity_deprecated struct {
	tableName struct{} `pg:"select:activity_tracking,alias:at"`

	ActivityTrackingEntity
	PackageName       string `pg:"pkg_name, type:varchar"`
	PackageKind       string `pg:"pkg_kind, type:varchar"`
	UserName          string `pg:"usr_name, type:varchar"`
	NotLatestRevision bool   `pg:"not_latest_revision, type:bool"`
}

type EnrichedActivityTrackingEntity struct {
	tableName struct{} `pg:"select:activity_tracking,alias:at"`

	ActivityTrackingEntity
	PrincipalEntity
	PackageName       string `pg:"pkg_name, type:varchar"`
	PackageKind       string `pg:"pkg_kind, type:varchar"`
	NotLatestRevision bool   `pg:"not_latest_revision, type:bool"`
}

func MakeActivityTrackingEventEntity(event view.ActivityTrackingEvent) ActivityTrackingEntity {
	return ActivityTrackingEntity{
		Id:        uuid.New().String(),
		Type:      string(event.Type),
		Data:      event.Data,
		PackageId: event.PackageId,
		Date:      event.Date,
		UserId:    event.UserId,
	}
}

func MakeActivityTrackingEventView_depracated(ent EnrichedActivityTrackingEntity_deprecated) view.PkgActivityResponseItem_depracated {
	return view.PkgActivityResponseItem_depracated{
		PackageName: ent.PackageName,
		PackageKind: ent.PackageKind,
		UserName:    ent.UserName,
		ActivityTrackingEvent: view.ActivityTrackingEvent{
			Type:      view.ATEventType(ent.Type),
			Data:      ent.Data,
			PackageId: ent.PackageId,
			Date:      ent.Date,
			UserId:    ent.UserId,
		},
	}

}
func MakeActivityTrackingEventView(ent EnrichedActivityTrackingEntity) view.PkgActivityResponseItem {
	return view.PkgActivityResponseItem{
		PackageName: ent.PackageName,
		PackageKind: ent.PackageKind,
		Principal:   *MakePrincipalView(&ent.PrincipalEntity),
		ActivityTrackingEvent: view.ActivityTrackingEvent{
			Type:      view.ATEventType(ent.Type),
			Data:      ent.Data,
			PackageId: ent.PackageId,
			Date:      ent.Date,
			UserId:    ent.UserId,
		},
	}
}
