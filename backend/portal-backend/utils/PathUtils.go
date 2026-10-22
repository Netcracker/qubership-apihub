package utils

import (
	"path"
	"strings"
)

// SplitFileId splits a file id into a directory and a file name.
// A trailing slash produces an empty file name. A file id with no directory produces an empty directory.
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
