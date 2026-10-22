package utils

import (
	"strconv"
	"strings"
	"sync"
)

func ToId(part string) string {
	return strings.ToUpper(strings.Replace(part, " ", "-", -1)) // TODO: any other conversions?
}

func MakeAgentId(cloud, agentNamespace string) string {
	return strings.ToLower(cloud) + "_" + strings.ToLower(agentNamespace)
}

func GenerateFileId(fileIds *sync.Map, docName string, extension string) string {
	if extension != "" {
		extension = "." + extension
	}
	_, exists := fileIds.LoadOrStore(docName+extension, true)
	if exists {
		for i := 1; ; i++ {
			_, exists := fileIds.LoadOrStore(docName+strconv.Itoa(i)+extension, true)
			if !exists {
				return docName + strconv.Itoa(i) + extension
			}
		}
	}
	return docName + extension
}
