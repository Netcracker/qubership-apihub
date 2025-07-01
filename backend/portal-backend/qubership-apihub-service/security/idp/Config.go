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

package idp

type IDPType string
type AuthProtocol string

const (
	IDPTypeInternal IDPType = "internal"
	IDPTypeExternal IDPType = "external"

	AuthProtocolSAML AuthProtocol = "SAML"
	AuthProtocolOIDC AuthProtocol = "OIDC"
)

type AuthConfig struct {
	Providers []IDP `json:"identityProviders"`
	AutoLogin bool  `json:"autoLogin"`
}

type IDP struct {
	Id                   string             `json:"id"`
	IdpType              IDPType            `json:"type"`
	DisplayName          string             `json:"displayName"`
	ImageSvg             string             `json:"imageSvg"`
	LoginStartEndpoint   string             `json:"loginStartEndpoint"`
	RefreshTokenEndpoint string             `json:"refreshTokenEndpoint,omitempty"`
	Protocol             AuthProtocol       `json:"-"`
	SAMLConfiguration    *SAMLConfiguration `json:"-"`
	OIDCConfiguration    *OIDCConfiguration `json:"-"`
}

type SAMLConfiguration struct {
	Certificate    string
	PrivateKey     string
	IDPMetadataURL string
	RootURL        string
}

type OIDCConfiguration struct {
	ClientID     string
	ClientSecret string
	RootURL      string
	RedirectPath string
	ProviderURL  string
	Scopes       []string
}

type OIDCClaims struct {
	UserId  string `json:"sub"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	Picture string `json:"picture,omitempty"`
}
