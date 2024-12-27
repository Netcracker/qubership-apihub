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
	"fmt"
	"time"
)

const COMMIT_ID_KEY = "commit_id"
const BLOB_ID_KEY = "blob_id"
const COMMIT_DATE_KEY = "commit_date"
const BRANCH_NAME_KEY = "branch_name"
const LABELS_KEY = "labels"
const REPOSITORY_URL_KEY = "repository_url"
const TITLE_KEY = "title"
const PATH_KEY = "path"
const METHOD_KEY = "method"
const TAGS_KEY = "tags"
const CLOUD_NAME_KEY = "cloud_name"
const CLOUD_URL_KEY = "cloud_url"
const NAMESPACE_KEY = "namespace"
const DESCRIPTION_KEY = "description"
const BUILDER_VERSION_KEY = "builder_version"
const TYPE_KEY = "type"
const INFO = "info"
const EXTERNAL_DOCS = "external_docs"
const VERSION = "version"
const DOC_TAGS_KEY = "tags"

type Metadata map[string]interface{}

func (m Metadata) GetStringValue(field string) string {
	if fieldValue, ok := m[field].(string); ok {
		return fieldValue
	}
	return ""
}

func (m Metadata) GetIntValue(field string) int {
	//parse as float64 because unmarshal reads json number as float64
	if fieldValue, ok := m[field].(float64); ok {
		return int(fieldValue)
	}
	return 0
}

func (m Metadata) GetObject(field string) interface{} {
	if field, ok := m[field]; ok {
		return field
	}
	return nil
}

func (m Metadata) GetStringArray(field string) []string {
	if values, ok := m[field].([]interface{}); ok {
		var valuesArr []string
		for _, l := range values {
			if strL, ok := l.(string); ok {
				valuesArr = append(valuesArr, strL)
			}
		}
		return valuesArr
	}
	return make([]string, 0)
}

func (m Metadata) GetObjectArray(field string) ([]interface{}, error) {
	if val, ok := m[field]; ok {
		if values, ok := val.([]interface{}); ok {
			return values, nil
		} else {
			return nil, fmt.Errorf("incorrect metadata value type, expecting array of objects, value: %+v", val)
		}
	}
	return make([]interface{}, 0), nil
}

func (m Metadata) GetMapStringToInterface(field string) (map[string]interface{}, error) {
	if val, ok := m[field]; ok {
		if values, ok := val.(map[string]interface{}); ok {
			return values, nil
		} else {
			return nil, fmt.Errorf("incorrect metadata value type, expecting map string to interface, value: %+v", val)
		}
	}
	return make(map[string]interface{}), nil
}

func (m Metadata) SetCommitId(commitId string) {
	m[COMMIT_ID_KEY] = commitId
}

func (m Metadata) GetCommitId() string {
	if commitId, ok := m[COMMIT_ID_KEY].(string); ok {
		return commitId
	}
	return ""
}

func (m Metadata) SetBlobId(blobId string) {
	m[BLOB_ID_KEY] = blobId
}

func (m Metadata) GetBlobId() string {
	if blobId, ok := m[BLOB_ID_KEY].(string); ok {
		return blobId
	}
	return ""
}

func (m Metadata) SetCommitDate(commitDate time.Time) {
	m[COMMIT_DATE_KEY] = commitDate
}

func (m Metadata) GetCommitDate() time.Time {
	if commitDate, ok := m[COMMIT_DATE_KEY].(time.Time); ok {
		return commitDate
	}
	return time.Time{}
}

func (m Metadata) SetBranchName(branchName string) {
	m[BRANCH_NAME_KEY] = branchName
}

func (m Metadata) GetBranchName() string {
	if branchName, ok := m[BRANCH_NAME_KEY].(string); ok {
		return branchName
	}
	return ""
}

func (m Metadata) SetLabels(labels []string) {
	m[LABELS_KEY] = labels
}

func (m Metadata) GetLabels() []string {
	if labels, ok := m[LABELS_KEY].([]interface{}); ok {
		labelsArr := []string{}
		for _, l := range labels {
			labelsArr = append(labelsArr, l.(string))
		}
		return labelsArr
	}
	return make([]string, 0)
}

func (m Metadata) SetRepositoryUrl(repositoryUrl string) {
	m[REPOSITORY_URL_KEY] = repositoryUrl
}

func (m Metadata) GetRepositoryUrl() string {
	if repositoryUrl, ok := m[REPOSITORY_URL_KEY].(string); ok {
		return repositoryUrl
	}
	return ""
}

func (m Metadata) SetTitle(title string) {
	m[TITLE_KEY] = title
}

func (m Metadata) GetTitle() string {
	if title, ok := m[TITLE_KEY].(string); ok {
		return title
	}
	return ""
}

func (m Metadata) SetDescription(description string) {
	m[DESCRIPTION_KEY] = description
}

func (m Metadata) GetDescription() string {
	if description, ok := m[DESCRIPTION_KEY].(string); ok {
		return description
	}
	return ""
}

func (m Metadata) SetPath(path string) {
	m[PATH_KEY] = path
}

func (m Metadata) GetPath() string {
	if path, ok := m[PATH_KEY].(string); ok {
		return path
	}
	return ""
}

func (m Metadata) SetMethod(method string) {
	m[METHOD_KEY] = method
}

func (m Metadata) GetMethod() string {
	if method, ok := m[METHOD_KEY].(string); ok {
		return method
	}
	return ""
}

func (m Metadata) SetTags(tags []string) {
	m[TAGS_KEY] = tags
}

func (m Metadata) GetTags() []string {
	if tags, ok := m[TAGS_KEY].([]interface{}); ok {
		tagsArr := []string{}
		for _, l := range tags {
			tagsArr = append(tagsArr, l.(string))
		}
		return tagsArr
	}
	return make([]string, 0)
}

func (m Metadata) SetCloudName(cloudName string) {
	m[CLOUD_NAME_KEY] = cloudName
}

func (m Metadata) GetCloudName() string {
	if cloudName, ok := m[CLOUD_NAME_KEY].(string); ok {
		return cloudName
	}
	return ""
}
func (m Metadata) SetCloudUrl(cloudUrl string) {
	m[CLOUD_URL_KEY] = cloudUrl
}

func (m Metadata) GetCloudUrl() string {
	if cloudUrl, ok := m[CLOUD_URL_KEY].(string); ok {
		return cloudUrl
	}
	return ""
}

func (m Metadata) SetNamespace(namespace string) {
	m[NAMESPACE_KEY] = namespace
}

func (m Metadata) GetNamespace() string {
	if namespace, ok := m[NAMESPACE_KEY].(string); ok {
		return namespace
	}
	return ""
}

func (m Metadata) SetBuilderVersion(builderVersion string) {
	m[BUILDER_VERSION_KEY] = builderVersion
}

func (m Metadata) GetBuilderVersion() string {
	if builderVersion, ok := m[BUILDER_VERSION_KEY].(string); ok {
		return builderVersion
	}
	return ""
}

func (m Metadata) SetType(typeValue string) {
	m[TYPE_KEY] = typeValue
}

func (m Metadata) GetType() string {
	if typeValue, ok := m[TYPE_KEY].(string); ok {
		return typeValue
	}
	return ""
}

func (m Metadata) SetInfo(info interface{}) {
	m[INFO] = info
}

func (m Metadata) GetInfo() interface{} {
	if info, ok := m[INFO]; ok {
		return info
	}
	return nil
}

func (m Metadata) SetExternalDocs(externalDocs interface{}) {
	m[EXTERNAL_DOCS] = externalDocs
}

func (m Metadata) GetExternalDocs() interface{} {
	if externalDocs, ok := m[EXTERNAL_DOCS]; ok {
		return externalDocs
	}
	return nil
}

func (m Metadata) SetVersion(version string) {
	m[VERSION] = version
}

func (m Metadata) GetVersion() string {
	if version, ok := m[VERSION].(string); ok {
		return version
	}
	return ""
}

func (m Metadata) SetDocTags(tags []interface{}) {
	m[DOC_TAGS_KEY] = tags
}

func (m Metadata) GetDocTags() []interface{} {
	if tags, ok := m[DOC_TAGS_KEY].([]interface{}); ok {
		return tags
	}
	return nil
}

func (m Metadata) MergeMetadata(other Metadata) {
	for k, v := range other {
		m[k] = v
	}
}
