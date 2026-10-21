# DI-Portal-GS-004 Business Metrics

**Design Item ID**: DI-Portal-GS-004  
**Design Item Name**: Business Metrics  
**Related Design Items**: -  
**Related API**:

* Get business metrics report (GET /api/v2/businessMetrics)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

## Description

The functionality provides a system administrator with the ability to collect business metrics, which track usage of
APIHUB functionality via calculating API endpoints calls.  
To get information about business metrics system administrator can call GET /api/v2/businessMetrics.

There are following business metrics:

1. **packages_and_dashboards_created** - tracks how many packages/dashboards were created for a specific
   workspace/group. Value of this metric is increased for "parentId" from request body. Tracked endpoints:

* POST "/api/v2/packages"

1) **documents_called** - tracks how many times any document in any version was requested for package. Tracked
   endpoints:

* GET "/api/v2/packages/{packageId}/versions/{version}/documents/{slug}" (deprecated)
* GET "/api/v3/packages/{packageId}/versions/{version}/documents/{slug}"
* GET "/api/v2/packages/{packageId}/versions/{version}/files/{slug}/raw"

1) **release_versions_published** - tracks how many versions with "release" status were published (new version revision
   also counts towards this metric). Value of this metric is increased for "packageId" from "info.json" file that is
   passed in the request body. Tracked endpoints:  

* POST "/api/v2/packages/{packageId}/publish/{publishId}/status" (only for buildType="build" and status="complete")

1) **deprecated_operations_called** - tracks how many times a list of deprecated operations was requested for package.
   Tracked endpoints:  

* GET "/api/v2/packages/{packageId}/versions/{version}/{apiType}/deprecated"

1) **exports_called** - tracks export requests for versions, documents, operation groups, version changes, operations
   and deprecated operations. Tracked endpoints:

* GET "/api/v2/packages/{packageId}/versions/{version}/doc"
* GET "/api/v2/packages/{packageId}/versions/{version}/files/{slug}/doc"
* GET "/api/v2/packages/{packageId}/versions/{version}/{apiType}/export/groups/{groupName}"
* GET "/api/v2/packages/{packageId}/versions/{version}/changes/export" (deprecated)
* GET "/api/v3/packages/{packageId}/versions/{version}/{apiType}/export/changes"
* GET "/api/v2/packages/{packageId}/versions/{version}/{apiType}/export/operations"
* GET "/api/v2/packages/{packageId}/versions/{version}/{apiType}/export/operations/deprecated"

1) **comparisons_called** - tracks how many times version changes summary was requested. Tracked endpoints:

* GET "/api/v2/packages/{packageId}/versions/{version}/changes/summary"
