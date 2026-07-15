/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const mermaidSample = `
# Integration Document

This document describes the integration flow between services.

## Authentication Flow

The sequence below shows how a client authenticates and retrieves data.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API as API Gateway
    participant Auth as Auth Service
    participant DB as Database

    Client->>API: POST /api/v1/login
    API->>Auth: Validate credentials
    Auth->>DB: SELECT user WHERE email=?
    DB-->>Auth: User record
    Auth-->>API: JWT token
    API-->>Client: 200 OK { token }

    Client->>API: GET /api/v1/packages (Bearer token)
    API->>Auth: Verify token
    Auth-->>API: Token valid
    API->>DB: SELECT packages
    DB-->>API: Package list
    API-->>Client: 200 OK { packages }
\`\`\`

## Publishing Process

The flowchart below describes the version publishing lifecycle.

\`\`\`mermaid
flowchart TD
    A([Start]) --> B[Upload API spec files]
    B --> C{Validation}
    C -- Valid --> D[Set version metadata]
    C -- Invalid --> E[Show validation errors]
    E --> B
    D --> F{Choose status}
    F -- Draft --> G[Save as Draft]
    F -- Release --> H{Release pattern OK?}
    H -- No --> I[Show pattern error]
    I --> D
    H -- Yes --> J[Publish Release]
    G --> K([Done])
    J --> K
\`\`\`

## Notes

Regular markdown mixed with diagrams continues to render normally.
Tables, **bold**, _italic_, and \`inline code\` are unaffected.

| Column A | Column B |
|----------|----------|
| Value 1  | Value 2  |
| Value 3  | Value 4  |
`

export const mermaidInvalidSample = `
# Fallback Demo

The diagram below contains invalid Mermaid syntax.
The component should display the raw source text instead of crashing.

\`\`\`mermaid
sequenceDiagram
    This is not valid mermaid syntax!!!
    participant ???
    --->>>> broken arrow
\`\`\`

Text after an invalid diagram renders normally.
`
