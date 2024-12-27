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

package tests

import (
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

func TestValidateObjectErrors(t *testing.T) {
	var updateOperationGroupReqNil view.UpdateOperationGroupReq
	var groupOperationsNil *[]view.GroupOperations = nil
	updateOperationGroupReqNil.Operations = groupOperationsNil
	updateOperationGroupReqExpectedErrorNil := "Required parameters are missing: [0]operations.operationId, [1]operations.operationId"
	if err := utils.ValidateObject(updateOperationGroupReqNil); err != nil {
		if updateOperationGroupReqExpectedErrorNil != err.Error() {
			t.Fatalf("UpdateOperationGroupReq Validation errors test is failed. Actual error: %v", err.Error())
		}
	}

	var updateOperationGroupReq view.UpdateOperationGroupReq
	var groupOperations = make([]view.GroupOperations, 2)
	updateOperationGroupReq.Operations = &groupOperations
	updateOperationGroupReqExpectedError := "Required parameters are missing: operations[0].operationId, operations[1].operationId"
	if err := utils.ValidateObject(updateOperationGroupReq); err != nil {
		if updateOperationGroupReqExpectedError != err.Error() {
			t.Fatalf("UpdateOperationGroupReq Validation errors test is failed. Actual error: %v", err.Error())
		}
	}

	var packageOperationsFile view.PackageOperationsFile
	var operations = make([]view.Operation, 2)
	packageOperationsFile.Operations = operations
	packageOperationsFileExpectedError := "Required parameters are missing: operations[0].operationId, operations[0].title, operations[0].apiType, operations[0].dataHash, operations[0].apiKind, operations[0].metadata, operations[0].searchScopes, operations[0].apiAudience, operations[1].operationId, operations[1].title, operations[1].apiType, operations[1].dataHash, operations[1].apiKind, operations[1].metadata, operations[1].searchScopes, operations[1].apiAudience"
	if err := utils.ValidateObject(packageOperationsFile); err != nil {
		if packageOperationsFileExpectedError != err.Error() {
			t.Fatalf("Package Operations File Validation errors test is failed. Actual error: %v", err.Error())
		}
	}

	var packageInfoFile view.PackageInfoFile
	info := view.MakeChangelogInfoFileView(packageInfoFile)
	packageInfoFileExpectedError := "Required parameters are missing: packageId, version, previousVersionPackageId, previousVersion"
	if err := utils.ValidateObject(info); err != nil {
		if packageInfoFileExpectedError != err.Error() {
			t.Fatalf("Package Info File Validation errors test is failed. Actual error: %v", err.Error())
		}
	}

	var packageComparisonsFile view.PackageComparisonsFile
	var versionComparison = make([]view.VersionComparison, 2)
	var operationTypes = make([]view.OperationType, 2)
	versionComparison[0].OperationTypes = operationTypes
	versionComparison[1].OperationTypes = operationTypes
	packageComparisonsFile.Comparisons = versionComparison
	packageComparisonsFileExpectedError := "Required parameters are missing: comparisons[0].operationTypes[0].apiType, comparisons[0].operationTypes[1].apiType, comparisons[1].operationTypes[0].apiType, comparisons[1].operationTypes[1].apiType"
	if err := utils.ValidateObject(packageComparisonsFile); err != nil {
		if packageComparisonsFileExpectedError != err.Error() {
			t.Fatalf("Package Comparisons File Validation errors test is failed. Actual error: %v", err.Error())
		}
	}

	var builderNotificationsFile view.BuilderNotificationsFile
	var builderNotification = make([]view.BuilderNotification, 2)
	builderNotificationsFile.Notifications = builderNotification
	//no required params. empty error expected
	builderNotificationsFileExpectedError := ""
	if err := utils.ValidateObject(builderNotificationsFile); err != nil {
		if builderNotificationsFileExpectedError != err.Error() {
			t.Fatalf("Builder Notifications File Validation errors test is failed. Actual error: %v", err.Error())
		}
	}

	var packageDocumentsFile view.PackageDocumentsFile
	var packageDocument = make([]view.PackageDocument, 2)
	packageDocumentsFile.Documents = packageDocument
	packageDocumentsFileExpectedError := "Required parameters are missing: documents[0].fileId, documents[0].type, documents[0].slug, documents[0].title, documents[0].operationIds, documents[0].filename, documents[1].fileId, documents[1].type, documents[1].slug, documents[1].title, documents[1].operationIds, documents[1].filename"
	if err := utils.ValidateObject(packageDocumentsFile); err != nil {
		if packageDocumentsFileExpectedError != err.Error() {
			t.Fatalf("Package Documents File Validation errors test is failed. Actual error: %v", err.Error())
		}
	}

}
