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
	"encoding/json"
	"reflect"
)

func (s Metadata) GetChanges(t Metadata) map[string]interface{} {
	changes := make(map[string]interface{}, 0)
	for key, sVal := range s {
		if key == BUILDER_VERSION_KEY {
			continue
		}
		tVal, exists := t[key]
		if !exists {
			changes[key] = map[string]interface{}{
				"old": sVal,
			}
			continue
		}
		//custom []string array handling
		if sArrVal, ok := sVal.([]interface{}); ok {
			equal := true
			if tArrVal, ok := tVal.([]string); ok {
				if len(sArrVal) == len(tArrVal) {
					for i, sEl := range sArrVal {
						if sStrVal, isStr := sEl.(string); isStr {
							if tArrVal[i] != sStrVal {
								equal = false
								break
							}
						} else {
							equal = false
							break
						}
					}
				} else {
					equal = false
				}
			} else {
				equal = false
			}
			if equal {
				continue
			}
		}
		if !reflect.DeepEqual(sVal, tVal) {
			changes[key] = map[string]interface{}{
				"old": sVal,
				"new": tVal,
			}
		}
	}
	return changes
}

func (s PublishedVersionEntity) GetChanges(t PublishedVersionEntity) map[string]interface{} {
	changes := make(map[string]interface{}, 0)
	if s.PreviousVersion != t.PreviousVersion {
		changes["PreviousVersion"] = map[string]interface{}{
			"old": s.PreviousVersion,
			"new": t.PreviousVersion,
		}
	}
	if s.PreviousVersionPackageId != t.PreviousVersionPackageId {
		changes["PreviousVersionPackageId"] = map[string]interface{}{
			"old": s.PreviousVersionPackageId,
			"new": t.PreviousVersionPackageId,
		}
	}
	if s.Status != t.Status {
		changes["Status"] = map[string]interface{}{
			"old": s.Status,
			"new": t.Status,
		}
	}
	if s.PublishedAt != t.PublishedAt {
		changes["PublishedAt"] = map[string]interface{}{
			"old": s.PublishedAt,
			"new": t.PublishedAt,
		}
	}
	if s.DeletedAt != t.DeletedAt {
		changes["DeletedAt"] = map[string]interface{}{
			"old": s.DeletedAt,
			"new": t.DeletedAt,
		}
	}
	if s.DeletedBy != t.DeletedBy {
		changes["DeletedBy"] = map[string]interface{}{
			"old": s.DeletedBy,
			"new": t.DeletedBy,
		}
	}
	if metadataChanges := s.Metadata.GetChanges(t.Metadata); len(metadataChanges) > 0 {
		changes["Metadata"] = metadataChanges
	}
	if (len(s.Labels) != 0 || len(t.Labels) != 0) &&
		!reflect.DeepEqual(s.Labels, t.Labels) {
		changes["Labels"] = map[string]interface{}{
			"old": s.Labels,
			"new": t.Labels,
		}
	}
	if s.CreatedBy != t.CreatedBy {
		changes["CreatedBy"] = map[string]interface{}{
			"old": s.CreatedBy,
			"new": t.CreatedBy,
		}
	}
	return changes
}

func (s PublishedContentEntity) GetChanges(t PublishedContentEntity) map[string]interface{} {
	changes := make(map[string]interface{}, 0)
	if s.Checksum != t.Checksum {
		changes["Checksum"] = map[string]interface{}{
			"old": s.Checksum,
			"new": t.Checksum,
		}
	}
	if s.Index != t.Index {
		changes["Index"] = map[string]interface{}{
			"old": s.Index,
			"new": t.Index,
		}
	}
	if s.Slug != t.Slug {
		changes["Slug"] = map[string]interface{}{
			"old": s.Slug,
			"new": t.Slug,
		}
	}
	if s.Name != t.Name {
		changes["Name"] = map[string]interface{}{
			"old": s.Name,
			"new": t.Name,
		}
	}
	if s.Path != t.Path {
		changes["Path"] = map[string]interface{}{
			"old": s.Path,
			"new": t.Path,
		}
	}
	if s.DataType != t.DataType {
		changes["DataType"] = map[string]interface{}{
			"old": s.DataType,
			"new": t.DataType,
		}
	}
	if s.Format != t.Format {
		changes["Format"] = map[string]interface{}{
			"old": s.Format,
			"new": t.Format,
		}
	}
	if s.Title != t.Title {
		changes["Title"] = map[string]interface{}{
			"old": s.Title,
			"new": t.Title,
		}
	}
	if metadataChanges := s.Metadata.GetChanges(t.Metadata); len(metadataChanges) > 0 {
		changes["Metadata"] = metadataChanges
	}
	if (len(s.OperationIds) != 0 || len(t.OperationIds) != 0) &&
		!reflect.DeepEqual(s.OperationIds, t.OperationIds) {
		changes["OperationIds"] = map[string]interface{}{
			"old": s.OperationIds,
			"new": t.OperationIds,
		}
	}
	if s.ReferenceId != t.ReferenceId {
		changes["ReferenceId"] = map[string]interface{}{
			"old": s.ReferenceId,
			"new": t.ReferenceId,
		}
	}
	if s.Filename != t.Filename {
		changes["Filename"] = map[string]interface{}{
			"old": s.Filename,
			"new": t.Filename,
		}
	}
	return changes
}

func (s PublishedReferenceEntity) GetChanges(t PublishedReferenceEntity) map[string]interface{} {
	changes := make(map[string]interface{}, 0)
	if s.Excluded != t.Excluded {
		changes["Excluded"] = map[string]interface{}{
			"old": s.Excluded,
			"new": t.Excluded,
		}
	}
	return changes
}

func (s PublishedSrcEntity) GetChanges(t PublishedSrcEntity) map[string]interface{} {
	changes := make(map[string]interface{}, 0)
	if s.ArchiveChecksum != t.ArchiveChecksum {
		changes["ArchiveChecksum"] = map[string]interface{}{
			"old": s.ArchiveChecksum,
			"new": t.ArchiveChecksum,
		}
	}
	return changes
}

func (s OperationEntity) GetChanges(t OperationEntity) map[string]interface{} {
	changes := make(map[string]interface{}, 0)
	if s.DataHash != t.DataHash {
		changes["DataHash"] = map[string]interface{}{
			"old": s.DataHash,
			"new": t.DataHash,
		}
	}
	if s.Kind != t.Kind {
		changes["Kind"] = map[string]interface{}{
			"old": s.Kind,
			"new": t.Kind,
		}
	}
	if s.Title != t.Title {
		changes["Title"] = map[string]interface{}{
			"old": s.Title,
			"new": t.Title,
		}
	}
	if metadataChanges := s.Metadata.GetChanges(t.Metadata); len(metadataChanges) > 0 {
		changes["Metadata"] = metadataChanges
	}
	if s.Type != t.Type {
		changes["Type"] = map[string]interface{}{
			"old": s.Type,
			"new": t.Type,
		}
	}
	// if (len(s.DeprecatedItems) != 0 || len(t.DeprecatedItems) != 0) &&
	// 	!reflect.DeepEqual(s.DeprecatedItems, t.DeprecatedItems) {
	// 	changes["DeprecatedItems"] = "DeprecatedItems field has changed"
	// }
	if (len(s.DeprecatedInfo) != 0 || len(t.DeprecatedInfo) != 0) &&
		!reflect.DeepEqual(s.DeprecatedInfo, t.DeprecatedInfo) {
		changes["DeprecatedInfo"] = "DeprecatedInfo field has changed"
	}
	if (len(s.PreviousReleaseVersions) != 0 || len(t.PreviousReleaseVersions) != 0) &&
		!reflect.DeepEqual(s.PreviousReleaseVersions, t.PreviousReleaseVersions) {
		changes["PreviousReleaseVersions"] = map[string]interface{}{
			"old": s.PreviousReleaseVersions,
			"new": t.PreviousReleaseVersions,
		}
	}
	if (len(s.Models) != 0 || len(t.Models) != 0) &&
		!reflect.DeepEqual(s.Models, t.Models) {
		changes["Models"] = map[string]interface{}{
			"old": s.Models,
			"new": t.Models,
		}
	}
	if (len(s.CustomTags) != 0 || len(t.CustomTags) != 0) &&
		!reflect.DeepEqual(s.CustomTags, t.CustomTags) {
		changes["CustomTags"] = map[string]interface{}{
			"old": s.CustomTags,
			"new": t.CustomTags,
		}
	}
	if s.ApiAudience != t.ApiAudience {
		changes["ApiAudience"] = map[string]interface{}{
			"old": s.ApiAudience,
			"new": t.ApiAudience,
		}
	}
	return changes
}

func (s OperationDataEntity) GetChanges(t OperationDataEntity) map[string]interface{} {
	changes := make(map[string]interface{}, 0)
	searchScopeChanged := false
	if len(s.SearchScope) != 0 || len(t.SearchScope) != 0 {
		for sKey, sVal := range s.SearchScope {
			if tVal, exists := t.SearchScope[sKey]; exists {
				if sValStr, isSValStr := sVal.(string); isSValStr {
					if tValStr, isTValStr := tVal.(string); isTValStr {
						if sValStr != tValStr {
							searchScopeChanged = true
							break
						}
					} else {
						searchScopeChanged = true
						break
					}
				} else {
					if !reflect.DeepEqual(sVal, tVal) {
						searchScopeChanged = true
						break
					}
				}
			} else {
				searchScopeChanged = true
				break
			}
		}
	}
	if searchScopeChanged {
		// CreateVersionWithData operation_data insert depends on this value (for migration only)
		changes["SearchScope"] = "SearchScope field has changed"
	}
	return changes
}

func (s VersionComparisonEntity) GetChanges(t VersionComparisonEntity) map[string]interface{} {
	changes := make(map[string]interface{}, 0)
	if (len(s.Refs) != 0 || len(t.Refs) != 0) &&
		!reflect.DeepEqual(s.Refs, t.Refs) {
		changes["Refs"] = map[string]interface{}{
			"old": s.Refs,
			"new": t.Refs,
		}
	}
	matchedOperationTypes := make(map[string]struct{}, 0)
	for _, sOperationType := range s.OperationTypes {
		found := false
		for _, tOperationType := range t.OperationTypes {
			if sOperationType.ApiType == tOperationType.ApiType {
				operationTypeChanges := make(map[string]interface{}, 0)
				found = true
				matchedOperationTypes[sOperationType.ApiType] = struct{}{}
				if sOperationType.ChangesSummary.GetTotalSummary() != tOperationType.ChangesSummary.GetTotalSummary() {
					operationTypeChanges["TotalChangesSummary"] = map[string]interface{}{
						"old": sOperationType.ChangesSummary.GetTotalSummary(),
						"new": tOperationType.ChangesSummary.GetTotalSummary(),
					}
				}
				if sOperationType.NumberOfImpactedOperations.GetTotalSummary() != tOperationType.NumberOfImpactedOperations.GetTotalSummary() {
					operationTypeChanges["TotalNumberOfImpactedOperations"] = map[string]interface{}{
						"old": sOperationType.NumberOfImpactedOperations.GetTotalSummary(),
						"new": tOperationType.NumberOfImpactedOperations.GetTotalSummary(),
					}
				}
				if !reflect.DeepEqual(sOperationType.ChangesSummary, tOperationType.ChangesSummary) {
					operationTypeChanges["ChangesSummary"] = map[string]interface{}{
						"old": sOperationType.ChangesSummary,
						"new": tOperationType.ChangesSummary,
					}
				}
				if !reflect.DeepEqual(sOperationType.NumberOfImpactedOperations, tOperationType.NumberOfImpactedOperations) {
					operationTypeChanges["NumberOfImpactedOperations"] = map[string]interface{}{
						"old": sOperationType.NumberOfImpactedOperations,
						"new": tOperationType.NumberOfImpactedOperations,
					}
				}
				if (len(sOperationType.Tags) != 0 || len(tOperationType.Tags) != 0) &&
					!reflect.DeepEqual(sOperationType.Tags, tOperationType.Tags) {
					operationTypeChanges["Tags"] = map[string]interface{}{
						"old": sOperationType.Tags,
						"new": tOperationType.Tags,
					}
				}
				if (len(sOperationType.ApiAudienceTransitions) != 0 || len(tOperationType.ApiAudienceTransitions) != 0) &&
					!reflect.DeepEqual(sOperationType.ApiAudienceTransitions, tOperationType.ApiAudienceTransitions) {
					changes["ApiAudienceTransitions"] = map[string]interface{}{
						"old": sOperationType.ApiAudienceTransitions,
						"new": tOperationType.ApiAudienceTransitions,
					}
				}
				if len(operationTypeChanges) > 0 {
					changes[sOperationType.ApiType] = operationTypeChanges
				}
			}
		}
		if !found {
			changes[sOperationType.ApiType] = "comparison operation type not found in build archive"
		}
	}
	for _, tOperationType := range t.OperationTypes {
		if _, matched := matchedOperationTypes[tOperationType.ApiType]; !matched {
			changes[tOperationType.ApiType] = "unexpected comparison operation type (not found in database)"
		}
	}
	return changes
}

func (s OperationComparisonEntity) GetChanges(t OperationComparisonEntity) map[string]interface{} {
	changes := make(map[string]interface{}, 0)
	if s.DataHash != t.DataHash {
		changes["DataHash"] = map[string]interface{}{
			"old": s.DataHash,
			"new": t.DataHash,
		}
	}
	if s.PreviousDataHash != t.PreviousDataHash {
		changes["PreviousDataHash"] = map[string]interface{}{
			"old": s.PreviousDataHash,
			"new": t.PreviousDataHash,
		}
	}
	if s.ChangesSummary.GetTotalSummary() != t.ChangesSummary.GetTotalSummary() {
		changes["TotalChangesSummary"] = map[string]interface{}{
			"old": s.ChangesSummary.GetTotalSummary(),
			"new": t.ChangesSummary.GetTotalSummary(),
		}
	}
	if !reflect.DeepEqual(s.ChangesSummary, t.ChangesSummary) {
		changes["ChangesSummary"] = map[string]interface{}{
			"old": s.ChangesSummary,
			"new": t.ChangesSummary,
		}
	}

	if len(s.Changes) != 0 || len(t.Changes) != 0 {
		sChanges := s.Changes
		var tChanges map[string]interface{}
		inrec, _ := json.Marshal(t.Changes)
		json.Unmarshal(inrec, &tChanges)
		if !reflect.DeepEqual(sChanges, tChanges) {
			changes["Changes"] = "Changes field has changed"
		}
	}

	return changes
}
