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

package view

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
)

const OperationGroupOperationsLimit = 5000
const OperationGroupActionCreate = "create"
const OperationGroupActionUpdate = "update"
const OperationGroupActionDelete = "delete"

type CreateOperationGroupReq struct {
	GroupName        string `json:"groupName" validate:"required"`
	Description      string `json:"description"`
	Template         []byte `json:"template"`
	TemplateFilename string `json:"templateFilename"`
}

type UpdateOperationGroupReq struct {
	GroupName   *string
	Description *string
	Template    *OperationGroupTemplate
	Operations  *[]GroupOperations `json:"operations" validate:"dive,required"`
}

type OperationGroupTemplate struct {
	TemplateData     []byte
	TemplateFilename string
}

type GroupOperations struct {
	PackageId   string `json:"packageId"`
	Version     string `json:"version"`
	OperationId string `json:"operationId" validate:"required"`
}

type CalculatedOperationGroups struct {
	Groups []string `json:"groups"`
}

func MakeOperationGroupId(packageId string, version string, revision int, apiType string, groupName string) string {
	uniqueString := fmt.Sprintf("%v@%v@%v@%v@%v", packageId, version, revision, apiType, groupName)
	return utils.GetEncodedChecksum([]byte(uniqueString))
}

type OperationGroupPublishReq struct {
	PackageId                string   `json:"packageId" validate:"required"`
	Version                  string   `json:"version" validate:"required"`
	PreviousVersion          string   `json:"previousVersion"`
	PreviousVersionPackageId string   `json:"previousVersionPackageId"`
	Status                   string   `json:"status" validate:"required"`
	VersionLabels            []string `json:"versionLabels"`
}

type OperationGroupPublishResp struct {
	PublishId string `json:"publishId"`
}

type OperationGroupPublishStatusResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}
