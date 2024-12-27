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

import "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

type BusinessMetricEntity struct {
	Date      string `pg:"date, type:varchar"`
	PackageId string `pg:"package_id, type:varchar"`
	Metric    string `pg:"metric, type:varchar"`
	Username  string `pg:"username, type:varchar"`
	Value     int    `pg:"value, type:integer"`
}

func MakeBusinessMetricView(ent BusinessMetricEntity) view.BusinessMetric {
	return view.BusinessMetric{
		Date:      ent.Date,
		PackageId: ent.PackageId,
		Username:  ent.Username,
		Metric:    ent.Metric,
		Value:     ent.Value,
	}
}
