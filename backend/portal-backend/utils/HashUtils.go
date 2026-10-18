package utils

import (
	"crypto/md5"
	"encoding/hex"

	"github.com/zeebo/xxh3"
)

func GetEncodedChecksum(data ...[]byte) string {
	allData := []byte{}
	for _, bytes := range data {
		allData = append(allData, bytes...)
	}
	sum := md5.Sum(allData)
	return hex.EncodeToString(sum[:])
}

func GetEncodedXXHash128(data ...[]byte) string {
	h := xxh3.New()
	for _, bytes := range data {
		h.Write(bytes)
	}
	sum := h.Sum128()
	bytes := sum.Bytes()
	return hex.EncodeToString(bytes[:])
}
