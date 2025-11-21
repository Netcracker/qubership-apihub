package generator

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"
)

// Generator generates endpoint mappings and handlers based on discovered specs
type Generator struct {
	specs []config.SpecMetadata
}

// New creates a new generator
func New(specs []config.SpecMetadata) *Generator {
	return &Generator{
		specs: specs,
	}
}

// Generate generates all endpoint configurations and their handlers
func (g *Generator) Generate() []config.EndpointConfig {
	specsByType := g.groupSpecsByType()

	specMap := make(map[string]*config.SpecMetadata)
	configMap := make(map[string][]config.ConfigURL)

	restSpecsLen := len(specsByType[config.ApiTypeRest])
	if restSpecsLen > 0 {
		g.generateRestEndpoints(specsByType[config.ApiTypeRest], specMap, configMap)
	}

	gqlSpecsLen := len(specsByType[config.ApiTypeGraphQL])
	if gqlSpecsLen > 0 {
		g.generateGraphQLEndpoints(specsByType[config.ApiTypeGraphQL], specMap, configMap)
	}

	otherTypesLen := len(specsByType[config.ApiTypeMarkdown]) + len(specsByType[config.ApiTypeUnknown])
	if otherTypesLen > 0 {
		g.generateOtherEndpoints(specsByType, specMap)

		g.generateApihubConfig(specMap, configMap)
	}

	return g.generateEndpoints(specMap, configMap)
}

func (g *Generator) generateEndpoints(specMap map[string]*config.SpecMetadata, configMap map[string][]config.ConfigURL) []config.EndpointConfig {
	endpoints := make([]config.EndpointConfig, 0)

	for path, spec := range specMap {
		specCopy := spec
		pathCopy := path
		handler := func(w http.ResponseWriter, r *http.Request) {
			file, err := os.Open(specCopy.FilePath)
			if err != nil {
				http.Error(w, "Failed to read spec file", http.StatusInternalServerError)
				return
			}
			defer file.Close()

			contentType := g.getContentType(specCopy.Format)

			w.Header().Set("Content-Type", contentType)
			w.WriteHeader(http.StatusOK)
			io.Copy(w, file)
		}
		endpoints = append(endpoints, config.EndpointConfig{SpecMetadata: *specCopy, Path: pathCopy, Handler: handler})
	}

	for path, configURLs := range configMap {
		configURLsCopy := configURLs
		pathCopy := path
		handler := func(w http.ResponseWriter, r *http.Request) {
			response := config.ApiSpecConfig{
				ConfigURL: pathCopy,
				URLs:      configURLsCopy,
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(response)
		}
		endpoints = append(endpoints, config.EndpointConfig{Path: pathCopy, Handler: handler})
	}

	return endpoints
}

func (g *Generator) getContentType(format config.Format) string {
	switch format {
	case config.FormatJSON:
		return "application/json"
	case config.FormatYAML:
		return "application/yaml"
	case config.FormatGraphQL:
		return "text/plain"
	case config.FormatMarkdown:
		return "text/markdown"
	default:
		return "application/octet-stream"
	}
}

func (g *Generator) groupSpecsByType() map[config.ApiType][]config.SpecMetadata {
	result := make(map[config.ApiType][]config.SpecMetadata)

	for _, spec := range g.specs {
		result[spec.ApiType] = append(result[spec.ApiType], spec)
	}

	return result
}

func (g *Generator) generateRestEndpoints(specs []config.SpecMetadata, specMap map[string]*config.SpecMetadata, configMap map[string][]config.ConfigURL) {
	if len(specs) == 0 {
		return
	}

	if len(specs) == 1 {
		spec := specs[0]
		specMap["/v3/api-docs"] = &spec
		return
	}

	var configURLs []config.ConfigURL
	for i := range specs {
		spec := &specs[i]
		path := fmt.Sprintf("/v3/api-docs/%s", g.makeUnique(spec.FileId))

		specMap[path] = spec

		configURLs = append(configURLs, config.ConfigURL{
			URL:  path,
			Name: spec.Name,
		})
	}

	if len(specs) > 1 {
		configMap["/v3/api-docs/swagger-config"] = configURLs
	}
}

func (g *Generator) generateGraphQLEndpoints(specs []config.SpecMetadata, specMap map[string]*config.SpecMetadata, configMap map[string][]config.ConfigURL) {
	if len(specs) == 0 {
		return
	}

	if len(specs) == 1 {
		spec := specs[0]
		if spec.Type == config.DocTypeIntrospection {
			specMap["/graphql/introspection"] = &spec
		} else {
			specMap["/api/graphql-server/schema"] = &spec
		}
		return
	}

	if len(specs) == 2 {
		var gqlSpec *config.SpecMetadata
		var introspection *config.SpecMetadata
		for i := range specs {
			if specs[i].Type == config.DocTypeIntrospection {
				introspection = &specs[i]
			} else if specs[i].Type == config.DocTypeGraphQL {
				gqlSpec = &specs[i]
			}
		}

		if gqlSpec != nil && introspection != nil {
			specMap["/api/graphql-server/schema"] = gqlSpec
			specMap["/graphql/introspection"] = introspection
			return
		}
	}

	var configURLs []config.ConfigURL

	for i := range specs {
		spec := &specs[i]
		var path string
		if spec.Type == config.DocTypeIntrospection {
			path = "/graphql/introspection"
		} else {
			path = fmt.Sprintf("/api/graphql-server/schema/%s", g.makeUnique(spec.FileId))
		}

		specMap[path] = spec

		configURLs = append(configURLs, config.ConfigURL{
			URL:  path,
			Name: spec.Name,
		})
	}

	if len(specs) > 1 {
		configMap["/api/graphql-server/schema/domains"] = configURLs
	}
}

func (g *Generator) generateOtherEndpoints(specsByType map[config.ApiType][]config.SpecMetadata, specMap map[string]*config.SpecMetadata) {
	for apiType, specs := range specsByType {
		if apiType == config.ApiTypeMarkdown || apiType == config.ApiTypeUnknown {
			for i := range specs {
				spec := &specs[i]
				path := fmt.Sprintf("/v3/api-docs/%s", g.makeUnique(spec.FileId))
				specMap[path] = spec
			}
		}
	}
}

func (g *Generator) generateApihubConfig(specMap map[string]*config.SpecMetadata, configMap map[string][]config.ConfigURL) {
	var configURLs []config.ConfigURL

	for path, spec := range specMap {
		url := config.ConfigURL{
			URL:      path,
			Name:     spec.Name,
			Type:     string(spec.Type),
			XApiKind: spec.XApiKind,
		}

		configURLs = append(configURLs, url)
	}

	configMap["/v3/api-docs/apihub-swagger-config"] = configURLs
}
func (g *Generator) makeUnique(fileId string) string {
	count := 0
	for _, spec := range g.specs {
		if spec.FileId == fileId {
			count++
		}
	}

	if count > 1 {
		return fmt.Sprintf("%s-%d", fileId, count)
	}

	return fileId
}
