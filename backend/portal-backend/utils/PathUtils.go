package utils

import (
	"path"
	"strings"
)

// Splits fileId to normalized Path and Name
func SplitFileId(fileId string) (string, string) {
	filePath := path.Dir(fileId)
	var fileName string
	if strings.HasSuffix(fileId, "/") {
		fileName = ""
	} else {
		fileName = path.Base(fileId)
	}

	if filePath == "." || filePath == "/" {
		filePath = ""
	}

	return filePath, fileName
}
