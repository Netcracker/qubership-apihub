package client

import (
	"net/http"
	"time"

	"gopkg.in/resty.v1"
)

type RetryConfig struct {
	Count       int
	WaitTime    time.Duration
	MaxWaitTime time.Duration
}

func configureRetry(c *resty.Client, cfg RetryConfig) {
	c.SetRetryCount(cfg.Count).
		SetRetryWaitTime(cfg.WaitTime).
		SetRetryMaxWaitTime(cfg.MaxWaitTime).
		AddRetryCondition(retryOn5xx)
}

func retryOn5xx(resp *resty.Response) (bool, error) {
	if resp == nil {
		return false, nil
	}
	return resp.StatusCode() >= http.StatusInternalServerError, nil
}
