// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package utils

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"net/http"
	"sync"
	"time"
)

var (
	baseTLSOnce sync.Once
	baseTLSCfg  *tls.Config
	baseTLSErr  error
)

const (
	// pooledTransportMaxIdleConns caps the total number of idle keep-alive connections kept
	// open across all hosts, mirroring net/http.DefaultTransport. Without a cap, a transport
	// that talks to many distinct hosts (e.g. one per-namespace service DNS name) accumulates
	// idle connections without bound.
	pooledTransportMaxIdleConns = 100
	// pooledTransportIdleConnTimeout is how long an idle keep-alive connection is kept before
	// being closed, mirroring net/http.DefaultTransport. The zero value disables this timeout,
	// which leaves idle connections to hosts that are never revisited (e.g. after a namespace's
	// services change) open for the lifetime of the process.
	pooledTransportIdleConnTimeout = 90 * time.Second
)

// NewPooledTransport returns an http.Transport using tlsConfig with bounded idle-connection
// limits, so pools that talk to many distinct hosts don't accumulate idle TCP connections
// indefinitely.
func NewPooledTransport(tlsConfig *tls.Config) *http.Transport {
	return &http.Transport{
		TLSClientConfig: tlsConfig,
		MaxIdleConns:    pooledTransportMaxIdleConns,
		IdleConnTimeout: pooledTransportIdleConnTimeout,
	}
}

// ValidateTLSAtStartup validates the default TLS configuration at process startup.
func ValidateTLSAtStartup() error {
	_, err := BuildSecureTLSConfig(nil)
	return err
}

// BuildSecureTLSConfig returns a TLS configuration with proper certificate validation.
// It uses the system certificate pool.
//
// In container deployments based on ghcr.io/netcracker/qubership-core-base, custom CA certificates
// are loaded into the system trust store by the base image entrypoint from /tmp/cert/ before the
// application starts. Mount .crt, .cer, or .pem files there in Compose or Kubernetes.
func BuildSecureTLSConfig(customPEM []byte) (*tls.Config, error) {
	if len(customPEM) == 0 {
		baseTLSOnce.Do(func() {
			baseTLSCfg, baseTLSErr = buildSecureTLSConfig(nil)
		})
		if baseTLSErr != nil {
			return nil, baseTLSErr
		}
		return baseTLSCfg.Clone(), nil
	}
	return buildSecureTLSConfig(customPEM)
}

func buildSecureTLSConfig(customPEM []byte) (*tls.Config, error) {
	rootCAs, err := buildRootCertPool(customPEM)
	if err != nil {
		return nil, err
	}
	return &tls.Config{
		RootCAs:    rootCAs,
		MinVersion: tls.VersionTLS12,
	}, nil
}

func buildRootCertPool(customPEM []byte) (*x509.CertPool, error) {
	pool, err := x509.SystemCertPool()
	if err != nil {
		return nil, fmt.Errorf("load system certificate pool: %w", err)
	}
	if len(customPEM) > 0 {
		if ok := pool.AppendCertsFromPEM(customPEM); !ok {
			return nil, fmt.Errorf("parse custom PEM certificate")
		}
	}
	return pool, nil
}

// CreateSecureHTTPClient returns an HTTP client with secure TLS configuration.
// name identifies the client's connection pool in the periodic diagnostic logs.
func CreateSecureHTTPClient(timeout time.Duration, name string) (*http.Client, error) {
	tlsConfig, err := BuildSecureTLSConfig(nil)
	if err != nil {
		return nil, err
	}
	tr := NewPooledTransport(tlsConfig)
	return &http.Client{Transport: RegisterPoolStats(name, tr), Timeout: timeout}, nil
}
