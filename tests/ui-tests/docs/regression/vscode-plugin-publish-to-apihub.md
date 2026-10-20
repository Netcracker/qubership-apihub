# 15.2 VSCode plugin - Publish to APIHUB

[Pl-1] General view and test connection
-------------

| Step    | ER |
| ----------- | ----------- |
|1. Open VSCode. Navigate to APIHUB plugin (left sidebar) |3 expandable/collapsible sections with their fields are there: APIHUB ENVIRONMENT, DOCUMENTS TO PUBLISH, PUBLISH TO APIHUB|
|2. Set env-t and PAT (previously generated on the env-t) |Auth. Token can be mask/unmask|
|3. Click Test connection button |After few moments green tick sign is shown next to the Test Connection button|
|4. Remove some symbols in the env raw to make wrong env and click Test connection button |APIHUB URL becomes RED, red sign is shown next to the Test Connection button which means Test connection failed|
|5. Put correct APIHUB URL and change PAT value to make it wrong and click Test connection button |Authentication Token filed becomes RED, red sign is shown next to the Test Connection button which means Test connection failed|
|6. Put correct values again, click test connection and close VSCode. Open VSCode, navigate to plugin and observe APIHUB ENVIRONMENT section |Test connection successful, after opening VSCode again Section APIHUB ENVIRONMENT is collapsed and preselected from previous run|

[Pl-2] DOCUMENTS TO PUBLISH section
-----------------------------------

Precondition: user have all types of files yaml, yml, json, gql, graphql which have “openapi:” field AND which don't have “openapi:” field

| Step    | ER |
| ----------- | ----------- |
|1. Open VSCode. Navigate to APIHUB plugin (left sidebar) |3 expandable/collapsible sections with their fields are there: APIHUB ENVIRONMENT, DOCUMENTS TO PUBLISH, PUBLISH TO APIHUB|
|2. Expand/collapse DOCUMENTS TO PUBLISH| By default section is expanded, section displays all of files which have “openapi:” field (type: yaml, yml, json, gql, graphql)|
|3. Try to select one or multiple files in the section| It's possible to select one or multiple files in the section, all files listed in config file shall be preselected by default (if there is no config file then all files shall be preselected by default)|
|4. Try to select one or multiple files in the section| It's possible to select one or multiple files in the section, all files listed in config file shall be preselected by default (if there is no config file then all files shall be preselected by default)|
|5. Navigate to workspace1 in Explorer and go to Plugin and tick 2 files.|In plugin user can see files related to the workspace1, files were selected|
|6.  Navigate to workspace2 in Explorer and go to Plugin and tick 3 files| In plugin user can see files related to the workspace2, files were selected|
|7. Navigate back to the workspace1, go to plugin and observe file |Ticked files remain selected|
|8. Close VSCode and open again, check selected files| Selection is not preserved from the previous session|


[Pl-3] PUBLISH TO APIHUB section
--------------------------------

| Step    | ER |
| ----------- | ----------- |
|1. Open VSCode. Navigate to APIHUB plugin (left sidebar) |3 expandable/collapsible sections with their fields are there: APIHUB ENVIRONMENT, DOCUMENTS TO PUBLISH, PUBLISH TO APIHUB|
|2. Expand/collapse PUBLISH TO APIHUB section| By default section is expanded, section displays 4 mandatory fields 1. * (Package Id, Version, Status, Previous Release version) and multi-value field Labels |
|3. Set Package Id, try both correct and wrong option | System validates that selected package exists|
|4. Set Version and Status, try release, draft, archived  |System validates the version matches regular expression of current package. Dropdown list for field Status is available.|
|5. Set all values and click Publish button  |1. Version, status, labels and previous release version fields shall be disabled until package id is not specified with the correct value.  <br><br>2. While the publish process is in progress, the extension shows the Status Bar item with the loading icon (with spin animation).  <br><br>3. If a version is successfully published, the extension shall show information notification with the following text: "Package version was successfully published in APIHUB Portal”. Notification shall have a "Check it out" button that shall be a link to the published package version. <br><br> 4. User navigates using link from notification to APIHUB Published version, it corresponds to input values|

[Pl-4] Configuration file
-----------------------------------

Precondition: user have all types of files yaml, yml, json, gql, graphql which have “openapi:” field 

| Step    | ER |
| ----------- | ----------- |
|1. Open VSCode. Navigate to APIHUB plugin (left sidebar) |3 expandable/collapsible sections with their fields are there: APIHUB ENVIRONMENT, DOCUMENTS TO PUBLISH, PUBLISH TO APIHUB|
|2. Navigate to the workspace1 with several files without config file|By default all the files in workspace ( yaml, yml, json, gql, graphql which have openapi) are preselected |
|3. Select 2-3 files and Publish them to Portal |1. Version including selected files was published; <br><br> 2.Config file was created as follows ".apihub-config.yaml” in the root of the project|
|4. Navigate to the config file| Config file has following info: <br><br> version - string; initial version will be 1.0  <br><br> packageId - string;  <br><br> files - array of string; i.e. list of files (paths) that will be published to Portal|
|5. Modify content of config file (add file or remove), put all mandatory inputs, Publish  |Published version includes files left in config file|
|6. Navigate to workspace2 with existing config file |All files listed in the config file are preselected|
|7.  Navigate between workspaces 1-2 explorer-plugin and observe file selection, try to change (add more files)| Files remain preselected during session; user can add more files|


[Pl-5] Publication via plugin
-----------------------------

| Step    | ER |
| ----------- | ----------- |
|1. Open VSCode. Navigate to APIHUB plugin (left sidebar)|3 expandable/collapsible sections with their fields are there: APIHUB ENVIRONMENT, DOCUMENTS TO PUBLISH, PUBLISH TO APIHUB|
|2. Publish Draft version: select several files from DOCUMENTS TO PUBLISH, set valid package id, Version, Status=Draft, Labels, try to set  Previous release version |Previous release version can be set for Release status. Version was published and corresponds to the input values|
|3. Publish Release version: select several files from DOCUMENTS TO PUBLISH, set valid package id, Version, Status=Release, NO Labels, try to set  Previous release version | Previous release version field with dropdown list and with the ability to search version using text filter|
|4. Publish Archived version: select several files from DOCUMENTS TO PUBLISH, set valid package id, Version, Status=Archived, Labels, try to set  Previous release version |1. Previous release version can be set for Release status. <br><br> 2. Version was published and corresponds to the input values.<br><br> 3. If version publication failed, the extension shall show error notification with the error message.|