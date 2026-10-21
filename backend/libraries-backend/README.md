# Libraries backend

A placeholder for the Go service that will serve Java library builds to the
[Java worker](../java-task-consumer/README.md). The module has no code, no image, and no Nx project yet. The worker
already polls it by contract: see the [backend API notes](../java-task-consumer/docs/backend-api.md) and the
[Pact contract](../java-task-consumer/docs/pact-libraries-backend.md).

For where the service will sit, see the [architecture overview](../../docs/architecture/overview.md). To add the
service, use the `apihub-add-go-service` skill; it lists every place that names a service. The
[backend README](../README.md) describes the Go workspace.
