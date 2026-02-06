# Features of running on a localhost

To test the "Playground" via a localhost in Playwright tests, set the `PLAYGROUND_BACKEND_HOST`
environment variable. Tests use it to create a custom server for sending requests.

In Docker Compose, use `http://host.docker.internal:8081`:

- protocol + value of the `apihubExternalUrl` field from the
  [`qubership-apihub-backend-config.yaml`](https://github.com/Netcracker/qubership-apihub/blob/main/docker-compose/apihub-generic/qubership-apihub-backend-config.yaml)
- add the field `allowedHostsForProxy` with value `host.docker.internal` to the same config file.

In Docker Compose + dev proxy, in addition to the settings above, set `DEV_PROXY_MODE=true` in tests
to skip scenarios that cannot be executed in this mode.

|                                               | Live environment | Docker compose                                                                                                                      | Docker compose + dev proxy                                                                                                         |
| --------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Playground tests                              | ✔️                | ✔️ `ALLOWED_HOSTS=host.docker.internal` - in docker compose<br>`PLAYGROUND_BACKEND_HOST=http://host.docker.internal:8081` - in tests | ✔️ `ALLOWED_HOSTS=host.docker.internal` - in docker compose<br>`PLAYGROUND_BACKEND_HOST=http://host.docker.internal:8081` - in test |
| Tests with redirects to the Agent             | ✔️                | ✔️                                                                                                                                   | ❌ Skipped with `DEV_PROXY_MODE=true` - in tests                                                                                   |
| Expand/collapse the Package page sidebar test | ✔️                | ✔️                                                                                                                                   | ❌ Skipped with `DEV_PROXY_MODE=true` - in tests                                                                                   |
