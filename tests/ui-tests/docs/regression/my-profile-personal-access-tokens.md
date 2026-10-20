# 15.1 My Profile (Personal Access Tokens)

## [PAT-1] PAT page overview

| Step    | ER |
| ----------- | ----------- |
|1. Navigate to package in Portal |Summary of package is shown|
|2. Click on button next to the User name|Dropdown list: My Profile, Logout|
|3. Click My Profile option|My Profile page is shown. Buttons: Exit and Generate are available. Fields: Name(empty by default) and Expiration (180 by default).Table with configured PARs (if any) has columns: Name, Expiration Date, Status|
|4. Click Exit button|User is navigated back to the page from which user initially navigated to the "My Profile" page: Summary of package is shown (1st step)|

## [PAT-2] Generate PAT

| Step    | ER |
| ----------- | ----------- |
|1. Click on button next to the User name|Dropdown list: My Profile, Logout|
|2. Click My Profile option|My Profile page is shown. Buttons: Exit and Generate are available. Fields: Name(empty by default) and Expiration (180 by default).Table with configured PARs (if any) has columns: Name, Expiration Date, Status|
|3. Fill Expiration=7 (dropdown list with options is shown for selection), Name leave empty and click Generate button|Error notification: The Field must be filled |
|4. Fill Name=Mary, Expiration=30 (dropdown list with options is shown for selection) fields and click Generate button|Token was generated and added to the table, Copy button is next to the token|
|5. Fill Name=Mary, Expiration=60 and click Generate button|Error notification about non-unique name|
|6. Click Exit button and again navigate to My Profile|Generated previously token info is in the table|

## [PAT-3] Copy PAT

| Step    | ER |
| ----------- | ----------- |
|1. Click on button next to the User name|Dropdown list: My Profile, Logout|
|2. Click My Profile option|My Profile page is shown. Buttons: Exit and Generate are available. Fields: Name(empty by default) and Expiration (180 by default).Table with configured PARs (if any) has columns: Name, Expiration Date, Status|
|3. Fill Name=Tom, Expiration=No expiration date (dropdown list with options is shown for selection) and click Generate button|Token was generated and added to the table, Copy button is next to the token|
|4. Click Copy button and try to use it in VSCode plugin APIHUB, refresh the page|Token was copied, successfully used. After page reload token is not shown any more|

## [PAT-4] Delete PAT

| Step    | ER |
| ----------- | ----------- |
|1. Click on button next to the User name|Dropdown list: My Profile, Logout|
|2. Click My Profile option|My Profile page is shown. Buttons: Exit and Generate are available. Fields: Name(empty by default) and Expiration (180 by default).Table with configured PARs (if any) has columns: Name, Expiration Date, Status|
|3. Fill Name=Mat, Expiration=90 (dropdown list with options is shown for selection) and click Generate button|Token was generated and added to the table, Copy button is next to the token|
|4. Navigate to the newly added raw in the table (Delete button is shown in the end of raw), click Delete button|Token was deleted|
