# Apache Superset for Local Kind Cluster

Minimal Helm-based deployment of [Apache Superset](https://superset.apache.org/) for your local Kind cluster. Pre-configured to connect to APIHUB PostgreSQL databases for building reports and dashboards.

## Prerequisites

- **Kind cluster** with Ingress controller running
- **Postgres-db** deployed (`pg-common` in `postgres-db` namespace)
- **APIHUB** optionally deployed (same Postgres instance; datasources are pre-configured)

## Pre-configured Datasources

The chart automatically registers these PostgreSQL connections on first run:

| Database        | Purpose          | Credentials (from postgres-db) |
|-----------------|------------------|--------------------------------|
| `apihub_backend`| APIHUB core data | apihub_backend_user / apihub_backend_password |
| `api_linter`    | API Linter data  | api_linter_user / api_linter_password |
| `agents_backend`| Agents backend   | agents_backend_user / agents_backend_password |

## Quick Start

### 1. Update Helm dependencies

```bash
cd helm-templates/local-k8s-quickstart/apache-superset
helm repo add superset https://apache.github.io/superset
helm dependency update
```

### 2. Install Superset

Ensure `postgres-db` is running first. Then:

```bash
cd apache-superset
helm dependency update
helm install superset . -n superset --create-namespace -f values.yaml
```

### 3. Access Superset

- **URL:** http://superset.localtest.me
- **Login:** admin / admin (change after first login)

### 4. Verify datasources

In Superset: **Settings → Database Connections**. You should see `apihub_backend`, `api_linter`, and `agents_backend` already configured.

## Module Composition

Superset consists of several components. This chart configures a minimal set focused on **UI + core functionality**:

| Component | In Chart | Why |
|-----------|----------|-----|
| **supersetNode** (Web UI) | ✅ 1 replica | Main component. Serves the UI, dashboards, charts, SQL Lab. This is what you need for building and viewing reports. |
| **supersetWorker** (Celery worker) | ✅ 1 replica | Runs async tasks: SQL Lab async execution, cache warming, data refresh. Needed for SQL Lab and some chart features; without it async queries fail. |
| **Redis** | ✅ embedded | Required by Superset for caching and as Celery message broker. Minimal footprint, no persistence. |
| **Init Job** | ✅ | Creates DB schema, admin user, imports pre-configured datasources. Runs once on install. |
| **PostgreSQL** (metadata) | ✅ external (pg-common) | Stores Superset config, dashboards, users. We use your existing `pg-common` instead of a separate instance. |
| **Celery Beat** | ❌ disabled | Scheduler for alerts and scheduled email reports. Not needed for interactive dashboards/reports. |
| **Celery Flower** | ❌ disabled | Monitoring UI for Celery workers. Not needed for basic use. |
| **supersetWebsockets** | ❌ disabled | Alternative async query transport. Not required; default transport works without it. |
| **PostgreSQL subchart** | ❌ disabled | Replaced by external `pg-common` to avoid extra DB instance. |

**Summary:** You get the full Superset UI (dashboards, charts, SQL Lab, datasource management) with one web pod and one worker. Beat, Flower, and Websockets are omitted to keep the setup minimal for local dev.

## Architecture (quick reference)

- **Metadata DB:** Dedicated `superset` database in `pg-common` (created by pre-install hook).
- **Ingress:** Exposed at `superset.localtest.me` via nginx ingress.

## Customization

Override values for different Postgres hosts or credentials:

```yaml
# values-override.yaml
pgInit:
  host: my-pg-host.my-namespace.svc.cluster.local
  adminUser: postgres
  adminPassword: mypassword

superset:
  supersetNode:
    connections:
      db_host: my-pg-host.my-namespace.svc.cluster.local
      db_user: superset
      db_pass: superset
  extraConfigs:
    import_datasources.yaml: |
      databases:
      - database_name: my_db
        sqlalchemy_uri: postgresql://user:pass@host:5432/mydb
        tables: []
```

Install with overrides:

```bash
helm upgrade --install superset ./apache-superset -n superset -f apache-superset/values.yaml -f my-overrides.yaml
```

## Uninstall

```bash
helm uninstall superset -n superset
kubectl delete namespace superset
```

Note: The `superset` database and user in `pg-common` remain. Remove manually if needed:

```sql
DROP DATABASE superset;
DROP ROLE superset;
```

## Troubleshooting

### Superset pods stuck in Init

The init Job creates the `superset` database in pg-common. Ensure:

1. `postgres-db` is running: `kubectl get pods -n postgres-db`
2. `pg-common` service exists: `kubectl get svc -n postgres-db pg-common`
3. Admin credentials match postgres-db (`postgres`/`postgres` by default)

### Redirect or CORS issues

If Superset redirects fail with `superset.localtest.me`, patch Deployments with hostAliases (similar to APIHUB):

```bash
INGRESS_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.spec.clusterIP}')
kubectl patch deployment -n superset -l "app.kubernetes.io/name=superset" --type='merge' -p "{\"spec\":{\"template\":{\"spec\":{\"hostAliases\":[{\"ip\":\"$INGRESS_IP\",\"hostnames\":[\"superset.localtest.me\"]}]}}}}"
```

### Port-forward fallback

If Ingress is not configured:

```bash
kubectl port-forward -n superset svc/superset 8088:8088
# Access at http://localhost:8088
```
