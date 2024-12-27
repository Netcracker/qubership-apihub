This is a draft version of the backend development guide, to be updated.

# API
## Design
Backend API development follows API-first approach.
It means that we need to design and approve API before the implementation.
REST API is an openapi v3.0 document(see /doc/api folder).

## Changes
We have an agreement that we should not introduce any breaking changes to public API.
There's one small exception: if we know that the the only user is frontend and we can submit changes simultaneously with FE team.

In case of breaking changes we need to create new version of endpoint 

e.x. "/api/v2/packages/{packageId}/versions/{version}/references" -> "/api/v3/packages/{packageId}/versions/{version}/references"

Then, old endpoint should be marked as deprecated in specification and code.
See "Code Deprecation policy" chapter for details

Non-breaking(additive) changes could be made without any synchronization with frontend.

## API review
Api changes should be made is a separate branch.

API should be published to Apihub for review and linked to the BA, BE and FE ticket's description.

Since we treat API as a code we should apply the same review procedure. I.e. create merge request(which contains ticket name) and ask(BA, BE and FE teams) for review. MR with api changes should contain gitlab label 'API'.

Need to make sure that the API was reviewed(confirm with BE, FE teams) and all comments resolved, then add label api_approved to the ticket.

BA ticket branch should be merged to BE ticket branch before merging to develop.

# Code
## Projects structure
Most the feature code is separated into structural folders - controllers, services, repositories, views, entities.
But some outstanding/common functionality like DB migration is placed in functional folders.

TODO: need an example how the code is distributed for some business entity.

## Parameters in function:
Required parameters should be passed as as separate params, optional params could be passed via struct.

e.x. `getOperation(packageId string, version string, operationId string, searchReq view.SearchRequest)`

`packageId` - required  
`version` - required  
`operationId` - required  
`searchReq` is a struct with optional params like paging, etc  

## Constants naming convention
TODO

## Deprecation policy
deprecated methods/functions should be appended with '\_deprecated' postfix.
Use case: 
New version of endpoint is required to avoid API breaking changes(e.x. payload fields was updated).
Need to rename existing controller/service/view to \*\_deprecated and add new one with proper name.

## Logging
The code should contains logs for troubleshooting.  
INFO System log shouldn't be flooded with repeated/useless data, but should contain major operations and event.  
So the INFO log should reflect what is going on, but without much details.  
We don't need INFO log for each read(GET) request, but all write(POST, PUT) operations should be logged.

### Errors
All errors should be logged to ERROR log.

### Async operations
Async operation start should be logged with info log containing request data and generated id.
Example:
* log.Infof("Starting Quality Gate validation v3 with params %+v, id = %s", req, id)

All async operation logs should include operation id as a prefix.
Example: 
* log.Errorf("Quality Gate %s: Failed to search package %s versions by textFilter: %s", report.Id, packageId, err.Error())

It's recommended to log all major steps in INFO and some minor with DEBUG.

Async operation end should be logged with INFO log.
Example:
* log.Infof("Operations migration process %s complete", id)

# Pull requests
## Title
PR title should contain issue id, otherwise it couldn't be merged by rules.  
The title should be in the following format: `ISSUE-ID Changes short summary`


## Merge options
It's recommended to delete dev branch after merge and squash commits to get clean develop/main branches history.

So both checkboxes should be checked:
* Delete source branch when merge request is accepted. 
* **Squash commits when merge request is accepted.**

## Code review
Everyone is welcome to the code reviews.

### Reviewer's checklist:
* Changes cover all requirements of the story.
* Changes are syntaxically and logically correct.
* Changes in code mathes changes in API if applicable.
* No commented code with some rare and justified exceptions.
* Error handling should be implemented.
* New code should contain necessary logs(see Logging chapter).

# Demo
At this moment we run demo every week. Every developer should prepare ready and in-progress(if's suitable and makes sense) stories for demonstration.
The goal of demonstration is to collect the whole team's feedback.
## Introduction
Demo listeners need to understand the context of presented story.
What is the business goal(epic) and how it's transformed into implemented changes.
Or answer the question: "why the change is required, which purpose it serves?".
It's going to be great if you'll describe the background of the problem. You may ask dev lead or BA team for details if required.
## Demonstration
Live process demonstration is preferred. But if it's not possible, you can show the final result or a set of screenshots/presentation.
## Questions
Try to answer all questions.

# Business logic
## Business terms glossary

specification - file which contains openapi/graphql/etc content

build - processing specification which includes the following stages: dereference, comparison with previous version (backward compatibility analysis), generation of search index. Performed via builder library on frontend or node service.

project - a part of editor service implementation, local representation of a remote git repository(integration).

draft - a part of editor service implementation, local copy of a remote git repository that holds user changes until they're committed and pushed to git or discarded. Created automatically when user opens editor and connects the some git branch.

workspace - is a first-level group. Provide a logical separation for different projects, teams, or departments within the organization. Grouping of related APIs and provide a hierarchical structure for better organization and management.  

group -  is an entity that allows you to logically group packages in a hierarchical view. Within a workspace, groups help further categorize APIs based on functional domains or specific areas of focus. Groups provide a flexible way to organize APIs and make them easily discoverable within the API Management portal.

package - is an entity that contains published API documents related to specific Service/Application. Packages are versioned, and package version can be in one of the following statuses: Draft, Release and Archived.

dashboard - is a virtual package which can contain only links to another packages/dashboards. Dashboard cannot contain its own documents. Dashboards serve as a higher level of abstraction and can group APIs from complex applications that consist of multiple services.

reference - a link between published versions. Logically connects one version to another.

baseline package - a package that contains release versions and compared to snapshot. Used in Agent.

BWC - BackWard Compatibility / BackWard Compatible, an API that is supposed to be backward compatible, i.e. contain no breaking changes between releases.

TODO: append
