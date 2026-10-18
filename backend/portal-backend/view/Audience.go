package view

const ApiAudienceInternal = "internal"
const ApiAudienceExternal = "external"
const ApiAudienceUnknown = "unknown"

func ValidApiAudience(apiAudience string) bool {
	switch apiAudience {
	case ApiAudienceInternal, ApiAudienceExternal, ApiAudienceUnknown:
		return true
	}
	return false
}
