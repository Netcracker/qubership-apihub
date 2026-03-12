package entity

import (
	"encoding/json"
	"strings"

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

func MakeActivityHistoryPrincipalView(ent *PrincipalEntity) *map[string]interface{} {
	principal := make(map[string]interface{})
	var principalViewBytes []byte
	if ent.PrincipalUserId != "" {
		if strings.HasPrefix(ent.PrincipalUserId, "job_") {
			parts := strings.SplitN(strings.TrimPrefix(ent.PrincipalUserId, "job_"), "|", 2)
			if len(parts) == 2 {
				jobPrincipalView := view.PrincipalJobView{
					PrincipalType: view.PTJob,
					Job: view.Job{
						Id:   parts[1],
						Name: view.ConvertJobName(parts[0]),
					},
				}
				principalViewBytes, _ = json.Marshal(jobPrincipalView)
			} else {
				log.Errorf("Failed to parse job id: %v", ent.PrincipalUserId)
			}
		} else {
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
		}
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
