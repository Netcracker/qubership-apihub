package crypto

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
)

func CreateRandomHash() string {
	bytes := make([]byte, 32) //32 symbols
	rand.Read(bytes)
	return hex.EncodeToString(bytes[:])
}

func CreateSHA256Hash(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}
