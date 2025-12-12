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
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

// CalculateNearestCompletedReleaseVersion calculates the nearest completed release version
func CalculateNearestCompletedReleaseVersion() string {
	t := time.Now()
	year := t.Year()
	month := int(t.Month())

	// Calculate current quarter (1..4)
	currentQuarter := (month-1)/3 + 1

	// Move to previous quarter
	prevQuarter := currentQuarter - 1
	if prevQuarter == 0 {
		prevQuarter = 4
		year -= 1
	}

	return fmt.Sprintf("%d.%d", year, prevQuarter)
}

// convertPackagesToMCP filters and converts Packages to PackagesMCP
// Removes packages with packageId containing ".RUNENV." and excludes defaultRole, permissions, releaseVersionPattern, createdAt, IsFavorite, ImageUrl, DeletedAt fields
func convertPackagesToMCP(packages *view.Packages) *view.PackagesMCP {
	if packages == nil {
		return &view.PackagesMCP{Packages: []view.PackagesInfoMCP{}}
	}

	// Filter out packages with packageId containing ".RUNENV."
	filtered := make([]view.PackagesInfo, 0, len(packages.Packages))
	for _, pkg := range packages.Packages {
		if !strings.Contains(pkg.Id, ".RUNENV.") {
			filtered = append(filtered, pkg)
		}
	}

	// Convert to PackagesInfoMCP (excluding defaultRole, permissions, releaseVersionPattern, createdAt, IsFavorite, ImageUrl, DeletedAt)
	converted := make([]view.PackagesInfoMCP, len(filtered))
	for i, pkg := range filtered {
		converted[i] = view.PackagesInfoMCP{
			Id:                        pkg.Id,
			Alias:                     pkg.Alias,
			ParentId:                  pkg.ParentId,
			Kind:                      pkg.Kind,
			Name:                      pkg.Name,
			Description:               pkg.Description,
			ServiceName:               pkg.ServiceName,
			Parents:                   pkg.Parents,
			LastReleaseVersionDetails: pkg.LastReleaseVersionDetails,
			RestGroupingPrefix:        pkg.RestGroupingPrefix,
		}
	}

	return &view.PackagesMCP{Packages: converted}
}

// transformOperations transforms view.RestOperationSearchResult to TransformedOperation
func transformOperations(items []view.RestOperationSearchResult) []view.TransformedOperation {
	transformed := make([]view.TransformedOperation, len(items))

	for i, item := range items {
		transformed[i] = view.TransformedOperation{
			OperationId: item.OperationId,
			ApiKind:     item.ApiKind,
			ApiType:     item.ApiType,
			ApiAudience: item.ApiAudience,
			Path:        item.Path,
			Method:      item.Method,
			PackageId:   item.PackageId,
			PackageName: item.PackageName,
			Version:     item.Version,
			Title:       item.Title,
		}
	}

	return transformed
}
