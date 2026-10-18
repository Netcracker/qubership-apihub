# Migration analysis procedure

This doc is for operation migration analysis.  
See (TODO: link to "operations migration" doc) for more details. 

Migration analysis procedure is required to validate the changes made in `qubership-apihub-api-processor` library(https://github.com/Netcracker/qubership-apihub-api-processor).

## Retrieve and store the results
1) Download the migration result by `GET /api/internal/migrate/operations/{migrationId}`   
2) Store the result json to some file storage.

## Compare to previous migration
Compare migration result to previous one (retrieved from the file storage).  
The interesting properties are:
* "elapsedTime"
* "successBuildsCount"
* "errorBuildsCount"
* "suspiciousBuildsCount"

## Analyze "errorBuilds"
Categorize errors into groups by "error" content criteria.  
Every category need to be analyzed separately.  
Error description and a couple of samples are required for dev analysis.  
Each category requires a resolution that translates into a specific action item.  
Also compare errors/categories list to previous migration.

### Categorization example:
```
    {
      "packageId": "abc.def",
      "version": "15",
      "revision": 1,
      "error": "Error: Cannot parse file new 4.yml. end of the stream or a document separator is expected (1:1)\n\n 1 | ```yaml\n-----^\n 2 | openapi: 3.0.0\n 3 | x-project-id: 'Number_Verify'",
      "buildId": "c6bbc4f7-5840-47b8-8042-0fc5f2480ff0",
      "buildType": "build",
      "previousVersion": "14"
    },
    {
      "packageId": "qwe.rty",
      "version": "a.3",
      "revision": 16,
      "error": "Error: Cannot parse file src/main/resources/data.json. Unexpected end of JSON input",
      "buildId": "762d164a-8950-44fb-a438-1ab5ceddb491",
      "buildType": "build",
      "previousVersion": "a.2"
    },
```
are in the same "Cannot parse file" category.

```
   {
      "packageId": "BFR.YVL",
      "version": "2024.4-Dev",
      "revision": 9,
      "error": "Error: socket hang up",
      "buildId": "7c655688-ede7-4c26-b0ae-680b81c77f43",
      "buildType": "build"
    },
```
Is in different category.


## Analyze "migrationChanges"
"migrationChanges" reflects categories of the changes were detected by the backend in scope of migration.  
The goal is to split unexpected changes from expected and find the root cause for unexpected changes.  
Before starting the analysis, need to study `qubership-apihub-api-processor` changelog to identify the expected changes.

Each category in the list should be analyzed separately via `GET /api/internal/migrate/operations/{migrationId}/suspiciousBuilds?changedField={{category}}`





