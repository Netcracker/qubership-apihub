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

type Group struct {
	Id          string     `json:"groupId"`
	Name        string     `json:"name" validate:"required"`
	Alias       string     `json:"alias" validate:"required"` // short alias
	ParentId    string     `json:"parentId"`
	ImageUrl    string     `json:"imageUrl"`
	Description string     `json:"description"`
	CreatedBy   string     `json:"-"`
	CreatedAt   time.Time  `json:"-"`
	DeletedAt   *time.Time `json:"-"`
	DeletedBy   string     `json:"-"`
	IsFavorite  bool       `json:"isFavorite"`
	LastVersion string     `json:"lastVersion,omitempty"` // Required only for group list
}

type GroupInfo struct {
	GroupId     string  `json:"groupId"`
	ParentId    string  `json:"parentId"`
	Name        string  `json:"name"`
	Alias       string  `json:"alias"` // short alias
	ImageUrl    string  `json:"imageUrl"`
	Parents     []Group `json:"parents"`
	IsFavorite  bool    `json:"isFavorite"`
	LastVersion string  `json:"lastVersion,omitempty"`
}

type Groups struct {
	Groups []Group `json:"groups"`
}

type PublishGroupRequest struct {
	Version         string `json:"version"`
	PreviousVersion string `json:"previousVersion"`
	Status          string `json:"status"`
	Refs            []Ref  `json:"refs"`
}
