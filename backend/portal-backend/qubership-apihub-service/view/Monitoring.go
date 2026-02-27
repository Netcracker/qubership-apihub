package view

type SearchEndpointOpts struct {
	SearchLevel    string   `json:"searchLevel,omitempty"`
	ApiType        string   `json:"apiType,omitempty"`
	Scopes         []string `json:"scope,omitempty"`
	DetailedScopes []string `json:"detailedScope,omitempty"`
	Methods        []string `json:"methods,omitempty"`
	OperationTypes []string `json:"operationTypes,omitempty"`
}

func MakeSearchEndpointOptions(searchLevel string, operationSearchParams *OperationSearchParams) SearchEndpointOpts {
	searchOpts := SearchEndpointOpts{
		SearchLevel: searchLevel,
	}
	if operationSearchParams != nil {
		searchOpts.ApiType = operationSearchParams.ApiType
		searchOpts.Scopes = operationSearchParams.Scopes
		searchOpts.DetailedScopes = operationSearchParams.DetailedScopes
		searchOpts.Methods = operationSearchParams.Methods
		searchOpts.OperationTypes = operationSearchParams.OperationTypes
	}
	return searchOpts
}
