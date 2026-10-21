# Local debug harness

Run the real worker poll loop from the IDE with breakpoints, without a container and without
libraries-backend. An in-process HTTP queue plays the backend contract. A driver then enqueues
the four build types one after another and waits for each terminal status.

The image and Compose file still start `WorkerMain` only. The harness lives in `src/test` and is not shaded
into the production JAR.

## Start from the IDE

1. Import the Maven project `java-task-consumer`, or wait until the IDE has imported it.
2. In VS Code, open the folder `backend/java-task-consumer` and run **Debug JTC scenarios**
   (`.vscode/launch.json`). In IntelliJ IDEA, debug
   `com.netcracker.qubership.apihub.javataskconsumer.debug.DebugHarnessMain` and set its working directory to
   `backend/java-task-consumer`.
3. Set breakpoints in `BuildExecutor`, `JdiffBuildService`, or the pipelines.

The working directory must be `backend/java-task-consumer` or a folder below it. `DebugHarnessMain` walks up
from `user.dir` to find the Maven project, so it fails when it starts from the repository root, where the
`pom.xml` belongs to the monorepo. For the other ways to run the worker, see
[Run APIHUB locally](../../../docs/development/local-run.md#builder-and-java-worker) and
[Debugging: Java worker](../../../docs/development/debugging.md#java-worker).

The process stays alive after the scenario so you can inspect reports. Stop the debug session when
finished.

## What it runs

| Order | `buildType` | Artifact |
| --- | --- | --- |
| 1 | `java-api-report` | `org.qubership:qip-catalog-library:2025.1.1.15` |
| 2 | `java-api-diff` | same GAV, `2025.1.1.13` → `2025.1.1.15` |
| 3 | `java-upgrade-impact` | subject `org.qubership.atp:atp-itf-core:4.4.115`, upgrade `atp-auth-models` to `1.2.80` |
| 4 | `java-upgrade-impact` (docker) | image `ghcr.io/netcracker/qubership-integration-micro-engine:0.2.5`, upgrade every `com.netcracker.cloud.*` direct/BOM dependency to the latest GitHub Packages release |

Fixtures: `java-task-consumer/src/test/resources/debug/netcracker-scenarios.json`.

The docker subject uses Quarkus fast-jar layout. The worker reads library versions from
`pom.properties` in `/app/lib` and runs jdeps on `/app/app/*.jar` (`quarkus-run.jar` is skipped).
Cloud-library JARs (old and new versions) resolve from GitHub Packages.

## Registry token

Set `GHCR_TOKEN` (or `GITHUB_TOKEN`) in the environment before launching. A PAT with
`read:packages` is enough for GHCR pull and Maven GitHub Packages. Optional: `GHCR_USERNAME`
(defaults to `x-access-token`). Docker `config.json` still wins when present.

The launch config forwards `${env:GHCR_TOKEN}` into the debug process.

## Outputs and tools

- Reports: `java-task-consumer/target/jtc-debug/inbox/<publishId>/report.json`
- japicmp: `JDIFF_JAPICMP_JAR`, or `japicmp/japicmp-0.26.1-jar-with-dependencies.jar` (downloaded on
  first run)
- Queue: `127.0.0.1:18080` (`DEBUG_QUEUE_PORT`)
- Health: `GET http://127.0.0.1:13000/live`

The run needs JDK 21, network access to Maven Central and (for the docker scenario) GitHub
Container Registry plus GitHub Packages. japicmp on catalog-library and cloud upgrades can take
several minutes.

## Tests that stay on CI

`LocalJavaBuildQueueTest` and `DebugScenarioFileTest` cover poll/status and the fixture list. They
do not resolve Maven artifacts or invoke japicmp.
