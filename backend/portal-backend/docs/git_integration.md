# (Git) Integration
"Integration" is an ability to interact with git server.
Every integration have a constant in view.GitIntegrationType and it's considered as a part of integration key.
Some time ago we expected that multiple git servers will be supported, but in the end we supported only gitlab.

NOTE: Apihub editor can not work without git integration enabled. So user is required to establish the integration, see the details below.

# Gitlab authorization

## Connection between Gitlab and Apihub
As part of deployment need to establish connection between Gitlab instance and Apihub instance.

Apihub itself have no access to Gitlab.
I.e. Apihub works only with user's credential.

NOTE: in current Gitlab implementation token TTL is short, i.e. hours. So we have to refresh the token every time it's close to expiration or expired.
Refresh token is used in this case.
So ideally the token shoud be refreshed automatically every time and invisible to end user.

## How git integration is enabled
Git integration status is stored in **Apihub's** JWT token. (See Auth.go)
In `gitIntegration` field.
The value is used by Frontend to identify if user have integration enabled.

If the integration is not enabled yet, Frontend displays wellcome message with green button asking user to establish the integration(connect to gitlab).
When user clicks the button, FE redirects him to the Gitlab page (through /login/gitlab on Apihub BE) which allows to grant rights to Apihub application(You can check existing applications in your Gitlab profile: https://git.domain.com/-/profile/applications).
If user grants the rights, Apihub application is added to his profile and Gitlab redirects back to Apihub(to /login/gitlab/callback) with new generated token info.
Then user is redirected back to the original page(typically https://{APIHUB_URL}/editor/) with git integration enabled.
In scope of this process, the row with credentials is inserted to `user_integration` table.

## Token revocation
User can revoke application token manually. So Apihub should handle it and mark integration as `revoked`.
In this case user's row in `user_integration` is updated and `is_revoked` column is set to true. Also need to disable existing cached Gitlab client(see below).

# Gitlab go client
Apihub is using `go-gitlab` library to interact with gitlab.
The library requires initialization and user token is used in the init. I.e. go-gitlab instance is bound to specific user and we can't share it between user.
To reduce initializations count we've implemented cache in a provider style: `service/GitClientProvider` which is able to get client from cache or create it.
So the cache is initialized on demand. Diffenent Apihub instances may have different sets of cached clients and it's ok due to on-demand initialization.

## Cleaning client cache (distributed)
If token revoked or expired, the client instance(with built-in token) is no longer functional. So need to remove it from the cache of **ALL** Apihub instances.
For this purpose we use `DTopic`(distributed topic) from `olric`. `GitClientProvider` is listening to the "git-client-revoked-users" topic and cleaning up the cache when receives corresponding event.

## TokenExpirationHandler
Tries to get new access token with refresh token.

## TokenRevocationHandler
Marks existing key as revoked and disables integration for user(need to be re-established).

# Db schema
* user_integration - credentials to git integrations(at this moment gitlab only)

# Problems and troubleshooting
* expired token
Hnadled by TokenExpirationHandler

* revoken token
Handled by TokenRevocationHandler

* gitlab integration broken

* 401 from Gitlab
In this case Apihub marks the token as revoked


# Local development
Since local isntance is not authorized on Gitlab (and it's not possible to do), default connect algorithm will not work(Gitlab will reject the request from local PC).
But you can deal with the process and establish connection manually:
* Generate personal access token on gitlab https://git.domain.com/-/profile/personal_access_tokens wiht `api` scope.
* Insert row to `user_integration` with the token value in `key` column and null `expires_at`.
  Or paste the value to `user_integration` in `key` column and remove `expires_at` if the record exists.


