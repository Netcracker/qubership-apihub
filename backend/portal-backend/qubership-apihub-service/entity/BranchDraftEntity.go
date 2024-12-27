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

type BranchDraftEntity struct {
	tableName struct{} `pg:"drafted_branches"`

	ProjectId      string   `pg:"project_id, pk, type:varchar"`
	BranchName     string   `pg:"branch_name, pk, type:varchar"`
	ChangeType     string   `pg:"change_type, type:varchar"`
	OriginalConfig []byte   `pg:"original_config, type:bytea"`
	Editors        []string `pg:"editors, array, type:varchar[]"`
	CommitId       string   `pg:"commit_id, type:varchar"`
}
