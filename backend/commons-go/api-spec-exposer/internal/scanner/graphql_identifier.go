package scanner

import (
	"fmt"
	"regexp"

	"github.com/qubership-apihub-commons-go/api-spec-exposer/config"
)

// GraphQLIdentifier identifies GraphQL specifications
type GraphQLIdentifier struct{}

func (i *GraphQLIdentifier) CanHandle(path string) bool {
	ext := getFileExtension(path)
	return ext == "graphql" || ext == "gql" || ext == "json"
}

func (i *GraphQLIdentifier) Identify(path string, content []byte) (*config.SpecMetadata, []string, []error) {
	ext := getFileExtension(path)

	if ext == "graphql" || ext == "gql" {
		sdlPattern := regexp.MustCompile(`type\s+\S+\s+\{`)
		if sdlPattern.Match(content) {
			return &config.SpecMetadata{
				Name:     getFileName(path),
				FilePath: path,
				Type:     config.DocTypeGraphQL,
				ApiType:  config.ApiTypeGraphQL,
				Format:   config.FormatGraphQL,
				FileId:   generateFileId(path),
				XApiKind: getXApiKind(path),
			}, nil, nil
		} else {
			return nil, nil, []error{fmt.Errorf("file %s is not a valid GraphQL schema", path)}
		}
	}

	if ext == "json" {
		data, err := parseJSON(content)
		if err != nil {
			return nil, nil, []error{fmt.Errorf("failed to parse JSON file %s: %w", path, err)}
		}
		if hasKey(data, "data") {
			if dataField, ok := data["data"].(map[string]interface{}); ok {
				if hasKey(dataField, "__schema") {
					return &config.SpecMetadata{
						Name:     getFileName(path),
						FilePath: path,
						Type:     config.DocTypeIntrospection,
						ApiType:  config.ApiTypeGraphQL,
						Format:   config.FormatJSON,
						FileId:   generateFileId(path),
						XApiKind: getXApiKind(path),
					}, nil, nil
				}
			}
		}
	}

	return nil, nil, nil
}
