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
	"sync"
)

var (
	baseTLSOnce sync.Once
	baseTLSCfg  *tls.Config
	baseTLSErr  error
)

// ValidateTLSAtStartup validates the default TLS configuration at process startup.
func ValidateTLSAtStartup() error {
	_, err := BuildSecureTLSConfig(nil)
	return err
}

// BuildSecureTLSConfig returns a TLS configuration with proper certificate validation.
// It uses the system certificate pool and optional inline PEM data.
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
