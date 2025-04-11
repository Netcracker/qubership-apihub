# APIHUB Development Process in GitHub

This document outlines the development process for the **APIHUB** product in GitHub, covering:

1. **Work items (issues)** and their lifecycle
2. **Iterative development process**
3. **Release process**

**Table of content**

- [Generic notes](#generic-notes)
  * [Project roles](#project-roles)
  * [Branching model](#branching-model)
- [Work Items (aka tickets, aka issues)](#work-items--aka-tickets--aka-issues-)
  * [Work items types](#work-items-types)
    + [Epic](#epic)
    + [User Story](#user-story)
    + [Bug](#bug)
    + [Task](#task)
    + [Design task, Documentation task](#design-task--documentation-task)
  * [Work items workflow](#work-items-workflow)
    + [User Story workflow](#user-story-workflow)
    + [Bug workflow](#bug-workflow)
    + [PR review process and rules](#pr-review-process-and-rules)
    + [Special cases](#special-cases)
      - [Fast track](#fast-track)
      - [Delivery to QA from develop/feature branch](#delivery-to-qa-from-develop-feature-branch)
      - [Release delay because of Critical+ issues](#release-delay-because-of-critical--issues)
      - [My PR brokes AT](#my-pr-brokes-at)
      - [Pull Request without issue](#pull-request-without-issue)
- [Development process](#development-process)
  * [Quarter Release](#quarter-release)
  * [Sprint](#sprint)
  * [Release](#release)

# Generic notes

The APIHUB application's source code is distributed across **20+ repositories**:
[View the full list](https://github.com/Netcracker?q=topic%3Aapihub&type=all&language=&sort=).

Each repository represents either:

- A standalone sub-component (microservice, library)
- A utility (autotests, workflow scripts, etc.)

The **umbrella repository** is:
[https://github.com/Netcracker/qubership-apihub](https://github.com/Netcracker/qubership-apihub).

This repository serves as the **entry point** for all GitHub issues and contains:

- Application-level deployment descriptors
- Application-level documentation

**Development tracking** is managed via the **GitHub Project**:
[qubership-apihub](https://github.com/orgs/Netcracker/projects/9/views/2).

## Project roles

* Product owner (PO)
* Technical manager (TM)
* Dev Lead
* Developer
* QA
* TA - Test automation

## Branching model

We follow the **Gitflow** approach.

Reference: [A Successful Git Branching Model](https://nvie.com/posts/a-successful-git-branching-model/).

Long story short
- `develop` is the the top-forward integration branch. Default branch.
- `bugfix/X` and `feature/X` branched from `develop` and merged after dev testing, review in the branch.
- `develop` must be stable evetually
- Stable means all AT are green
- In the end of a sprint `develop` is stable, `release` branch created from `develop`
- artifacts built from `release` branch are release candidates (docker tag: `next`). Can be provided for any customer who ready to onboard release candidates
- If any critical issues found during acceptacnce - bugfix taking place in `release` branch
- After acceptance, `release` branch merged iinto `develop` and `main`
- A new `tag` is set on `main` branch. Build from this tag is our release.

# Work Items (aka tickets, aka issues)

We have the following work items types:

1. Epic
2. User Story
3. Bug
4. Task

All work items are GitHub issues, categorized by `type` and `labels`.

- **Creation**: Must be created in the umbrella repository (may be transferred later).
- **Tracking**: Must be added to the `qubership-apihub` project.

Please find description and creation of each work item type below

## Work items types

### Epic

Epic is a huge umbrella work item describing some e2e functionality area.

Epic has child work items - User Stories

Epic planning horizon is a Quarter Release. Quarter Release - 3 months long development period

Epic definition of done (DoD): completion of all child User Stories

Epics statuses reviewed by Technical Manager on regular basis (once per month)

**Mandatory fields:**

- **Assignees: alagishev**
- **Labels: Epic**
- **Type: Feature**
- **Projects: qubership-apihub**
  - **Priority: choose your option**
  - **Status: empty**
  - **Sprint: empty**
- **Milestone: choose corresponding Quarter Release**
- **Description: provide as much detailed description as you can**

**Examples**:

- [Epic #3](https://github.com/Netcracker/qubership-apihub/issues/3)
- [Epic #116](https://github.com/Netcracker/qubership-apihub/issues/116)

### User Story

User Story is an e2e functionality which can be delivered and tested

User Story is assigned to concrete developer and shown on team demo after completion

User Story definition of done: implemented, dev tested, demonstrated, merged to develop, QA tested, all bugs fixed, included in Release

**Mandatory fields:**

- **Assignees: empty**
- **Labels: User Story**
- **Type: Feature**
- **Projects: qubership-apihub**
  - **Priority: Choose your option**
  - **Status: empty**
  - **Sprint: empty** (exception: **Dev Lead** can create User Story directly to current Sprint)
  - **Team: choose BE or FE**
- **Relationships: choose corresponding Epic issue.**

**Example**: [User Story #7](https://github.com/Netcracker/qubership-apihub/issues/7).

### Bug

Bug is a defect in our product which needs to be fixed

Bug can be reported by anyone but typically reported by QA team

Bug definition of done: fixed, dev tested, merged to develop, QA tested, included in Release

**Mandatory fields:**

- **Assignees: empty**
- **Labels: empty**
- **Type: Bug**
- **Projects: qubership-apihub**
  - **Priority: Choose your option**
  - **Status: empty**
  - **Sprint: empty** (exception: **Dev Lead** can create a Bug directly to current Sprint; QA can create Bug directly to current Sprint if the Bug found during testing of a feature from current Sprint)
  - **Team: choose BE or FE**

**Example**: [Bug #30](https://github.com/Netcracker/qubership-apihub-backend/issues/30).

### Task

Task is a some job which is not a new feature and not a bug. Technical tasks, one-time activities, configuration, etc

Task definition of done: the task completed and accepted by **Dev Lead**/**TM**

**Mandatory fields:**

- **Assignees: empty/concrete person**
- **Labels: choose your option**
- **Type: Task**
- **Projects: qubership-apihub**
  - **Priority: Choose your option**
  - **Status: empty**
  - **Sprint: empty** (exception: **Dev Lead** can create Task directly to current Sprint; Developer can create Task for himself directly to current Sprint)
  - **Team: choose BE or FE**

**Example**: [Task #33](https://github.com/Netcracker/qubership-apihub/issues/33).

### Design task, Documentation task

Used for tracking design changes (example: API specification changing), the rules is the same as for User Story (so, must be under Epic).

The difference is:

- **Labels: Design/documentation**
- **Type: Feature/Task**

**Example**: [Design Task #28](https://github.com/Netcracker/qubership-apihub/issues/28).

## Work items workflow

### User Story workflow

1. Issue created. **Hint:** It has **Status=`Empty`**, so on the project board it is placed it the very left column - it makes it subject for review by Leads on regular Leads sync-up
2. The issue is reviewed by **Dev Lead**, the Dev Lead **set Status=`Backlog`/`Ready for Dev`**, **set Sprint**. The issue *could* be Transferred to concrete GitHub repository
   1. Issues without Sprint but with not empty status - are in a Backlog
3. When time is come, **Dev Lead assign** the issue to **Developer**
4. **Developer** start working on the story and **set Status=`In Progress`**
5. When **Developer** finish implementation and dev testing - he **creates Pull Request** (PR) to develop and **set Status=`In Review`**
   1. **PR must have a link to the issue in Development field**
   2. **PR must have empty Projects field**
   3. PR must have reviewers (team members)
   4. PR must be assigned to **Dev Lead**
   5. PR must have "green" CI workflow (no failed AT). If your PR breaks AT - see "Special cases" section.
6. **Dev Lead** reviews PR. When review is done and all comments addressed - PR is accepted. **Dev Lead** updates corresponding Issue and **set Status=`In Test`** and add **QA** to the Issue asignees
7. **QA** validates the User Story and after succesfull testing **set Status=Done**
   1. If any bugs are found during testing, **QA** creates new issues and set the User Story as a parent for them.
      1. If all found bugs has **Priority <= Major**, the User Story is closed by **QA** by **set Status=`Done`**
      2. If **Critical+** issues found, **QA** **set Status=In BugFix** and notify **Dev Lead**
         1. **QA** does retest (go to step 7) of the User Story then all Critical+ issues are resolved

### Bug workflow

Steps 1-6 are the same as for User Story

Step 7: **QA** validates the Bug fixed and after succesfull testing **set Status=Done**

If the fix is not accepted - **QA** **set Status=In Progress** and notify **Developer**

### PR review process and rules

*todo*

### Special cases

#### Fast track

Some issues can be marked with label `fast track` because of various reasons (critical issue on production, escalation from customer, urgent request from sales, etc). Such issues must be processed with the highest priority and included to the nearest release if possible.

#### Delivery to QA from develop/feature branch

In most cases User Stories and Bugfixes delivered to QA from develop branch. I.e. after accepting PR to develop.

It is a common process and QA knows how to take develop build.

But in case of complex risky features which involves several sub-components - it makes sense to deliver it for testing from feature branches.

Criteria for definition of such cases - *common sense*.

#### Release delay because of Critical+ issues

If it is time for release creation (Sprint timeline is over), but one or another User Story (already merged to develop) from the Sprint scope still has open Critical+ issue(s) - the release can be delayed for 1-2-3 days.

#### My PR brokes AT

If you PR brings changes which breaks auto tests (AT) either FE or BE, you have the following options:

1. Fix AT by yourself (preferred option)
2. Ask AT engineers to adopt tests to your changes

AT adaptation must be implemented in a separate branch which will be merged to develop simultaniously with your PR.

#### Pull Request without issue

If PR is created without any corresponding issue (small technical improvements, cosmetic changes, etc) - it must be added into project.

# Development process

APIHUB product follows scrum development process.

High level flow is the following:

1. Tactical planning horizon called **Quarter Release**. It is 3 months (12 weeks) period. Scope for it is subject for planning with Product Owner. This scope is defined by business needs and strategic roadmap. Work items: Epics
2. Operational development iteration called **Sprint**. Sprint is 2 weeks long. Work items: User Stories and Bugs
3. Development team creates deliverable (**Release**) in the end of each Sprint

## Quarter Release

Before start of new Quarter Release (each 3 months) **Product Owner** prepares prioritized list of Epics.

These Epics are reviewed with **TM** and **Dev Leads** in order to define technical and resource ability for implementation.

Finalized list of Epics is a scope for development.

**TM** and **Dev Leads** responsibility to make each Epic decomposition to User Stories

## Sprint

Sprint is 2 weeks long development iteration

Sprints are pre-created in project by **TM**

Sprint start and end happen automatically accroding to start/finish dates

* Sprint scope (included issues) need to be defined and agreed before Sprint start. It is **TM** and **Dev Leads** responsibility
* Keeping Sprint board be always up to date - **TM** responsibility
* Implementation of Sprint scope in time - **TM** and **Dev Leads** responsibility
* If Sprint is over but there are still not completed issues in it - they are manually moved to the next Sprint/no Sprint (Backlog) by **TM**
* Release is created right after Sprint completion

## Release

Release is a deliverable of APIHUB application.

Release has unique name. We are following semver approach.

Release contains:

1. Artifact of each sub component except libraries (libraries can be released at any time).
   1. For now we are delivering several docker images
   2. Each sub component can have it's own version
2. Deployment descriptors (docker-compose, helm chart)
3. Technical documentation (installation notes)
4. Release notes (a list of all work items included into release)
5. (optional) Known issues list

Release represented as a `tag` in umbrella repository.

**TM** is responsible for release quality.

**TM** is responsible for release creation.

Notes:

1. BE and FE team responsible for releasing owned sub components
2. Physically release is a `tag` in each repository which produces docker image

**Release Example**: [https://github.com/Netcracker/qubership-apihub/releases/tag/1.2.0](https://github.com/Netcracker/qubership-apihub/releases/tag/1.2.0)
