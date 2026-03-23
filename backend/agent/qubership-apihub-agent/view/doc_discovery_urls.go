package view

import (
	"time"

	"github.com/Netcracker/qubership-apihub-agent/config"
)

const CustomK8sApihubConfigUrl = "apihub-config-url"
const CustomK8sSwaggerConfigUrl = "apihub-swagger-config-url"
const CustomK8sOpenapiUrl = "apihub-openapi-url"
const CustomK8sGraphqlUrl = "apihub-graphql-url"
const CustomK8sGraphqlIntUrl = "apihub-graphql-int-url"
const CustomK8sGraphqlConfigUrl = "apihub-graphql-config-url"

type DocumentDiscoveryUrls struct {
	ApihubConfig  []string
	SwaggerConfig []string

	Openapi []string

	GraphqlConfig        []string
	GraphqlSchema        []string
	GraphqlIntrospection []string

	AsyncAPI []string
}

func MakeDocDiscoveryUrls(baseUrls config.ApiTypeUrlsConfig, annotations map[string]string) DocumentDiscoveryUrls {
	return DocumentDiscoveryUrls{
		ApihubConfig:         copyWithPrepend(baseUrls.ApihubConfig.ConfigUrls, annotations[CustomK8sApihubConfigUrl]),
		SwaggerConfig:        copyWithPrepend(baseUrls.OpenAPI.ConfigUrls, annotations[CustomK8sSwaggerConfigUrl]),
		Openapi:              copyWithPrepend(baseUrls.OpenAPI.DocUrls, annotations[CustomK8sOpenapiUrl]),
		GraphqlConfig:        copyWithPrepend(baseUrls.GraphQL.ConfigUrls, annotations[CustomK8sGraphqlConfigUrl]),
		GraphqlSchema:        copyWithPrepend(baseUrls.GraphQL.DocUrls, annotations[CustomK8sGraphqlUrl]),
		GraphqlIntrospection: copyWithPrepend(nil, annotations[CustomK8sGraphqlIntUrl]),
		AsyncAPI:             copyWithPrepend(baseUrls.AsyncAPI.DocUrls, ""),
	}
}

// copyWithPrepend creates a copy of base slice with an optional value prepended.
func copyWithPrepend(base []string, prepend string) []string {
	if prepend == "" {
		if base == nil {
			return nil
		}
		result := make([]string, len(base))
		copy(result, base)
		return result
	}

	//check for duplicate
	for _, v := range base {
		if v == prepend {
			result := make([]string, len(base))
			copy(result, base)
			return result
		}
	}

	result := make([]string, len(base)+1)
	result[0] = prepend
	copy(result[1:], base)
	return result
}

// TODO: separate file?
type DocumentRef struct {
	Url      string
	XApiKind string
	Name     string
	ApiType  ApiType
	Required bool
	Timeout  time.Duration
}
