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

const typeAndTitleMigrationVersion = 28
const searchTablesMigrationVersion = 35
const filesOperationsMigrationVersion = 57
const groupToDashboardVersion = 100
const personalWorkspaces = 102
const draftBlobIds = 133

// SoftMigrateDb The function implements migrations that can't be made via SQL query.
// Executes only required migrations based on current vs new versions.
func (d dbMigrationServiceImpl) SoftMigrateDb(currentVersion int, newVersion int, migrationRequired bool) error {
	//if (currentVersion < typeAndTitleMigrationVersion && typeAndTitleMigrationVersion <= newVersion) ||
	//	(migrationRequired && typeAndTitleMigrationVersion == currentVersion && typeAndTitleMigrationVersion == newVersion) {
	//	//async migration because it could take a lot of time to execute
	//	utils.SafeAsync(func() {
	//		/* do something */
	//	})
	//}
	return nil
}
