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

import (
	"encoding/json"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

// By design either User fields or ApiKey fields are filled
type PrincipalEntity struct {
	PrincipalUserId        string `pg:"prl_usr_id, type:varchar"`
	PrincipalUserName      string `pg:"prl_usr_name, type:varchar"`
	PrincipalUserEmail     string `pg:"prl_usr_email, type:varchar"`
	PrincipalUserAvatarUrl string `pg:"prl_usr_avatar_url, type:varchar"`
	PrincipalApiKeyId      string `pg:"prl_apikey_id, type:varchar"`
	PrincipalApiKeyName    string `pg:"prl_apikey_name, type:varchar"`
}

func MakePrincipalView(ent *PrincipalEntity) *map[string]interface{} {
	principal := make(map[string]interface{})
	var principalViewBytes []byte
	if ent.PrincipalUserId != "" {
		userPrincipalView := view.PrincipalUserView{
			PrincipalType: view.PTUser,
			User: view.User{
				Id:        ent.PrincipalUserId,
				Name:      ent.PrincipalUserName,
				Email:     ent.PrincipalUserEmail,
				AvatarUrl: ent.PrincipalUserAvatarUrl,
			},
		}
		principalViewBytes, _ = json.Marshal(userPrincipalView)
	} else if ent.PrincipalApiKeyId != "" {
		apiKeyPrincipalView := view.PrincipalApiKeyView{
			PrincipalType: view.PTApiKey,
			ApiKey: view.ApiKey{
				Id:   ent.PrincipalApiKeyId,
				Name: ent.PrincipalApiKeyName,
			},
		}
		principalViewBytes, _ = json.Marshal(apiKeyPrincipalView)
	}
	err := json.Unmarshal(principalViewBytes, &principal)
	if err != nil {
		log.Errorf("Failed to unmarshal Principal object data: %v", err)
	}
	return &principal
}
