package utils

import (
	"crypto/sha256"
	"encoding/hex"
)

func Sha256Hex(parts ...[]byte) string {
	h := sha256.New()
	for _, p := range parts {
		h.Write(p)
	}
	return hex.EncodeToString(h.Sum(nil))
}
