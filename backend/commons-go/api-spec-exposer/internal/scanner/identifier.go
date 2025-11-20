package scanner

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/gosimple/slug"
	"github.com/qubership-apihub-commons-go/api-spec-exposer/config"
	"gopkg.in/yaml.v3"
)

// Identifier interface for spec type identification
type Identifier interface {
	// Identify attempts to identify the spec type from file content
	Identify(path string, content []byte) (*config.SpecMetadata, []string, []error)

	// CanHandle returns true if this identifier can handle the file
	CanHandle(path string) bool
}

// IdentifierChain manages a chain of identifiers
type IdentifierChain struct {
	identifiers []Identifier
}

// Identify tries each identifier in order until one succeeds
func (ic *IdentifierChain) Identify(path string, content []byte) (*config.SpecMetadata, []string, []error) {
	for _, identifier := range ic.identifiers {
		if identifier.CanHandle(path) {
			spec, warnings, errors := identifier.Identify(path, content)
			if spec != nil {
				return spec, warnings, errors
			}
			if len(warnings) > 0 || len(errors) > 0 {
				return nil, warnings, errors
			}
		}
	}

	return nil, nil, nil
}

// Helper functions

func parseJSON(content []byte) (map[string]interface{}, error) {
	var data map[string]interface{}
	err := json.Unmarshal(content, &data)
	return data, err
}

func parseYAML(content []byte) (map[string]interface{}, error) {
	var data map[string]interface{}
	var yamlData map[interface{}]interface{}
	err := yaml.Unmarshal(content, &yamlData)
	if err != nil {
		return nil, err
	}
	data = convertYamlToJsonMap(yamlData)
	return data, err
}

func convertYamlToJsonMap(yaml map[interface{}]interface{}) map[string]interface{} {
	mapStringInterface := convertMapI2MapS(yaml)
	if result, ok := mapStringInterface.(map[string]interface{}); ok {
		return result
	}
	return nil
}

func convertMapI2MapS(v interface{}) interface{} {
	switch x := v.(type) {
	case map[interface{}]interface{}:
		m := map[string]interface{}{}
		for k, v2 := range x {
			switch k2 := k.(type) {
			case string:
				m[k2] = convertMapI2MapS(v2)
			default:
				m[fmt.Sprint(k)] = convertMapI2MapS(v2)
			}
		}
		v = m

	case []interface{}:
		for i, v2 := range x {
			x[i] = convertMapI2MapS(v2)
		}

	case map[string]interface{}:
		for k, v2 := range x {
			x[k] = convertMapI2MapS(v2)
		}
	}
	return v
}

func getFileExtension(path string) string {
	ext := filepath.Ext(path)
	return strings.ToLower(strings.TrimPrefix(ext, "."))
}

func getFileName(path string) string {
	base := filepath.Base(path)
	return strings.TrimSuffix(base, filepath.Ext(base))
}

func generateFileId(path string) string {
	name := filepath.Base(path)
	return slug.Make(name)
}

func getXApiKind(path string) string {
	name := getFileName(path)
	if strings.HasSuffix(name, "_internal") {
		return "no-BWC"
	}
	return "BWC"
}

func getString(data map[string]interface{}, key string) string {
	if val, ok := data[key].(string); ok {
		return val
	}
	return ""
}

func hasKey(data map[string]interface{}, key string) bool {
	_, ok := data[key]
	return ok
}
