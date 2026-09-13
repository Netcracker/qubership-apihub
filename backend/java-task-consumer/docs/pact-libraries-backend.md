# Pact contract: java-task-consumer → libraries-backend

This is the executable HTTP contract between
[qubership-apihub-java-task-consumer](https://github.com/Netcracker/qubership-apihub-java-task-consumer)
(consumer) and
[qubership-apihub-libraries-backend](https://github.com/Netcracker/qubership-apihub-libraries-backend)
(provider).

Human-readable request/response notes and `config.json` shapes live in [backend-api.md](backend-api.md).
This page is the provider-side handoff: how to verify the backend against the pact file without running JTC.

## What you get

| Artifact | Role |
|----------|------|
| [`pacts/java-task-consumer-libraries-backend.json`](../pacts/java-task-consumer-libraries-backend.json) | Pact file. Replay these requests against your service. |
| `RegistryClientPactTest` | Consumer tests that produced the file. Do not edit the JSON by hand. |

Consumer name: `java-task-consumer`. Provider name: `libraries-backend`. Spec version: Pact V3.

Regenerate the file from the JTC repo:

```bash
mvn -pl java-task-consumer -am test -Dtest=RegistryClientPactTest -Dsurefire.failIfNoSpecifiedTests=false
```

## Interactions

Five interactions cover the worker loop. Example IDs are fixed so provider states stay simple:

- `builderId` = `builder-test-1`
- `packageId` = `demo-pkg`
- `publishId` = `pub-99`
- `api-key` header = `test-api-key`

| Provider state | Request | Expected response |
|----------------|---------|-------------------|
| `no java build tasks are available` | `POST /api/v2/java-builders/builder-test-1/tasks` | `204` |
| `a java-api-report task is queued for builder builder-test-1` | same poll | `200` + `Content-Type: application/zip` |
| `java publish pub-99 exists for package demo-pkg` | `POST /api/v3/packages/demo-pkg/java-publish/pub-99/status` with `status=running` | `204` |
| same | status `complete` plus part `data` (`package.zip`) | `204` |
| same | status `error` plus part `errors=engine failed` | `204` |

Poll is an empty POST. Status is `multipart/form-data` with text parts `status` and `builderId`.
`complete` adds file part `data`; `error` adds text part `errors`.

## Matching rules (what must match vs what is an example)

- **Must match:** method, path, `api-key` header, response status.
- **Poll `200` body:** content type `application/zip` only. Bytes of the ZIP are an example.
  Return any ZIP that contains `config.json` at the archive root (see [backend-api.md](backend-api.md)).
- **Status request body:** header `Content-Type` matches `multipart/form-data; boundary=...` (any
  boundary). The body matcher is only "present / non-empty"; it does not compare ZIP bytes. The pact
  still embeds an example body with boundary `----JavaTaskConsumerPactExample` so the verifier has a
  parseable request to replay. Parse parts by name (`status`, `builderId`, `data`, `errors`).

Do not assert that `report.json` inside the result ZIP equals the example. Engine output is out of
scope for this pact.

## Provider states

Expose a **test-only** setup endpoint and point the verifier at it (`--provider-states-setup-url`).
Pact POSTs JSON `{"state":"<name>"}` before each interaction.

Suggested mapping:

| State | Setup |
|-------|--------|
| `no java build tasks are available` | Empty the Java build queue for `builder-test-1`. |
| `a java-api-report task is queued for builder builder-test-1` | Enqueue one task whose ZIP contains `config.json` from the pact example (or any valid `java-api-report` config with the example ids). |
| `java publish pub-99 exists for package demo-pkg` | Accept status posts for that package/publish (create the row if your model requires it). |

Auth: accept `api-key: test-api-key` in the verification environment (or disable auth for the
verifier). Production must still require a real system token.

Keep the states endpoint out of production builds (build tag, test profile, or listen only in e2e).

## Verify with Pact CLI (language-agnostic)

Start libraries-backend locally, including the states endpoint. Then, from a checkout that contains
the pact file:

```bash
podman run --rm --network host \
  -v "${PWD}/pacts:/pacts:ro" \
  docker.io/pactfoundation/pact-cli:latest \
  verify /pacts/java-task-consumer-libraries-backend.json \
  --provider-name libraries-backend \
  --provider-base-url http://127.0.0.1:8080 \
  --provider-states-setup-url http://127.0.0.1:8080/_pact/states
```

If the backend is not on the host network, replace `127.0.0.1` with `host.containers.internal`
(Podman) or `host.docker.internal` (Docker Desktop).

Green verification means the service can serve JTC's poll/status loop. Point JTC's
`APIHUB_BACKEND_ADDRESS` at libraries-backend when you are ready for an end-to-end run.

## Verify with pact-go (if the backend is Go)

Other APIHUB plugin backends (api-linter, agents-backend) are Go. A typical test:

```go
package pactverify

import (
    "fmt"
    "os"
    "path/filepath"
    "testing"

    "github.com/pact-foundation/pact-go/v2/provider"
)

func TestLibrariesBackendPact(t *testing.T) {
    pactDir := os.Getenv("PACT_DIR")
    if pactDir == "" {
        pactDir = filepath.Join("pacts")
    }
    verifier := provider.HTTPVerifier{}
    err := verifier.VerifyProvider(t, provider.VerifyRequest{
        Provider:        "libraries-backend",
        ProviderBaseURL: "http://127.0.0.1:8080",
        PactFiles:       []string{filepath.Join(pactDir, "java-task-consumer-libraries-backend.json")},
        StateHandlers: provider.StateHandlers{
            "no java build tasks are available": func(setup bool, s provider.ProviderState) (provider.ProviderStateResponse, error) {
                // drain queue
                return nil, nil
            },
            "a java-api-report task is queued for builder builder-test-1": func(setup bool, s provider.ProviderState) (provider.ProviderStateResponse, error) {
                // enqueue task ZIP with config.json
                return nil, nil
            },
            "java publish pub-99 exists for package demo-pkg": func(setup bool, s provider.ProviderState) (provider.ProviderStateResponse, error) {
                // ensure publish row exists
                return nil, nil
            },
        },
    })
    if err != nil {
        t.Fatal(fmt.Errorf("pact verify: %w", err))
    }
}
```

Copy `pacts/*.json` into the backend repo (or fetch it in CI from this repository) until a Pact
Broker is in place.

## ZIP payload the poll must return

Minimum `config.json` for the queued-task state:

```json
{
  "publishId": "pub-99",
  "packageId": "demo-pkg",
  "buildType": "java-api-report",
  "metadata": {"gav": "com.example:lib:1.0.0"}
}
```

`buildType` values JTC already implements: `java-api-report`, `java-api-diff`, `java-upgrade-impact`.
The pact records one successful poll; the other types share the same HTTP envelope. Metadata schemas
are in [backend-api.md](backend-api.md).

## What this pact does not cover

- Persistence, UI, or how results are shown in APIHUB
- `jdiff-engine` report contents
- Failure modes other than `status=error` with a text `errors` part (4xx/5xx, auth failures)
- Changing `APIHUB_BACKEND_ADDRESS` in Helm/compose (separate wiring change once verification is green)
