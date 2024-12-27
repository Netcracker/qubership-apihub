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

package client

import (
	"io"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"golang.org/x/net/context"
)

type GitClient interface {
	GetRepoNameAndUrl(ctx context.Context, projectId string) (string, string, error)
	SearchRepositories(ctx context.Context, search string, limit int) ([]view.GitRepository, []view.GitGroup, error)
	GetRepoBranches(ctx context.Context, id string, search string, limit int) ([]string, []bool, error)
	BranchExists(ctx context.Context, id string, branchName string) (bool, bool, error)
	ListDirectory(ctx context.Context, projectId string, branchName string, path string, pagingParams view.PagingParams, existingFiles map[string]bool, existingFolders []string) ([]view.FileNode, error)
	ListDirectoryFilesRecursive(ctx context.Context, projectId string, branchName string, path string) ([]string, error)
	GetFileContent(ctx context.Context, projectId string, ref string, filePath string) ([]byte, string, string, error)
	GetFileContentByBlobId(ctx context.Context, projectId string, blobId string) ([]byte, string, error)
	FileExists(ctx context.Context, projectId string, branchName string, filePath string) (bool, error)
	GetCommitsList(ctx context.Context, projectId string, branchName string, path string) ([]view.GitCommit, error)
	GetFileBlobId(ctx context.Context, projectId string, branchName string, path string) (string, error)
	GetBranchLastCommitId(ctx context.Context, projectId string, branchName string) (string, error)
	CommitChanges(ctx context.Context, projectId string, branchName string, newBranchName string, message string, changes []Action) error
	CloneBranch(ctx context.Context, projectId string, branchName string, newBranchName string) error
	CreateMergeRequest(ctx context.Context, projectId string, sourceBranchName string, targetBranchName string, title string, description string) (string, error)
	DeleteBranch(ctx context.Context, projectId string, branchName string) error
	GetCurrentUserInfo(ctx context.Context, login string) (*view.User, error)
	GetRepoTags(ctx context.Context, projectId string, search string, limit int) ([]string, error)
	TagExists(ctx context.Context, id string, tag string) (bool, error)
	BranchOrTagExists(ctx context.Context, id string, branchName string) (bool, bool, error)
	GetTagLastCommitId(ctx context.Context, projectId string, tagName string) (string, error)
	GetBranchOrTagLastCommitId(ctx context.Context, projectId string, branchName string) (string, error)
	WriteCommitArchive(ctx context.Context, projectId string, commitId string, writer io.Writer, format string) error
}
