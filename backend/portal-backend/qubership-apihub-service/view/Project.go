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

import "time"

type Project struct {
	Id           string          `json:"projectId"`
	GroupId      string          `json:"groupId" validate:"required"`
	Name         string          `json:"name" validate:"required"`
	Alias        string          `json:"alias" validate:"required"` // short alias
	Description  string          `json:"description"`
	IsFavorite   bool            `json:"isFavorite"`
	Integration  IntegrationView `json:"integration"`
	Groups       []Group         `json:"groups"`
	DeletionDate *time.Time      `json:"-"`
	DeletedBy    string          `json:"-"`
	LastVersion  string          `json:"lastVersion,omitempty"`

	PackageId string `json:"packageId"`
}

type IntegrationView struct {
	Type           GitIntegrationType `json:"type" validate:"required"`
	RepositoryId   string             `json:"repositoryId" validate:"required"`
	RepositoryName string             `json:"repositoryName"`
	RepositoryUrl  string             `json:"repositoryUrl"`
	DefaultBranch  string             `json:"defaultBranch" validate:"required"`
	DefaultFolder  string             `json:"defaultFolder" validate:"required"`
}

type Projects struct {
	Projects []Project `json:"projects"`
}

type GitLabWebhookIntegration struct {
	SecretToken string `json:"secretToken" validate:"required"`
}
