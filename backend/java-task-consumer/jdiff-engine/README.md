# jdiff-engine

Vendored analysis engine copied from `qubership-java-diff-service/jdiff-core` (PoC, read-only).

## Packages

| Package | Role |
|---------|------|
| `model` | `DiffReport`, `Gav`, `JsonSupport` |
| `resolve` | Maven resolver, `JarSource` (GAV + daemonless OCI image pull) |
| `japicmp` / `jdeps` | External tool runners |
| `pipeline` | `ApiReport`, `ApiDiff`, `UpgradeImpact` |
| `upgrade` | BOM expansion, impact analysis |
| `service` | `JdiffBuildService`, `JdiffEngineFactory` |

## Tests

```bash
mvn -pl jdiff-engine test
mvn -pl jdiff-engine verify -Djdiff.it=true   # optional ITs (network + japicmp jar)
```
