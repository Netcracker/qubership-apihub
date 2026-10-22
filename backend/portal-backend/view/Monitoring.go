package view

type SearchEndpointOpts struct {
	SearchLevel    string   `json:"searchLevel,omitempty"`
	ApiType        string   `json:"apiType,omitempty"`
	Methods        []string `json:"methods,omitempty"`
	OperationTypes []string `json:"operationTypes,omitempty"`
}

func MakeSearchEndpointOptions(searchLevel string, operationSearchParams *OperationSearchParams) SearchEndpointOpts {
	searchOpts := SearchEndpointOpts{
		SearchLevel: searchLevel,
	}
	if operationSearchParams != nil {
		searchOpts.ApiType = operationSearchParams.ApiType
		searchOpts.Methods = operationSearchParams.Methods
		searchOpts.OperationTypes = operationSearchParams.OperationTypes
	}
	return searchOpts
}
