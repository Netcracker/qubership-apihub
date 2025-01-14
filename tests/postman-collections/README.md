# apihub-postman-collections

To start using you need to:
- Create test internal user on server and replace credentials in  in "Env1.postman_environment.json";
- Create api-key with sysadmin grants and put api-key value to "at-api-key" env variable.

NOTE: internal user and admin access key can be automatically created during APIHUB deployment, see `APIHUB_ADMIN_EMAIL` `APIHUB_ADMIN_PASSWORD` `APIHUB_ACCESS_TOKEN` deploy parameters in [Installation Notes](https://github.com/Netcracker/qubership-apihub/blob/main/docs/installation-guide.md).

## Root folder 
### "Syntetic_test_data" collection

This is collection for fast creation test data samples.

During run "Create Test Data" folder test will create:
- 1 workspace "001 Test Workspace".
- 1 package with 2 versions. Versions have all types of changes.
- 1 dashboard with 2 package versions. 
To have more test data you can run "Create test data" folder as many times as needed.

During run "Cleanup Test Data" folder test will remove all entities with workspace.

## e2e folder

Collections for regression testing.