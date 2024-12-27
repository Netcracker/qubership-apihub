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
	"time"
)

type ApihubApiKey_deprecated struct {
	Id        string     `json:"id"`
	PackageId string     `json:"packageId"`
	Name      string     `json:"name"`
	CreatedBy string     `json:"createdBy"`
	CreatedAt time.Time  `json:"createdAt"`
	DeletedBy string     `json:"deletedBy,omitempty"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
	ApiKey    string     `json:"apiKey,omitempty"`
	Roles     []string   `json:"roles"`
}

type ApihubApiKeys_deprecated struct {
	ApiKeys []ApihubApiKey_deprecated `json:"apiKeys"`
}

type ApihubApiKey_v3_deprecated struct {
	Id        string     `json:"id"`
	PackageId string     `json:"packageId"`
	Name      string     `json:"name"`
	CreatedBy User       `json:"createdBy"`
	CreatedAt time.Time  `json:"createdAt"`
	DeletedBy string     `json:"deletedBy,omitempty"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
	ApiKey    string     `json:"apiKey,omitempty"`
	Roles     []string   `json:"roles"`
}

type ApihubApiKeys_v3_deprecated struct {
	ApiKeys []ApihubApiKey_v3_deprecated `json:"apiKeys"`
}

type ApihubApiKey struct {
	Id         string     `json:"id"`
	PackageId  string     `json:"packageId"`
	Name       string     `json:"name"`
	CreatedBy  User       `json:"createdBy"`
	CreatedFor *User      `json:"createdFor,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	DeletedBy  string     `json:"deletedBy,omitempty"`
	DeletedAt  *time.Time `json:"deletedAt,omitempty"`
	ApiKey     string     `json:"apiKey,omitempty"`
	Roles      []string   `json:"roles"`
}

type ApihubApiKeys struct {
	ApiKeys []ApihubApiKey `json:"apiKeys"`
}

type ApihubApiKeyCreateReq_deprecated struct {
	Name  string   `json:"name" validate:"required"`
	Roles []string `json:"roles"`
}

type ApihubApiKeyCreateReq struct {
	Name       string   `json:"name" validate:"required"`
	CreatedFor string   `json:"createdFor"`
	Roles      []string `json:"roles"`
}

type ApihubApiKeyExtAuthView struct {
	Id        string   `json:"id"`
	PackageId string   `json:"packageId"`
	Name      string   `json:"name"`
	Revoked   bool     `json:"revoked"`
	Roles     []string `json:"roles"`
}
