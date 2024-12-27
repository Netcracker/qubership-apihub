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

type User struct {
	Id        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarUrl string `json:"avatarUrl"`
}

type UserAvatar struct {
	Id       string
	Avatar   []byte
	Checksum [32]byte
}

type Users struct {
	Users []User `json:"users"`
}

type LdapUsers struct {
	Users []LdapUser
}

type LdapUser struct {
	Id     string
	Email  string
	Name   string
	Avatar []byte
}

type UsersListReq struct {
	Filter string `json:"filter"`
	Limit  int    `json:"limit"`
	Page   int    `json:"page"`
}

type InternalUser struct {
	Id                 string `json:"-"`
	Email              string `json:"email" validate:"required"`
	Name               string `json:"name"`
	Password           string `json:"password" validate:"required"`
	PrivateWorkspaceId string `json:"privateWorkspaceId"`
}

type LdapSearchFilterReq struct {
	FilterToValue map[string]string
	Limit         int
}
