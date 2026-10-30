package utils

import (
	"crypto/md5"
	"crypto/sha256"
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

func CreateSHA256Hash(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}
