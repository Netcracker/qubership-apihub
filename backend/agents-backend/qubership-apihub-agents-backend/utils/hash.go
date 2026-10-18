package utils

import (
	"crypto/md5"
	"encoding/hex"
)

func GetEncodedChecksum(data ...[]byte) string {
	allData := []byte{}
	for _, bytes := range data {
		allData = append(allData, bytes...)
	}

	sum := md5.Sum(allData)
	return hex.EncodeToString(sum[:])
}
