# 15.3 UI for managing list of OAS extensions preserved on Export

## [Ext-1] Extension adding for workspace

| Step    | ER |
| ----------- | ----------- |
|1. Log in to APIHUB as Admin and navigate to the workspace1 and click Manage Workspace button |Workspace Settings bar includes new tab Export Settings|
|2. Click tab Export Settings  |The system shows "List of OAS Extensions Preserved on Export" parameter with the list of existing unique OAS extensions (including inherited/mixed extensions).|
|3. Hover over "OAS Extensions Preserved on Export" parameter and click Edit button |The system opens List of OAS Extensions Preserved on Export popup.|
|4. Add new extensions x-ext1_W,  x-ext2_w and save |List of OAS Extensions Preserved on Export parameter filled with x-ext1_W, x-ext2_w values|

## [Ext-2] Extension adding for dashboard

| Step    | ER |
| ----------- | ----------- |
|1.  Log in to APIHUB as Admin and navigate to the workspace1 and create there Dashboard1  |Dashboard1 was created|
|2. Navigate to the dashboard1 and click Manage Dashboard button  |Export Settings tab is in the Package Settings|
|3. Click tab Export Settings  |The system shows "List of OAS Extensions Preserved on Export" parameter with the list of existing unique OAS extensions (including inherited/mixed extensions): x-ext1_W,  x-ext2_w (inherited from workspace1)|
|4. Hover over "OAS Extensions Preserved on Export" parameter and click Edit button |The system opens List of OAS Extensions Preserved on Export popup|
|5. Hover on existed extensions |Inherited extensions are greyed out, disabled for modification\deletion, hint shows from where this item were inherited |
|6. Add new extension x-ext1_W and save | System prohibits saving x-ext1_W as its value is not unique (already exists)|
|7. Add new extension x-ext1_D, x-ext1_D1 and save | "List of OAS Extensions Preserved on Export" parameter filled with  x-ext1_W,  x-ext2_w, x-ext1_D, x-ext1_D1 |
|8. Delete extension x-ext1_D1|Extension x-ext1_D1 was deleted|

## [Ext-3] Extension adding for package

| Step    | ER |
| ----------- | ----------- |
|1.  Log in to APIHUB as Admin and navigate to the workspace1->dashboard1 and create there Package1  |Package1 was created|
|2. Navigate to the Package1 and click Manage Package button  |Export Settings tab is in the Package Settings|
|3. Click tab Export Settings  |The system shows "List of OAS Extensions Preserved on Export" parameter with the list of existing unique OAS extensions (including inherited/mixed extensions): x-ext1_W,  x-ext2_w, x-ext1_D (inherited)|
|4. Hover over "OAS Extensions Preserved on Export" parameter and click Edit button |The system opens List of OAS Extensions Preserved on Export popup|
|5. Hover on existed extensions |Inherited extensions are greyed out, disabled for modification\deletion, hint shows from where this item were inherited |
|6. Add new extension x-ext1_D and save | System prohibits saving x-ext1_D as its value is not unique (already exists). The system shows an error message: "\<extension>" already exists|
|7. Add new extension x-ext1_P, x-ext1_P1 and save  | "List of OAS Extensions Preserved on Export" parameter filled with  x-ext1_W,  x-ext2_w, x-ext1_P, x-ext1_P1  |
|8. Delete extension x-ext1_P1|Extension x-ext1_P1 was deleted|

## [Ext-4] Extension adding for group

| Step    | ER |
| ----------- | ----------- |
|1.  Log in to APIHUB as Admin and navigate to the workspace1->dashboard1 and create there Group1  |Group1 was created|
|2. Navigate to the Group1 and click Manage Group button  |Export Settings tab is in the Package Settings|
|3. Click tab Export Settings  |The system shows "List of OAS Extensions Preserved on Export" parameter with the list of existing unique OAS extensions (including inherited/mixed extensions): x-ext1_W,  x-ext2_w (inherited)|
|4. Hover over "OAS Extensions Preserved on Export" parameter and click Edit button |The system opens List of OAS Extensions Preserved on Export popup|
|5. Hover on existed extensions |Inherited extensions are greyed out, disabled for modification\deletion, hint shows from where this item were inherited |
|6. Add new extension x-ext1_D and save | System prohibits saving x-ext1_D as its value is not unique (already exists). The system shows an error message: "\<extension>" already exists|
|7. Add new extension x-ext1_G, x-ext1_G1 and save   | "List of OAS Extensions Preserved on Export" parameter filled with  x-ext1_W,  x-ext2_w, x-ext1_G, x-ext1_G1|
|8. Delete extension x-ext1_G1|Extension x-ext1_G1 was deleted|
|9. Navigate to the Group1 and create Package2 |Package2  was created|
|10. Click Manage package button and go to tab Export Settings | The system shows "List of OAS Extensions Preserved on Export" parameter with the list of existing extensions: x-ext1_W,  x-ext2_w, x-ext1_G|

## [Ext-5] Extension managing

| Step    | ER |
| ----------- | ----------- |
|1.  Log in to APIHUB as Admin and navigate to the workspace1 and click Manage Workspace button |Workspace Settings bar includes new tab Export Settings|
|2. Click tab Export Settings  |The system shows "List of OAS Extensions Preserved on Export" parameter with the list of existing unique OAS extensions: x-ext1_W,  x-ext2_w|
|3. Hover over "OAS Extensions Preserved on Export" parameter and click Edit button |The system opens List of OAS Extensions Preserved on Export popup.|
|4. Delete x-ext2_w and add new extension x-ext3_W and save |The system shows "List of OAS Extensions Preserved on Export" parameter with the list of extensions: x-ext1_W,  x-ext3_W|
|5. Navigate to each child under workspace (Dashboard1, Group1, Package1, Package2) and check inherited extensions |Child packages have x-ext3_W instead of x-ext2_w  extension |

## [Ext-6] Extension managing (security check)

| Step    | ER |
| ----------- | ----------- |
|1. Log in to APIHUB as Editor |The system shows main page in Portal|
|2. Navigate to the workspace1, click Manage Workspace button ->  tab Export Settings |The system shows "List of OAS Extensions Preserved on Export" parameter with the list of existing unique OAS extensions: x-ext1_W,  x-ext3_W|
|3. Hover over "OAS Extensions Preserved on Export" parameter and click Edit button |Edit button is disabled, user cannot edit Export Settings. The system shows the following tooltip on hover: "You do not have permission to edit the package" |
|4. Log in to APIHUB as Viewer |The system shows main page in Portal|
|5. Navigate to the workspace1, click Manage Workspace button ->  tab Export Settings  |The system shows "List of OAS Extensions Preserved on Export" parameter with the list of existing unique OAS extensions: x-ext1_W,  x-ext3_W |
|6. Hover over "OAS Extensions Preserved on Export" parameter and click Edit button |Edit button is disabled, user cannot edit Export Settings. The system shows the following tooltip on hover: "You do not have permission to edit the package"|

## [Ext-7] Popup buttons

| Step    | ER |
| ----------- | ----------- |
|1. Log in to APIHUB as Owner |The system shows main page in Portal|
|2. Navigate to the workspace1, click Manage Workspace button ->  tab Export Settings |The system shows "List of OAS Extensions Preserved on Export" parameter with the list of existing unique OAS extensions: x-ext1_W,  x-ext3_W|
|3. Hover over "OAS Extensions Preserved on Export" parameter and click Edit button |The system opens List of OAS Extensions Preserved on Export popup|
|4. Add new extensions x-ext3, x-ext4 and save |list of existing unique OAS extensions: x-ext1_W,  x-ext3_W, x-ext3, x-ext4|
|5. Click Edit button, add new extensions x-ext5, x-ext6 and click Cancel button |New extensions x-ext5, x-ext6 was not saved in the list|
|6. Click Edit button, delete extensions x-ext3, x-ext4 and click Cancel button |Extensions x-ext3, x-ext4 was not deleted, remained in the list of existing OAS extensions|
|7. Click Edit button, delete extensions x-ext3, x-ext4 and click Save button |Extensions x-ext3, x-ext4 was deleted from the list of existing OAS extensions|
