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

type Ref struct {
	RefPackageId      string     `json:"refId" msgpack:"refId"`
	RefPackageName    string     `json:"name" msgpack:"name"`
	RefPackageVersion string     `json:"version" msgpack:"version"`
	Status            FileStatus `json:"status" msgpack:"status"`
	VersionStatus     string     `json:"versionStatus" msgpack:"versionStatus"`
	Kind              string     `json:"kind" msgpack:"kind"`
	IsBroken          bool       `json:"isBroken" msgpack:"isBroken"` //TODO: Need to support all over the system
}

type RefGitConfigView struct {
	RefPackageId string `json:"refId"`
	Version      string `json:"version"`
}

func TransformRefToGitView(ref Ref) RefGitConfigView {
	return RefGitConfigView{
		RefPackageId: ref.RefPackageId,
		Version:      ref.RefPackageVersion,
	}
}

func TransformGitViewToRef(ref RefGitConfigView, refPackageName string, status string, kind string) Ref {
	return Ref{
		RefPackageId:      ref.RefPackageId,
		RefPackageName:    refPackageName,
		RefPackageVersion: ref.Version,
		Status:            StatusUnmodified,
		VersionStatus:     status,
		Kind:              kind,
	}
}

func (r *Ref) EqualsGitView(r2 *Ref) bool {
	return r.RefPackageId == r2.RefPackageId && r.RefPackageVersion == r2.RefPackageVersion
}
