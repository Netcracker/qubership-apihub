package scanner

import (
	"fmt"
	"strings"

	"github.com/qubership-apihub-commons-go/api-spec-exposer/config"
)

// RestIdentifier identifies OpenAPI specifications
type RestIdentifier struct{}

func (i *RestIdentifier) CanHandle(path string) bool {
	ext := getFileExtension(path)
	return ext == "json" || ext == "yaml" || ext == "yml"
}

func (i *RestIdentifier) Identify(path string, content []byte) (*config.SpecMetadata, []string, []error) {
	var data map[string]interface{}
	var format config.Format
	var err error
	var warnings []string

	ext := getFileExtension(path)
	if ext == "json" {
		data, err = parseJSON(content)
		format = config.FormatJSON
	} else if ext == "yaml" || ext == "yml" {
		data, err = parseYAML(content)
		format = config.FormatYAML
	} else {
		return nil, nil, nil
	}

	if err != nil {
		return nil, nil, []error{fmt.Errorf("failed to parse %s file %s: %w", ext, path, err)}
	}

	openapiVersion := getString(data, "openapi")
	swaggerVersion := getString(data, "swagger")

	if openapiVersion == "" && swaggerVersion == "" {
		return nil, nil, nil
	}

	name := getFileName(path)

	if !hasKey(data, "info") {
		warnings = append(warnings, fmt.Sprintf("file %s: 'info' field is missing, using filename as name", path))
	} else {
		info, ok := data["info"].(map[string]interface{})
		if !ok {
			warnings = append(warnings, fmt.Sprintf("file %s: 'info' field is not an object, using filename as name", path))
		} else if !hasKey(info, "title") {
			warnings = append(warnings, fmt.Sprintf("file %s: 'title' field is missing in 'info', using filename as name", path))
		} else {
			if title, ok := info["title"].(string); ok && title != "" {
				name = title
			} else {
				warnings = append(warnings, fmt.Sprintf("file %s: 'title' field is empty or invalid, using filename as name", path))
			}
		}
	}

	var docType config.DocumentType
	if strings.HasPrefix(openapiVersion, "3.1") {
		docType = config.DocTypeOpenAPI31
	} else if strings.HasPrefix(openapiVersion, "3.0") {
		docType = config.DocTypeOpenAPI30
	} else if strings.HasPrefix(swaggerVersion, "2.") || strings.HasPrefix(openapiVersion, "2.") {
		docType = config.DocTypeOpenAPI20
	} else {
		return nil, nil, nil
	}

	xApiKind := getString(data, "x-api-kind")
	if xApiKind != "" {
		if val := strings.ToLower(xApiKind); val != "bwc" && val != "no-bwc" {
			warnings = append(warnings, fmt.Sprintf("file %s: 'x-api-kind' has invalid value '%s', using default 'BWC'", path, xApiKind))
			xApiKind = "BWC"
		}
	} else {
		xApiKind = getXApiKind(path)
	}

	return &config.SpecMetadata{
		Name:     name,
		FilePath: path,
		Type:     docType,
		ApiType:  config.ApiTypeRest,
		Format:   format,
		FileId:   generateFileId(path),
		XApiKind: xApiKind,
	}, warnings, nil
}
