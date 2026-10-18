package utils

import "time"

func GetRemainingSeconds(targetTimestamp int64) int64 {
	currentTime := time.Now().Unix()
	remainingSeconds := targetTimestamp - currentTime

	if remainingSeconds < 0 {
		remainingSeconds = 0
	}

	return remainingSeconds
}
