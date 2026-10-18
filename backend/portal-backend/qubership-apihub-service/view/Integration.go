package view

type ExternalIntegration string

const ExternalIdpIntegration ExternalIntegration = "idp"
const ExternalLdapIntegration ExternalIntegration = "ldap"

func GetIntegrationExternalId(user User, integration ExternalIntegration) string {
	switch integration {
	case ExternalIdpIntegration,
		ExternalLdapIntegration:
		return user.Id
	default:
		return ""
	}
}
