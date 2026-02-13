package view

import "time"

var defaultApihubConfigUrls = []string{"/v3/api-docs/apihub-swagger-config"}
var defaultSwaggerConfigUrls = []string{"/v3/api-docs/swagger-config", "/swagger-resources"}
var defaultOpenapiUrls = []string{"/q/openapi?format=json", "/v3/api-docs?format=json", "/v2/api-docs",
	"/swagger-ui/swagger.json", "/swagger-ui/doc.json", "/api-docs", "/v1/api-docs"}
var defaultGraphqlUrls = []string{"/api/graphql-server/schema", "/graphql"}
var defaultGraphqlIntUrls = []string{"/graphql/introspection"}
var defaultGraphqlConfigUrls = []string{"/api/graphql-server/schema/domains"}
var defaultSmartlplugConfigUrls = []string{"/smartplug/v1/api/config"}

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

	SmartplugConfig []string
}

func MakeDocDiscoveryUrls(annotations map[string]string) DocumentDiscoveryUrls {
	result := DocumentDiscoveryUrls{}
	//TODO: may be some custom annotation for smartplug url?
	for key, value := range annotations {
		switch key {
		case CustomK8sApihubConfigUrl:
			result.ApihubConfig = append(result.ApihubConfig, value)
		case CustomK8sSwaggerConfigUrl:
			result.SwaggerConfig = append(result.SwaggerConfig, value)
		case CustomK8sOpenapiUrl:
			result.Openapi = append(result.Openapi, value)
		case CustomK8sGraphqlUrl:
			result.GraphqlSchema = append(result.GraphqlSchema, value)
		case CustomK8sGraphqlIntUrl:
			result.GraphqlIntrospection = append(result.GraphqlIntrospection, value)
		case CustomK8sGraphqlConfigUrl:
			result.GraphqlConfig = append(result.GraphqlConfig, value)
		}
	}
	if len(result.ApihubConfig) == 0 {
		result.ApihubConfig = append(result.ApihubConfig, defaultApihubConfigUrls...)
	}
	if len(result.SwaggerConfig) == 0 {
		result.SwaggerConfig = append(result.SwaggerConfig, defaultSwaggerConfigUrls...)
	}
	if len(result.Openapi) == 0 {
		result.Openapi = append(result.Openapi, defaultOpenapiUrls...)
	}
	if len(result.GraphqlSchema) == 0 {
		result.GraphqlSchema = append(result.GraphqlSchema, defaultGraphqlUrls...)
	}
	if len(result.GraphqlIntrospection) == 0 {
		result.GraphqlIntrospection = append(result.GraphqlIntrospection, defaultGraphqlIntUrls...)
	}
	if len(result.GraphqlConfig) == 0 {
		result.GraphqlConfig = append(result.GraphqlConfig, defaultGraphqlConfigUrls...)
	}
	result.SmartplugConfig = append(result.SmartplugConfig, defaultSmartlplugConfigUrls...)
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
