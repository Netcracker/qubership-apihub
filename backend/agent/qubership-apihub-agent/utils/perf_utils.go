package utils

import "github.com/sirupsen/logrus"

func PerfLog(timeMs int64, thresholdMs int64, str string) {
	if timeMs > thresholdMs {
		logrus.Warnf("PERF: "+str+" took %d ms more than expected (%d ms)", timeMs, thresholdMs)
	} else {
		logrus.Debugf("PERF: "+str+" took %dms", timeMs)
	}
}
