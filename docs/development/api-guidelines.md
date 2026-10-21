# API guidelines

Rules for designing, changing, deprecating, and reviewing the REST API of the backend. They apply to the OpenAPI
files in [`backend/portal-backend/docs/api/`](../../backend/portal-backend/docs/api/). The Go conventions for the
code itself stay in [the backend development guide](../../backend/portal-backend/docs/development_guide.md).

## Design

Backend API development is API-first: design and approve the API before you implement it. The REST API is an
OpenAPI 3.0 document in the `backend/portal-backend/docs/api/` folder.

## Changes

Do not introduce breaking changes to the public API. There is one small exception: when the only consumer is the
frontend and both sides can ship the change at the same time.

When a change is breaking, add a new version of the endpoint. For example,
`/api/v2/packages/{packageId}/versions/{version}/references` becomes
`/api/v3/packages/{packageId}/versions/{version}/references`. Then mark the old endpoint as deprecated in the
specification and in the code (see [Deprecation](#deprecation)).

Additive, non-breaking changes need no synchronization with the frontend.

## Deprecation

Append the `_deprecated` postfix to deprecated methods and functions.

A new endpoint version is required when a change would break the API, for example when payload fields are updated.
Rename the existing controller, service, and view to `*_deprecated`, and add the new one under the proper name.

## Review

Treat the API as code and review it the same way.

1. Make API changes in a separate branch.
2. Publish the API to APIHUB for review and link it in the descriptions of the business analysis, backend, and
   frontend issues.
3. Open a pull request whose title follows
   [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) and links the issue.
   Add the `API` label and ask the business analysis, backend, and frontend teams for review.
4. Confirm with the backend and frontend teams that the API was reviewed and every comment is resolved. Then add the
   `api_approved` label to the issue.
5. Merge the API branch into the backend branch of the issue before the backend branch goes to `develop`.

For branches, pull requests, and commit messages in general, see [the contributor workflow](./workflow.md).
