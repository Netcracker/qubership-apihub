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

type Branch struct {
	ProjectId    string     `json:"projectId" msgpack:"projectId"`
	Editors      []User     `json:"editors" msgpack:"editors"`
	ConfigFileId string     `json:"configFileId,omitempty" msgpack:"configFileId,omitempty"`
	ChangeType   ChangeType `json:"changeType,omitempty" msgpack:"changeType,omitempty"`
	Permissions  *[]string  `json:"permissions,omitempty" msgpack:"permissions,omitempty"` //show only when permissions are calculated
	Files        []Content  `json:"files" validate:"dive,required" msgpack:"files"`
	Refs         []Ref      `json:"refs" msgpack:"refs"`
}

type BranchGitConfigView struct {
	ProjectId string                 `json:"projectId"`
	Files     []ContentGitConfigView `json:"files"`
	Refs      []RefGitConfigView     `json:"refs"`
}

type Branches struct {
	Branches []Branch `json:"branches"`
}

func (b *Branch) RemoveFolders() {
	onlyFiles := make([]Content, 0)
	for _, content := range b.Files {
		if !content.IsFolder {
			onlyFiles = append(onlyFiles, content)
		}
	}
	b.Files = onlyFiles
}

func TransformBranchToGitView(branch Branch) *BranchGitConfigView {
	resFiles := make([]ContentGitConfigView, 0)
	resRefs := make([]RefGitConfigView, 0)

	for _, f := range branch.Files {
		if f.FromFolder {
			continue
		}
		if f.IsFolder {
			f.Publish = false
			f.Labels = []string{}
		}
		resFiles = append(resFiles, TransformContentToGitView(f))
	}

	for _, r := range branch.Refs {
		resRefs = append(resRefs, TransformRefToGitView(r))
	}

	return &BranchGitConfigView{
		ProjectId: branch.ProjectId,
		Files:     resFiles,
		Refs:      resRefs,
	}
}

func TransformGitToBranchView(branch *BranchGitConfigView, refs []Ref) *Branch {

	resContent := make([]Content, 0)
	for _, file := range branch.Files {
		resContent = append(resContent, TransformGitViewToContent(file))
	}

	if refs == nil {
		refs = make([]Ref, 0)
	}

	return &Branch{
		ProjectId: branch.ProjectId,
		Files:     resContent,
		Refs:      refs,
	}
}
