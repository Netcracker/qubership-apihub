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

package utils

import "strings"

func GetPackageWorkspaceId(packageId string) string {
	return strings.SplitN(packageId, ".", 2)[0]
}

func GetPackageHierarchy(packageId string) []string {
	packageIds := GetParentPackageIds(packageId)
	packageIds = append(packageIds, packageId)
	return packageIds
}

func GetParentPackageIds(packageId string) []string {
	parts := strings.Split(packageId, ".")
	packageIds := make([]string, 0)
	if len(parts) == 0 || len(parts) == 1 {
		return packageIds
	}
	for i, part := range parts {
		if i == 0 {
			packageIds = append(packageIds, part)
			continue
		}
		if i == (len(parts) - 1) {
			break
		}
		packageIds = append(packageIds, packageIds[i-1]+"."+part)
	}
	return packageIds
}
