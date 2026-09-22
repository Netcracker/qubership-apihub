# Local debug harness

Run the real worker poll loop from Cursor with breakpoints, without Docker and without
libraries-backend. An in-process HTTP queue plays the backend contract. A driver then enqueues
the four build types one after another and waits for each terminal status.

Docker/compose still starts `WorkerMain` only. The harness lives in `src/test` and is not shaded
into the production JAR.

## Start from Cursor

1. Import or wait for the Maven project `java-task-consumer`.
2. Run **Debug JTC scenarios** (`.vscode/launch.json`), or debug
   `com.netcracker.qubership.apihub.javataskconsumer.debug.DebugHarnessMain`.
3. Set breakpoints in `BuildExecutor`, `JdiffBuildService`, or the pipelines.

If this workspace is the APIHUB-ALL monorepo, the launch `cwd` must be the
`qubership-apihub-java-task-consumer` clone (or open that folder). `DebugHarnessMain` also walks
up from `user.dir` to find the repo root.

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

The docker subject uses Quarkus fast-jar layout (`jarPathInImage`: `quarkus-run.jar`). The matching
POM is not on Maven Central; the harness seeds `qip-micro-engine:0.2.5` into `~/.m2` from git tag
`micro-engine-v0.2.5`. Cloud libraries resolve from GitHub Packages.

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
