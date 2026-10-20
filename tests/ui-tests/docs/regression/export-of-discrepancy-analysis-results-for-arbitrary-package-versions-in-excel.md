[TC-1] Export All Changes for Package Version
-------------

| Step | ER |
| --- | --- |
|1. Log in to APIHUB as Admin and navigate to workspace1 → Package1 → Version1 → Compare Versions/Revisions|Comparison view with a list of changed REST/GraphQL operations is shown|
|2. Click the Export button|Two options are shown: All changes, Filtered changes|
|3. Select the "All changes" option|System initiates export and downloads an Excel file with all changed operations|
|4. Open the Excel file|File contains full list of changed REST/GraphQL operations with no filters applied|


[TC-2] Export Filtered Changes for Package Version
-------------

| Step | ER |
| --- | --- |
|1. Log in to APIHUB as Admin and navigate to workspace1 → Package1 → Version1 → Compare Versions/Revisions|Comparison view with changed REST/GraphQL operations is shown|
|2. Apply a filter to the changes list|System updates the list to show only filtered changes|
|3. Click the Export button|Two options are shown: All changes, Filtered changes|
|4. Select the "Filtered changes" option|System downloads an Excel file containing only filtered changed operations|
|5. Open the Excel file|File contains only filtered REST/GraphQL operations|


[TC-3] Export All Changes from Group Navigation
-------------

| Step | ER |
| --- | --- |
|1. Log in to APIHUB as Admin and navigate to workspace1 → Group1 → Package1 → Version1 → Compare Versions/Revisions|Comparison view with changed REST/GraphQL operations is shown|
|2. Click the Export button|Two options are shown: All changes, Filtered changes|
|3. Select the "All changes" option|System downloads an Excel file with all changed operations|
|4. Open the Excel file|File contains full list of changed REST/GraphQL operations|


[TC-4] Export Filtered Changes from Group Navigation
-------------

| Step | ER |
| --- | --- |
|1. Log in to APIHUB as Admin and navigate to workspace1 → Group1 → Package1 → Version1 → Compare Versions/Revisions|Comparison view is shown|
|2. Apply a filter to the changes list|System updates the list to show filtered changes|
|3. Click the Export button|Two options appear: All changes, Filtered changes|
|4. Select the "Filtered changes" option|System downloads an Excel file containing filtered changed operations|
|5. Open the Excel file|File contains only filtered REST/GraphQL operations|


[TC-5] Security Check – Export with Editor Role
-------------

| Step | ER |
| --- | --- |
|1. Log in as Editor and navigate to workspace1 → Package1 → Version1 → Compare Versions/Revisions|Comparison view is shown|
|2. Click the Export button|Options: All changes, Filtered changes|
|3. Select "All changes"|Excel with all changed operations is downloaded|
|4. Open the Excel file|File confirms Editor has read permission|


[TC-6] Security Check – Export with Viewer Role
-------------

| Step | ER |
| --- | --- |
|1. Log in as Viewer and navigate to workspace1 → Package1 → Version1 → Compare Versions/Revisions|Comparison view is shown|
|2. Click the Export button|Options: All changes, Filtered changes|
|3. Select "All changes"|Excel with all changed operations is downloaded|
|4. Open the Excel file|File confirms Viewer has read permission|


[TC-7] Security Check – Export with No Read Permission
-------------

| Step | ER |
| --- | --- |
|1. Log in as a user with no read permission and navigate to workspace1 → Package1 → Version1 → Compare Versions/Revisions|System blocks access and shows: "You do not have permission to view this package."|
|2. Try to access Export via direct URL or other method|System blocks action and shows: "You do not have permission to export this package."|